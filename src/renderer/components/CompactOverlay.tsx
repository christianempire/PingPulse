import { useMemo } from 'react'
import { useSettings } from '../state/settingsStore'
import { useSamples } from '../state/samplesStore'
import { selectThresholds, useThresholds } from '../state/thresholdsStore'
import { computeStats } from '../lib/stats'
import { statusFromStats } from '../lib/status'
import { STATUS_COLOR_HEX } from '@shared/thresholds'

export default function CompactOverlay() {
  const settings = useSettings(s => s.settings)!
  const samplesByTarget = useSamples(s => s.samplesByTarget)
  const setCompact = useSettings(s => s.setCompact)
  const thresholds = useThresholds(selectThresholds(settings.activeTargetId))

  const samples = settings.activeTargetId ? samplesByTarget[settings.activeTargetId] ?? [] : []
  const stats = useMemo(() => computeStats(samples.slice(-60)), [samples])
  const status = useMemo(() => statusFromStats(stats, thresholds), [stats, thresholds])
  const color = STATUS_COLOR_HEX[status]

  // Sparkline from last 60 samples
  const spark = useMemo(() => {
    const last = samples.slice(-60)
    if (last.length === 0) return ''
    const maxR = Math.max(50, ...last.map(s => s.rttMs ?? 0))
    const w = 120
    const h = 28
    const stepX = w / Math.max(1, last.length - 1)
    return last
      .map((s, i) => {
        const v = s.rttMs ?? 0
        const y = h - (v / maxR) * h
        return `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [samples])

  return (
    <div className="h-full w-full p-2.5 bg-surface-1/95 border border-surface-border rounded-xl backdrop-blur flex items-center gap-3 shadow-card">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <div className="leading-tight">
          <div className="font-mono text-2xl text-slate-100">
            {stats.current === null ? '—' : Math.round(stats.current)}
            <span className="text-sm text-slate-400 ml-1">ms</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Loss {stats.lossPct.toFixed(1)}%
          </div>
        </div>
      </div>
      <svg width={120} height={28} className="flex-1">
        <path d={spark} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
      <button
        className="text-slate-500 hover:text-slate-200 text-sm px-1"
        title="Close overlay"
        onClick={() => setCompact(false)}
      >
        ×
      </button>
    </div>
  )
}
