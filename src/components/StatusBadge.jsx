import { statusLabel } from '../utils/risk.js'

const COLORS = {
  normal: { bg: 'var(--green-bg)', text: 'var(--green)' },
  atencao: { bg: 'var(--yellow-bg)', text: 'var(--yellow)' },
  critico: { bg: 'var(--red-bg)', text: 'var(--red)' },
}

export default function StatusBadge({ status }) {
  const c = COLORS[status] ?? COLORS.normal
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        // pisca suavemente quando critico, pra chamar atencao sem
        // precisar de som/notificacao real nesta fase do projeto
        animation: status === 'critico' ? 'pulse 1.4s infinite' : 'none',
      }}
    >
      {statusLabel(status)}
    </span>
  )
}
