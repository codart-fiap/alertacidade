import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'
import { statusFromArea } from '../utils/risk.js'

export default function AreaCard({ area }) {
  const status = statusFromArea(area)

  return (
    <Link
      to={`/areas/${area.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15.5, color: 'var(--text)' }}>{area.name}</h3>
          <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{area.type}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
        {area.sensor}: <b style={{ color: 'var(--text)' }}>{area.value}{area.unit}</b> · limite {area.threshold}{area.unit}
      </div>
    </Link>
  )
}
