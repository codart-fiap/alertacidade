import { Link, useNavigate } from 'react-router-dom'
import { useSensors } from '../context/SensorContext.jsx'
import SchematicMap from '../components/SchematicMap.jsx'
import { statusFromArea } from '../utils/risk.js'

export default function AreasListPage({ expanded = false }) {
  const { areas, alerts, shelters, publicPoints, mapImage } = useSensors()
  const navigate = useNavigate()
  const allAreas = [...publicPoints, ...areas]
  const activeAlerts = alerts.filter((alert) => !alert.resolved)
  const urgentAreas = allAreas.filter((area) => publicPoints.some((point) => point.id === area.id) || statusFromArea(area) === 'critico')
  const messages = activeAlerts.map((alert) => {
    const area = allAreas.find((item) => String(item.id) === String(alert.areaId))
    return { id: alert.id, area, text: area?.instruction || `Evite a região de ${area?.name}. Procure um local seguro e siga as orientações da Defesa Civil.` }
  })

  return (
    <main className={`citizen-page ${expanded ? 'citizen-expanded' : ''}`}>
      <Link className="summary-teaser" to="/resumos">
        <span className="summary-icon">{activeAlerts.length ? '⚠' : '✓'}</span>
        <span className="summary-copy"><strong>{activeAlerts.length ? 'Recomendações para você' : 'Orientações para sua região'}</strong><small>{activeAlerts.length ? `${activeAlerts.length} ocorrência${activeAlerts.length > 1 ? 's' : ''} ativa${activeAlerts.length > 1 ? 's' : ''}. ${messages[0]?.text || 'Evite áreas de risco e acompanhe as orientações da Defesa Civil.'}` : urgentAreas.length ? `Atenção em ${urgentAreas[0].name}. Evite a área e acompanhe as orientações da Defesa Civil.` : 'Nenhum alerta ativo. Acompanhe o mapa e marque sua localização para se orientar.'}</small></span>
        <span className="summary-arrow">›</span>
      </Link>
      {expanded && <section className="citizen-notices"><h1>Resumos e alertas</h1><p className="muted">O que está acontecendo e como agir.</p>
        {messages.length ? messages.map(({ id, area, text }) => <article className="notice-card" key={id}><span className="notice-label">ATENÇÃO</span><h2>{area?.type} · {area?.name}</h2><p>{text}</p><Link to={`/mapa?area=${area?.id}`}>Ver no mapa →</Link></article>) : <article className="notice-card calm"><h2>Nenhum alerta ativo</h2><p>Não há ocorrências que exijam ação neste momento. Acompanhe o mapa para ver pontos de atenção e abrigos.</p></article>}
        {urgentAreas.filter((area) => !messages.some((message) => message.area?.id === area.id)).map((area) => <article className="notice-card" key={area.id}><span className="notice-label">ATENÇÃO</span><h2>{area.type} · {area.name}</h2><p>Evite a região e procure um local seguro. Acompanhe novas orientações da Defesa Civil.</p><Link to={`/mapa?area=${area.id}`}>Ver no mapa →</Link></article>)}
      </section>}
      <section className="citizen-map-section"><div className="section-heading"><div><h1>{expanded ? 'Mapa de ocorrências' : 'Mapa'}</h1><p className="muted">Localização, pontos de atenção e abrigos</p></div></div>
        <SchematicMap areas={areas} shelters={shelters} points={publicPoints} image={mapImage} onSelectArea={(id) => navigate(`/mapa?area=${id}`)} />
      </section>
    </main>
  )
}
