import { useMemo } from 'react'
import { useSamples } from '../state/samplesStore'
import { useSettings } from '../state/settingsStore'
import type { Alert, AlertKind, PingSample } from '@shared/types'

const KIND_LABEL: Record<AlertKind, string> = {
  spike: 'Spike',
  loss: 'Packet loss',
  down: 'Connection down',
  recovered: 'Recovered'
}

const KIND_DOT: Record<AlertKind, string> = {
  spike: 'dot dot--yellow',
  loss: 'dot dot--orange',
  down: 'dot dot--red',
  recovered: 'dot dot--green'
}

function deriveSpikes(samples: PingSample[], threshold: number, targetLabel: (id: string) => string): Alert[] {
  const out: Alert[] = []
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    if (s.rttMs === null) continue
    if (s.rttMs >= threshold) {
      const prev = samples[i - 1]
      if (!prev || prev.rttMs === null || prev.rttMs < threshold) {
        out.push({
          id: `${s.targetId}-spike-${s.t}`,
          t: s.t,
          kind: 'spike',
          targetId: s.targetId,
          message: `Spike ${Math.round(s.rttMs)} ms`,
        })
      }
    }
  }
  return out
}

function formatClock(t: number) {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function EventTimeline() {
  const samplesByTarget = useSamples(s => s.samplesByTarget)
  const baseAlerts = useSamples(s => s.alerts)
  const settings = useSettings(s => s.settings)

  const events = useMemo(() => {
    if (!settings) return [] as Alert[]
    const labelOf = (id: string) => settings.targets.find(t => t.id === id)?.label ?? id
    const spikes: Alert[] = []
    for (const arr of Object.values(samplesByTarget)) {
      spikes.push(...deriveSpikes(arr.slice(-300), settings.latencyThresholdMs, labelOf))
    }
    const all = [...baseAlerts, ...spikes]
    all.sort((a, b) => b.t - a.t)
    return all.slice(0, 80)
  }, [samplesByTarget, baseAlerts, settings])

  const labelOf = (id: string) => settings?.targets.find(t => t.id === id)?.label ?? id

  return (
    <div className="glass" style={{ flex: '0 0 168px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px 8px', justifyContent: 'space-between' }}>
        <span className="t-eyebrow">Event timeline</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>
          {events.length} events · live
        </span>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {events.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
            No events yet — connection is clean.
          </div>
        )}
        {events.map(e => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 14px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              fontSize: 12
            }}
          >
            <span
              className="mono"
              style={{ color: 'var(--fg-3)', fontSize: 10.5, flex: '0 0 76px' }}
            >
              {formatClock(e.t)}
            </span>
            <span className={KIND_DOT[e.kind]} style={{ flex: '0 0 8px' }} />
            <span style={{ color: 'var(--fg-0)', fontWeight: 500, flex: '0 0 130px' }}>{KIND_LABEL[e.kind]}</span>
            <span style={{ color: 'var(--fg-2)' }}>{e.message}</span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 10.5 }}>{labelOf(e.targetId)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
