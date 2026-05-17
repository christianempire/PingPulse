import { STATUS_COLOR_HEX } from '@shared/thresholds'
import type { HealthScore, StatusColor } from '@shared/types'

interface Props {
  score: HealthScore
  status: StatusColor
}

export default function HealthScoreCard({ score, status }: Props) {
  const color = STATUS_COLOR_HEX[status]
  const pct = Math.max(0, Math.min(100, score.score))
  // SVG ring
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  return (
    <div className="card flex items-center gap-5 min-h-[150px]">
      <div className="relative flex-shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} stroke="#262c3a" strokeWidth="10" fill="none" />
          <circle
            cx="64" cy="64" r={r}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-4xl text-slate-100">{pct}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Health</div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <Row label="Loss" value={score.breakdown.loss} />
        <Row label="Latency" value={score.breakdown.latency} />
        <Row label="Jitter" value={score.breakdown.jitter} />
        <Row label="Spikes" value={score.breakdown.spikes} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200">-{value}</span>
    </div>
  )
}
