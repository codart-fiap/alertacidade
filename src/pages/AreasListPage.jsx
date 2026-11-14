import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSensors } from '../context/SensorContext.jsx'
import SchematicMap from '../components/SchematicMap.jsx'
import { getImageDimensions } from '../map/image.js'
import { monitoringRadiusPercent, statusFromArea } from '../utils/risk.js'

const DEFAULT_MAP_DIMENSIONS = { width: 1000, height: 600 }

function areaPosition(area) {
  return {
    x: area.x <= 1 ? area.x : area.x / 400,
    y: area.y <= 1 ? area.y : area.y / 240,
  }
}

function defaultSafetyInstruction(area) {
  const type = area.type?.toLowerCase() || ''
  if (type.includes('enchente')) return 'Afaste-se de rios e ruas alagadas. Não atravesse áreas inundadas e procure um local seguro ou abrigo.'
  if (type.includes('deslizamento')) return 'Afaste-se de encostas, taludes e áreas com rachaduras. Procure um local seguro e siga as orientações da Defesa Civil.'
  if (type.includes('incêndio') || type.includes('incendio')) return 'Afaste-se do fogo e da fumaça. Vá para uma área segura e acione os serviços de emergência se houver perigo imediato.'
  if (type.includes('calor')) return 'Vá para um local fresco, hidrate-se e evite esforço físico sob o sol.'
  return 'Afaste-se da área de risco, procure um local seguro e siga as orientações da Defesa Civil.'
}

