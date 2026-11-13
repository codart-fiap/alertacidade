import { useParams, Link } from 'react-router-dom'
import { useSensors } from '../context/SensorContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { statusFromArea } from '../utils/risk.js'

export default function AreaDetailPage() {
  const { id } = useParams()
  const { areas, publicPoints, shelters: allShelters } = useSensors()
  const area = [...areas, ...publicPoints].find((a) => String(a.id) === id)

  const shelters = allShelters.filter((s) => s.areaId === Number(id) || s.areaId === 0)

  if (!area) {
    return (
      <div className="page">
        <p>Área não encontrada.</p>
        <Link to="/">Voltar</Link>
      </div>
    )
  }

  const status = statusFromArea(area)

  return (
    <div className="page">
      <Link to="/" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>&larr; Voltar</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 19, margin: 0 }}>{area.name}</h1>
        <StatusBadge status={status} />
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>{area.type}</p>

      <p style={{ fontSize: 14, lineHeight: 1.55, margin: '14px 0 20px' }}>{area.instruction || (status === 'critico' ? 'Evite a região e procure um local seguro. Acompanhe as orientações da Defesa Civil.' : 'Fique atento ao local e acompanhe os próximos avisos.')}</p>

      <h2 style={{ fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Abrigos vinculados
      </h2>
      {shelters.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Nenhum abrigo cadastrado.</p>}
      {shelters.map((s) => (
        <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{s.address}</div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{s.capacity} pessoas</div>
        </div>
      ))}
    </div>
  )
}
