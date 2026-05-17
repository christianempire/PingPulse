import type { StatusColor } from '@shared/types'
import { STATUS_COLOR_HEX } from '@shared/thresholds'

interface Props {
  label: string
  value: string
  unit?: string
  status?: StatusColor
  emphasize?: boolean
  sub?: string
}

export default function StatCard({ label, value, unit = 'ms', status, emphasize = false, sub }: Props) {
  const color = status ? STATUS_COLOR_HEX[status] : 'var(--fg-0)'
  return (
    <div className="glass" style={{ flex: 1, padding: '14px 16px 16px', minHeight: 92 }}>
      <div className="t-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 14 }}>
        <span
          className="t-display t-num"
          style={{
            fontSize: 30,
            lineHeight: 1,
            fontWeight: 600,
            color,
            textShadow: emphasize ? `0 0 18px ${color}66` : 'none',
            letterSpacing: -0.6
          }}
        >
          {value}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', marginLeft: 2 }}>
          {unit}
        </span>
      </div>
      {sub && <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