export default function AreasListPage({ expanded = false }) {
  const { areas, alerts, shelters, publicPoints, mapImage } = useSensors()
  const [searchParams] = useSearchParams()
  const [focusAreaId, setFocusAreaId] = useState(searchParams.get('area'))
  const [location, setLocation] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [mapDimensions, setMapDimensions] = useState(DEFAULT_MAP_DIMENSIONS)
  const [riskNotification, setRiskNotification] = useState(null)
  const notifiedSensorsRef = useRef(new Set())
  const mapSectionRef = useRef(null)
  useEffect(() => {
    const areaId = searchParams.get('area')
    if (!expanded && areaId) {
      setFocusAreaId(areaId)
      requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [expanded, searchParams])
  useEffect(() => {
    let cancelled = false
    if (!mapImage) {
      setMapDimensions(DEFAULT_MAP_DIMENSIONS)
      return undefined
    }
    getImageDimensions(mapImage)
      .then((dimensions) => { if (!cancelled) setMapDimensions(dimensions) })
      .catch(() => { if (!cancelled) setMapDimensions(DEFAULT_MAP_DIMENSIONS) })
    return () => { cancelled = true }
  }, [mapImage])
  const allAreas = [...publicPoints, ...areas]
  const activeAlerts = alerts.filter((alert) => !alert.resolved)
  useEffect(() => {
    if (expanded || !location) return
    const minDimension = Math.min(mapDimensions.width, mapDimensions.height)
    const matches = areas.filter((area) => area.active !== false && statusFromArea(area) !== 'normal').filter((area) => {
      const position = areaPosition(area)
      const dx = (location.x - position.x) * mapDimensions.width
      const dy = (location.y - position.y) * mapDimensions.height
      const radius = minDimension * (monitoringRadiusPercent(area) / 100)
      return (dx * dx) + (dy * dy) <= radius * radius
    })
    const insideIds = new Set(matches.map((area) => String(area.id)))
    notifiedSensorsRef.current.forEach((id) => {
      if (!insideIds.has(id)) notifiedSensorsRef.current.delete(id)
    })
    const rank = { critico: 2, atencao: 1, normal: 0 }
    matches.sort((a, b) => rank[statusFromArea(b)] - rank[statusFromArea(a)])
    const sensor = matches.find((area) => !notifiedSensorsRef.current.has(String(area.id)))
    if (!sensor) return
    notifiedSensorsRef.current.add(String(sensor.id))
    const alert = activeAlerts.find((item) => String(item.areaId) === String(sensor.id))
    setRiskNotification({
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      status: statusFromArea(sensor),
      instruction: alert?.instruction || sensor.instruction || defaultSafetyInstruction(sensor),
    })
  }, [expanded, location, areas, activeAlerts, mapDimensions])
  const urgentAreas = allAreas.filter((area) => publicPoints.some((point) => point.id === area.id) || statusFromArea(area) === 'critico')
  const messages = activeAlerts.map((alert) => {
    const area = allAreas.find((item) => String(item.id) === String(alert.areaId))
    return { id: alert.id, area, text: alert.instruction || area?.instruction || `Evite a região de ${area?.name}. Procure um local seguro e siga as orientações da Defesa Civil.` }
  })
  const cards = (messages.length ? messages : urgentAreas.map((area) => ({
    id: area.id, area, text: area.instruction || 'Evite a região e acompanhe as orientações da Defesa Civil.',
  }))).sort((a, b) => {
    const severity = (item) => item.area && publicPoints.some((point) => point.id === item.area.id) ? 3 : ({ critico: 3, atencao: 2, normal: 1 }[statusFromArea(item.area || {})] || 0)
    const riskDifference = severity(b) - severity(a)
    if (riskDifference) return riskDifference
    if (location && a.area && b.area) {
      const distance = (item) => Math.hypot((item.area.x <= 1 ? item.area.x : item.area.x / 400) - location.x, (item.area.y <= 1 ? item.area.y : item.area.y / 240) - location.y)
      return distance(a) - distance(b)
    }
    return 0
  })

  return (
    <main className={`citizen-page ${expanded ? 'citizen-expanded' : ''}`}>
      {riskNotification && <aside className={`risk-location-notification ${riskNotification.status}`} role="alert" aria-live="assertive">
        <span className="risk-notification-icon" aria-hidden="true">⚠</span>
        <div className="risk-notification-content"><strong>Você está dentro de uma área com risco detectado</strong><span>{riskNotification.name} · {riskNotification.type}</span><p>{riskNotification.instruction}</p>
          <button className="risk-notification-link" onClick={() => { setFocusAreaId(riskNotification.id); setRiskNotification(null); mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Ver sensor no mapa</button>
        </div>
        <button className="risk-notification-close" aria-label="Fechar notificação" onClick={() => setRiskNotification(null)}>×</button>
      </aside>}
      {!expanded && <section className="recommendation-carousel" aria-label="Recomendações de segurança"
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchEnd={(event) => { if (touchStart === null) return; const delta = event.changedTouches[0].clientX - touchStart; if (Math.abs(delta) > 35) setCardIndex((index) => Math.max(0, Math.min(cards.length - 1, index + (delta < 0 ? 1 : -1)))); setTouchStart(null) }}>
        {cards.length ? <article className="recommendation-card" key={cards[cardIndex]?.id}>
          <span className="recommendation-icon">{cards[cardIndex]?.area?.type?.toLowerCase().includes('enchente') ? '🌊' : cards[cardIndex]?.area?.type?.toLowerCase().includes('deslizamento') ? '⛰️' : '⚠️'}</span>
          <div className="recommendation-copy"><strong>{cards[cardIndex]?.area?.name || 'Alerta próximo'} · {cards[cardIndex]?.area?.type}</strong><small>{cards[cardIndex]?.text}</small></div>
          <button className="recommendation-link" onClick={() => { setFocusAreaId(cards[cardIndex]?.area?.id); mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Ver</button>
          {cards.length > 1 && <div className="recommendation-pagination"><span>{cardIndex + 1} de {cards.length}</span>{cards.map((card, index) => <button key={card.id} aria-label={`Ver recomendação ${index + 1}`} className={index === cardIndex ? 'active' : ''} onClick={() => setCardIndex(index)} />)}</div>}
        </article> : <article className="recommendation-card calm"><span className="recommendation-icon">✓</span><div className="recommendation-copy"><strong>Nenhum alerta ativo</strong><small>Marque sua localização para ver os pontos de atenção próximos no mapa.</small></div></article>}
      </section>}
      {expanded && <section className="citizen-notices"><h1>Todos os alertas</h1><p className="muted">Ordenados por gravidade e proximidade da localização marcada.</p>
        {messages.length ? messages.map(({ id, area, text }) => <article className="notice-card" key={id}><span className="notice-label">ATENÇÃO</span><h2>{area?.type} · {area?.name}</h2><p>{text}</p><Link to={`/?area=${area?.id}`}>Ver no mapa →</Link></article>) : <article className="notice-card calm"><h2>Nenhum alerta ativo</h2><p>Não há ocorrências que exijam ação neste momento. Acompanhe o mapa para ver pontos de atenção e abrigos.</p></article>}
        {urgentAreas.filter((area) => !messages.some((message) => message.area?.id === area.id)).map((area) => <article className="notice-card" key={area.id}><span className="notice-label">ATENÇÃO</span><h2>{area.type} · {area.name}</h2><p>Evite a região e procure um local seguro. Acompanhe novas orientações da Defesa Civil.</p><Link to={`/?area=${area.id}`}>Ver no mapa →</Link></article>)}
      </section>}
      {!expanded && <section ref={mapSectionRef} className="citizen-map-section"><div className="section-heading"><div><h1>Mapa</h1><p className="muted">Localização, pontos de atenção e abrigos</p></div></div>
        <SchematicMap areas={areas} shelters={shelters} points={publicPoints} image={mapImage} focusAreaId={focusAreaId} onLocationChange={setLocation} onSelectArea={(id) => { setFocusAreaId(id); mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />
      </section>}
    </main>
  )
}
