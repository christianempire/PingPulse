import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../state/settingsStore'
import { useSamples } from '../state/samplesStore'
import { selectThresholds, useThresholds } from '../state/thresholdsStore'
import { computeStats } from '../lib/stats'
import { statusFromStats } from '../lib/status'
import { computeHealthScore } from '../lib/healthScore'
import Header from './Header'
import HealthScoreCard from './HealthScoreCard'
import StatCard from './StatCard'
import LatencyGraph from './LatencyGraph'
import EventTimeline from './EventTimeline'
import TargetSelector from './TargetSelector'
import SettingsPanel from './SettingsPanel'
import { STATUS_COLOR_HEX } from '@shared/thresholds'

export default function Dashboard() {
  const settings = useSettings(s => s.settings)!
  const patch = useSettings(s => s.patch)
  const samplesByTarget = useSamples(s => s.samplesByTarget)
  const startedAt = useSamples(s => s.startedAt)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const activeId = settings.activeTargetId
  const samples = activeId ? samplesByTarget[activeId] ?? [] : []
  const thresholds = useThresholds(selectThresholds(activeId))
  const stats = useMemo(() => computeStats(samples), [samples])
  const status = useMemo(() => statusFromStats(stats, thresholds), [stats, thresholds])
  const health = useMemo(
    () => computeHealthScore(samples, thresholds, settings.latencyThresholdMs),
    [samples, thresholds, settings.latencyThresholdMs]
  )
  const accent = STATUS_COLOR_HEX[status]

  return (
    <div className="min-h-full p-6 max-w-[1280px] mx-auto">
      <Header
        status={status}
        sessionMs={now - startedAt}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 lg:col-span-5">
          <HealthScoreCard score={health} status={status} />
        </div>
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Current"
            value={stats.current === null ? '—' : Math.round(stats.current).toString()}
            suffix="ms"
            accent={stats.current === null ? STATUS_COLOR_HEX.red : accent}
          />
          <StatCard label="Avg" value={stats.samples ? stats.avg.toFixed(0) : '—'} suffix="ms" />
          <StatCard label="Min" value={stats.samples ? stats.min.toFixed(0) : '—'} suffix="ms" />
          <StatCard label="Max" value={stats.samples ? stats.max.toFixed(0) : '—'} suffix="ms" />
          <StatCard
            label="Loss"
            value={stats.lossPct.toFixed(1)}
            suffix="%"
            accent={stats.lossPct > 0 ? STATUS_COLOR_HEX.orange : undefined}
          />
        </div>
      </section>

      <section className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <TargetSelector />
          <div className="flex items-center gap-2">
            <label className="stat-label">Window</label>
            <select
              className="bg-surface-2 border border-surface-border rounded-md px-2 py-1.5 text-sm text-slate-100"
              value={settings.rollingWindowMin}
              onChange={e => patch({ rollingWindowMin: Number(e.target.value) })}
            >
              <option value={1}>1 min</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            <span className="text-xs text-slate-500 ml-2 font-mono">
              jitter {stats.samples > 1 ? stats.jitter.toFixed(1) : '—'} ms
            </span>
          </div>
        </div>
        <LatencyGraph samples={samples} threshold={settings.latencyThresholdMs} />
      </section>

      <EventTimeline />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
