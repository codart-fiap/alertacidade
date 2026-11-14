import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSensors } from '../context/SensorContext.jsx'
import SchematicMap from '../components/SchematicMap.jsx'
import { getImageDimensions } from '../map/image.js'
import { isLocationInsideMonitoringArea, isLocationNearPoint, statusFromArea } from '../utils/risk.js'

const DEFAULT_MAP_DIMENSIONS = { width: 1000, height: 600 }
const EMPTY_REPORT = { name: '', type: 'Enchente', instruction: '' }

function getCitizenSessionId() {
  let id = sessionStorage.getItem('alertacidade-citizen-session')
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `citizen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('alertacidade-citizen-session', id)
  }
  return id
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
  const { areas, alerts, shelters, publicPoints, mapImage, managerNotifications, citizenReports, submitCitizenReport, confirmCitizenReport } = useSensors()
  const [searchParams] = useSearchParams()
  const [focusAreaId, setFocusAreaId] = useState(searchParams.get('area'))
  const [location, setLocation] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [mapDimensions, setMapDimensions] = useState(DEFAULT_MAP_DIMENSIONS)
  const [riskNotification, setRiskNotification] = useState(null)
  const [publishedNotification, setPublishedNotification] = useState(null)
  const [reportDraft, setReportDraft] = useState(null)
  const [reportLocation, setReportLocation] = useState(null)
  const [pickingReportLocation, setPickingReportLocation] = useState(false)
  const [reportFeedback, setReportFeedback] = useState('')
  const [citizenSessionId] = useState(getCitizenSessionId)
  const notifiedSensorsRef = useRef(new Set())
  const seenPublishedNotificationsRef = useRef(new Set())
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
  const nearbyCitizenReports = citizenReports.filter((report) => report.status === 'pending' && (report.reporterId === citizenSessionId || isLocationNearPoint(location, report, mapDimensions)))
  useEffect(() => {
    if (expanded || !location) return
    const matches = areas.filter((area) => area.active !== false && statusFromArea(area) !== 'normal' && isLocationInsideMonitoringArea(location, area, mapDimensions))
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
  useEffect(() => {
    const eligible = managerNotifications.filter((notification) => {
      if (!notification.active) return false
      if (notification.scope === 'global') return true
      const sensor = areas.find((area) => String(area.id) === String(notification.sensorId))
      return Boolean(sensor && isLocationInsideMonitoringArea(location, sensor, mapDimensions))
    })
    const eligibleIds = new Set(eligible.map((notification) => notification.id))
    const activeGlobalIds = new Set(managerNotifications.filter((notification) => notification.active && notification.scope === 'global').map((notification) => notification.id))
    seenPublishedNotificationsRef.current.forEach((id) => {
      const notification = managerNotifications.find((item) => item.id === id)
      if (!notification || !notification.active || (notification.scope !== 'global' && !eligibleIds.has(id)) || (notification.scope === 'global' && !activeGlobalIds.has(id))) {
        seenPublishedNotificationsRef.current.delete(id)
      }
    })
    const next = eligible.find((notification) => !seenPublishedNotificationsRef.current.has(notification.id))
    if (!next) {
      setPublishedNotification((current) => current && eligibleIds.has(current.id) ? current : null)
      return
    }
    seenPublishedNotificationsRef.current.add(next.id)
    setRiskNotification(null)
    setPublishedNotification({ ...next, sensorName: next.scope === 'sensor' ? areas.find((area) => String(area.id) === String(next.sensorId))?.name : null })
  }, [managerNotifications, areas, location, mapDimensions])
  function dismissPublishedNotification() {
    if (publishedNotification) seenPublishedNotificationsRef.current.add(publishedNotification.id)
    setPublishedNotification(null)
  }
  function startCitizenReport() {
    setReportDraft({ ...EMPTY_REPORT })
    setReportLocation(null)
    setPickingReportLocation(true)
    setReportFeedback('')
    window.setTimeout(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  function selectReportLocation(point) {
    setReportLocation(point)
    setPickingReportLocation(false)
  }
  function submitReport(e) {
    e.preventDefault()
    if (!reportDraft?.name.trim() || !reportDraft.instruction.trim() || !reportLocation) return
    submitCitizenReport({ ...reportDraft, name: reportDraft.name.trim(), instruction: reportDraft.instruction.trim(), ...reportLocation, reporterId: citizenSessionId })
    setReportDraft(null)
    setReportFeedback('Relato enviado. Ele aparecerá para outras pessoas próximas confirmarem.')
  }
  function confirmReport(report) {
    const confirmed = confirmCitizenReport(report.id, citizenSessionId)
    setReportFeedback(confirmed ? 'Confirmado! O ponto agora está visível para todos no mapa.' : 'Este relato foi feito nesta sessão e precisa ser confirmado por outro cidadão próximo.')
  }
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
      {(publishedNotification || riskNotification) && <aside className={`risk-location-notification ${publishedNotification ? (publishedNotification.scope === 'global' ? 'global' : 'published') : riskNotification.status}`} role="alert" aria-live="assertive">
        {publishedNotification ? <>
          <span className="risk-notification-icon" aria-hidden="true">{publishedNotification.scope === 'global' ? '📢' : '⚠'}</span>
          <div className="risk-notification-content"><span className="published-notification-audience">{publishedNotification.scope === 'global' ? 'ALERTA GERAL' : `ALERTA NA SUA ÁREA · ${publishedNotification.sensorName}`}</span><strong>{publishedNotification.title}</strong><p>{publishedNotification.message}</p>
            <button className="risk-notification-link" onClick={() => { if (publishedNotification.scope === 'sensor') setFocusAreaId(publishedNotification.sensorId); dismissPublishedNotification(); mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Ver no mapa</button>
          </div>
          <button className="risk-notification-close" aria-label="Fechar notificação" onClick={dismissPublishedNotification}>×</button>
        </> : <>
        <span className="risk-notification-icon" aria-hidden="true">⚠</span>
        <div className="risk-notification-content"><strong>Você está dentro de uma área com risco detectado</strong><span>{riskNotification.name} · {riskNotification.type}</span><p>{riskNotification.instruction}</p>
          <button className="risk-notification-link" onClick={() => { setFocusAreaId(riskNotification.id); setRiskNotification(null); mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Ver sensor no mapa</button>
        </div>
        <button className="risk-notification-close" aria-label="Fechar notificação" onClick={() => setRiskNotification(null)}>×</button>
        </>}
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
      {!expanded && <section ref={mapSectionRef} className="citizen-map-section"><div className="section-heading citizen-map-heading"><div><h1>Mapa</h1><p className="muted">Localização, pontos de atenção e abrigos</p></div><button className="btn citizen-report-button" onClick={startCitizenReport}>＋ Reportar ponto de atenção</button></div>
        {pickingReportLocation && <div className="manager-pick-banner citizen-report-pick-banner" role="status"><span aria-hidden="true">⌖</span> Toque no mapa para marcar onde está acontecendo.<button onClick={() => { setPickingReportLocation(false); setReportDraft(null) }}>Cancelar</button></div>}
        <SchematicMap areas={areas} shelters={shelters} points={publicPoints} pendingPoints={nearbyCitizenReports} image={mapImage} focusAreaId={focusAreaId} onLocationChange={setLocation} onPickLocation={pickingReportLocation ? selectReportLocation : undefined} pickingLabel="Toque no mapa para marcar o ponto de atenção" onSelectArea={(id) => { setFocusAreaId(id); mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />
        {reportFeedback && <p className="citizen-report-feedback" role="status">{reportFeedback}</p>}
        <section className="citizen-report-list" aria-label="Relatos de pontos de atenção próximos"><div className="admin-sensor-section-heading"><h2>Pontos aguardando confirmação</h2><span className="count-pill neutral">{nearbyCitizenReports.filter((report) => report.reporterId !== citizenSessionId).length}</span></div>
          {nearbyCitizenReports.length ? nearbyCitizenReports.map((report) => <article className="citizen-report-card" key={report.id}><div><span className="eyebrow">RELATO DA COMUNIDADE</span><h3>{report.name} · {report.type}</h3><p>{report.instruction}</p><small>{report.reporterId === citizenSessionId ? 'Seu relato · aguardando confirmação de outra pessoa' : 'Você está perto deste local? Confirme se o ponto continua lá.'}</small></div>{report.reporterId !== citizenSessionId && <button className="btn citizen-confirm-button" onClick={() => confirmReport(report)}>Continua lá</button>}</article>) : <p className="muted">Marque sua localização no mapa para ver relatos próximos que precisam de confirmação.</p>}
        </section>
        {reportDraft && !pickingReportLocation && <div className="manager-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setReportDraft(null) }}><section className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="citizen-report-title">
          <button className="manager-modal-close" aria-label="Fechar formulário" onClick={() => setReportDraft(null)}>×</button><span className="eyebrow">RELATO COLABORATIVO</span><h2 id="citizen-report-title">Reportar ponto de atenção</h2><p className="muted">Outras pessoas próximas confirmarão o local antes dele ser exibido para todos.</p>
          <form className="manager-form" onSubmit={submitReport}><label>Nome do local<input className="input" autoFocus required value={reportDraft.name} onChange={(e) => setReportDraft((current) => ({ ...current, name: e.target.value }))} placeholder="Ex.: Rua das Flores" /></label>
            <label>Ocorrência<select className="input" value={reportDraft.type} onChange={(e) => setReportDraft((current) => ({ ...current, type: e.target.value }))}><option>Enchente</option><option>Deslizamento</option><option>Incêndio</option><option>Onda de calor</option><option>Outro ponto de atenção</option></select></label>
            <label>O que está acontecendo e o que as pessoas devem fazer?<textarea className="input" rows="4" required maxLength="500" value={reportDraft.instruction} onChange={(e) => setReportDraft((current) => ({ ...current, instruction: e.target.value }))} placeholder="Descreva o risco e uma orientação segura." /></label>
            <p className="manager-location-confirm">✓ Localização marcada no mapa</p><button type="button" className="btn secondary" onClick={() => setPickingReportLocation(true)}>Alterar localização</button>
            <div className="manager-modal-actions"><button type="button" className="btn secondary" onClick={() => setReportDraft(null)}>Cancelar</button><button className="btn">Enviar para confirmação</button></div>
          </form>
        </section></div>}
      </section>}
    </main>
  )
}
