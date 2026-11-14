import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSensors } from '../context/SensorContext.jsx'
import SchematicMap from '../components/SchematicMap.jsx'
import { statusFromArea } from '../utils/risk.js'

export default function AreasListPage({ expanded = false }) {
  const { areas, alerts, shelters, publicPoints, mapImage } = useSensors()
  const [searchParams] = useSearchParams()
  const [focusAreaId, setFocusAreaId] = useState(searchParams.get('area'))
  const [location, setLocation] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const mapSectionRef = useRef(null)
  useEffect(() => {
    const areaId = searchParams.get('area')
    if (!expanded && areaId) {
      setFocusAreaId(areaId)
      requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [expanded, searchParams])
  const allAreas = [...publicPoints, ...areas]
  const activeAlerts = alerts.filter((alert) => !alert.resolved)
  const urgentAreas = allAreas.filter((area) => publicPoints.some((point) => point.id === area.id) || statusFromArea(area) === 'critico')
  const messages = activeAlerts.map((alert) => {
    const area = allAreas.find((item) => String(item.id) === String(alert.areaId))
    return { id: alert.id, area, text: area?.instruction || `Evite a região de ${area?.name}. Procure um local seguro e siga as orientações da Defesa Civil.` }
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
