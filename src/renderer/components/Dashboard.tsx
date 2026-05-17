import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../state/settingsStore'
import { useSamples } from '../state/samplesStore'
import { selectThresholds, useThresholds } from '../state/thresholdsStore'
import { computeStats } from '../lib/stats'
import { statusFromStats } from '../lib/status'
import { computeHealthScore } from '../lib/healthScore'
import { STATUS_COLOR_HEX } from '@shared/thresholds'
import EventTimeline from './EventTimeline'
import SettingsPanel from './SettingsPanel'
import StatCard from './StatCard'
import {
  GlassSelect,
  HealthRing,
  I,
  LatencyGraph,
  LogoMark,
  StatusBadge
} from './primitives'

function formatSession(ms: number) {
  const s = Math.floor(ms / 1000)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

export default function Dashboard() {
  const settings = useSettings(s => s.settings)!
  const patch = useSettings(s => s.patch)
  const setMonitoring = useSettings(s => s.setMonitoring)
  const setCompact = useSettings(s => s.setCompact)
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
  const thresholdsMap = useThresholds(s => s.map)
  const stats = useMemo(() => computeStats(samples), [samples])
  const status = useMemo(() => statusFromStats(stats, thresholds), [stats, thresholds])
  const health = useMemo(
    () => computeHealthScore(samples, thresholds, settings.latencyThresholdMs),
    [samples, thresholds, settings.latencyThresholdMs]
  )
  const accent = STATUS_COLOR_HEX[status]
  const lossNum = stats.lossPct
  const isMonitoring = settings.monitoring

  // Per-target lightweight status (for the row of chips next to Target picker)
  const targetChipStatus = useMemo(() => {
    const out: Record<string, ReturnType<typeof statusFromStats>> = {}
    for (const t of settings.targets) {
      const arr = samplesByTarget[t.id] ?? []
      const s = computeStats(arr)
      const th = thresholdsMap[t.id] ?? thresholds
      out[t.id] = statusFromStats(s, th)
    }
    return out
  }, [settings.targets, samplesByTarget, thresholdsMap, thresholds])

  const targetOptions = settings.targets.map(t => ({
    value: t.id,
    label: `${t.label} (${t.host})`
  }))

  const windowOptions = [1, 5, 10, 30, 60].map(v => ({ value: v, label: `${v} min` }))

  const currentStatus = stats.current === null && samples.length > 0 ? 'red' : status

  return (
    <div className="pp-desk" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Faux window chrome with title — keeps Electron's native bar hidden via autoHideMenuBar */}
      <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--fg-2)', letterSpacing: '0.04em', WebkitAppRegion: 'drag' } as React.CSSProperties}>
        PingPulse
      </div>

      <div style={{ flex: 1, padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        {/* App bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>
          <LogoMark size={36} status={status} showWordmark />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: -4 }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', letterSpacing: 0.5 }}>
              SESSION · {formatSession(now - startedAt)}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', letterSpacing: 0.5 }}>
              {settings.targets.length} targets · {(1000 / settings.intervalMs).toFixed(settings.intervalMs >= 1000 ? 0 : 1)} Hz
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <StatusBadge status={status} size="lg" />
          <button className="btn" onClick={() => setMonitoring(!isMonitoring)}>
            {isMonitoring ? <I.Pause /> : <I.Play />}
            {isMonitoring ? 'Pause' : 'Resume'}
          </button>
          <button className="btn" onClick={() => setCompact(!settings.compactMode)}>
            <I.Compact />
            {settings.compactMode ? 'Hide overlay' : 'Overlay'}
          </button>
          <button className="btn" onClick={() => setSettingsOpen(true)}>
            <I.Settings />
            Settings
          </button>
        </div>

        {/* Top row · health + 5 stat cards */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
          <div
            className={`glass glass--tint-${status}`}
            style={{ flex: '0 0 380px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 22 }}
          >
            {samples.length === 0 ? (
              <div style={{ width: 132, height: 132, display: 'grid', placeItems: 'center' }}>
                <div className="t-display" style={{ fontSize: 36, color: 'var(--st-gray)', fontWeight: 600 }}>—</div>
              </div>
            ) : (
              <HealthRing score={health.score} status={status} size={132} />
            )}
            <div style={{ flex: 1 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Penalty breakdown</div>
              <BreakdownRows breakdown={health.breakdown} />
            </div>
          </div>

          <StatCard
            label="Current"
            value={stats.current === null ? '—' : Math.round(stats.current).toString()}
            unit="ms"
            status={currentStatus}
            emphasize
          />
          <StatCard
            label="Average"
            value={stats.samples ? stats.avg.toFixed(0) : '—'}
            unit="ms"
            sub={`rolling ${settings.rollingWindowMin} min`}
          />
          <StatCard label="Minimum" value={stats.samples ? stats.min.toFixed(0) : '—'} unit="ms" />
          <StatCard label="Maximum" value={stats.samples ? stats.max.toFixed(0) : '—'} unit="ms" />
          <StatCard
            label="Loss"
            value={stats.lossPct.toFixed(1)}
            unit="%"
            status={lossNum > 5 ? 'red' : lossNum > 1 ? 'orange' : undefined}
            emphasize={lossNum > 1}
            sub={`jitter ${stats.samples > 1 ? stats.jitter.toFixed(1) : '—'} ms`}
          />
        </div>

        {/* Graph */}
        <div className="glass" style={{ padding: '16px 18px 8px', flex: 1, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <span className="t-eyebrow">Target</span>
            <GlassSelect
              value={settings.activeTargetId ?? ''}
              options={targetOptions}
              onChange={v => patch({ activeTargetId: v || null })}
              leading={<span className={`dot dot--${status}`} />}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
              {settings.targets.map(t => {
                const tStatus = targetChipStatus[t.id] ?? 'gray'
                return (
                  <span
                    key={t.id}
                    className="chip"
                    style={{
                      height: 22,
                      paddingInline: 8,
                      fontSize: 10.5,
                      color: 'var(--fg-2)',
                      cursor: 'pointer'
                    }}
                    onClick={() => patch({ activeTargetId: t.id })}
                    title={t.host}
                  >
                    <span className={`dot dot--${tStatus}`} style={{ width: 6, height: 6 }} />
                    {t.label}
                  </span>
                )
              })}
            </div>
            <div style={{ flex: 1 }} />
            <span className="t-eyebrow">Window</span>
            <GlassSelect
              value={settings.rollingWindowMin}
              options={windowOptions}
              onChange={v => patch({ rollingWindowMin: v })}
            />
            <span className="t-eyebrow" style={{ marginLeft: 8 }}>Jitter</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--fg-1)' }}>
              {stats.samples > 1 ? `${stats.jitter.toFixed(1)} ms` : '—'}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 220 }}>
            <LatencyGraph samples={samples} color={accent} thresholdMs={settings.latencyThresholdMs} height={220} />
          </div>
        </div>

        {/* Event timeline */}
        <EventTimeline />
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function BreakdownRows({ breakdown }: { breakdown: { loss: number; jitter: number; latency: number; spikes: number } }) {
  const Row = ({ k, v }: { k: string; v: number }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--fg-2)' }}>{k}</span>
      <span className="mono" style={{ color: 'var(--fg-1)' }}>−{v}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
      <Row k="Loss" v={breakdown.loss} />
      <Row k="Jitter" v={breakdown.jitter} />
      <Row k="Latency" v={breakdown.latency} />
      <Row k="Spikes" v={breakdown.spikes} />
    </div>
  )
}
