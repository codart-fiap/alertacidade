import { useNavigate } from 'react-router-dom'

// Banner fixo que aparece quando ha um alerta ativo. Clicar nele
// leva pro mapa ja com a area em questao destacada (query param
// ?area=ID, lido em pages/MapPage.jsx).
export default function AlertBanner({ alert, areaName }) {
  const navigate = useNavigate()
  if (!alert) return null

  return (
    <div
      onClick={() => navigate(`/?area=${alert.areaId}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--red-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 18px',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      <span>⚠️</span>
      <div>
        <b style={{ display: 'block', fontSize: 13.5 }}>Alerta: {areaName}</b>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Toque para ver no mapa</span>
      </div>
    </div>
  )
}
