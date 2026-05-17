import { useMemo } from 'react'
import { useSettings } from '../state/settingsStore'
import { useSamples } from '../state/samplesStore'
import { selectThresholds, useThresholds } from '../state/thresholdsStore'
import { computeStats } from '../lib/stats'
import { statusFromStats } from '../lib/status'
import { STATUS_COLOR_HEX, STATUS_GLOW_RGB, STATUS_LABEL } from '@shared/thresholds'
import type { StatusColor } from '@shared/types'
import { I, Sparkline, STATUS_GLYPH } from './primitives'

export default function CompactOverlay() {
  const settings = useSettings(s => s.settings)!
  const samplesByTarget = useSamples(s => s.samplesByTarget)
  const setCompact = useSettings(s => s.setCompact)
  const thresholds = useThresholds(selectThresholds(settings.activeTargetId))

  const samples = settings.activeTargetId ? samplesByTarget[settings.activeTargetId] ?? [] : []
  const recent = useMemo(() => samples.slice(-60), [samples])
  const stats = useMemo(() => computeStats(recent), [recent])

  const isIdle = !settings.monitoring
  const baseStatus = useMemo(() => statusFromStats(stats, thresholds), [stats, thresholds])
  const status: StatusColor = isIdle ? 'gray' : baseStatus

  const hex = STATUS_COLOR_HEX[status]
  const glow = STATUS_GLOW_RGB[status]
  const label = isIdle ? 'Idle' : STATUS_LABEL[status]
  const Glyph = STATUS_GLYPH[status]

  // Build sparkline series. Replace nulls with 0 baseline for visual continuity.
  const sparkData = recent.map(s => s.rttMs ?? 0)
  while (sparkData.length < 10) sparkData.unshift(sparkData[0] ?? 0)

  const displayPing = isIdle
    ? '—'
    : stats.current === null
      ? '↓'
      : Math.round(stats.current).toString()

  const losssShown = isIdle ? '—' : stats.lossPct.toFixed(1)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: 8,
        boxSizing: 'border-box',
        display: 'grid',
        placeItems: 'stretch'
      }}
    >
    <div
      className={`glass glass--tint-${status}`}
      style={{
        padding: '12px 14px',
        borderRadius: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative'
      }}
    >
      {/* Drag handle */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 28,
          height: 3,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.18)'
        }}
      />

      <button
        onClick={() => setCompact(false)}
        title="Close overlay"
        style={{
          position: 'absolute',
          top: 7,
          right: 7,
          width: 18,
          height: 18,
          borderRadius: 999,
          border: 0,
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--fg-1)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer'
        }}
      >
        <I.Close style={{ width: 9, height: 9 }} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 999,
            background: `radial-gradient(circle, rgba(${glow}, 0.6), transparent 70%)`,
            color: hex,
            flex: '0 0 18px'
          }}
        >
          <Glyph />
        </span>
        <span
          className="t-display t-num"
          style={{
            fontSize: 30,
            lineHeight: 0.9,
            fontWeight: 700,
            color: stats.current === null && !isIdle ? hex : 'var(--fg-0)',
            letterSpacing: -1,
            textShadow: status === 'red' ? `0 0 12px ${hex}66` : 'none'
          }}
        >
          {displayPing}
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-2)', marginBottom: 3 }}>
          ms
        </span>
        <span style={{ flex: 1 }} />
        <div style={{ marginBottom: -2 }}>
          <Sparkline data={sparkData} color={hex} width={92} height={32} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span
          className="t-eyebrow"
          style={{
            fontSize: 9.5,
            color: hex,
            letterSpacing: '0.16em',
            textShadow: `0 0 6px rgba(${glow},0.4)`
          }}
        >
          {label.toUpperCase()}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            color: parseFloat(losssShown) > 1 ? hex : 'var(--fg-2)',
            letterSpacing: '0.04em'
          }}
        >
          LOSS {losssShown}%
        </span>
      </div>
    </div>
    </div>
  )
}
