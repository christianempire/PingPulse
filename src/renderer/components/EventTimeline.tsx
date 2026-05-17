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

const KIND_COLOR: Record<AlertKind, string> = {
  spike: '#eab308',
  loss: '#f97316',
  down: '#ef4444',
  recovered: '#22c55e'
}

function deriveSpikes(samples: PingSample[], threshold: number, targetLabel: (id: string) => string): Alert[] {
  const out: Alert[] = []
  // Coalesce: only flag the *start* of a spike run (a sample over threshold whose predecessor was under).
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
          message: `Spike ${Math.round(s.rttMs)} ms · ${targetLabel(s.targetId)}`
        })
      }
    }
  }
  return out
}

export default function EventTimeline() {
  const samplesByTarget = useSamples(s => s.samplesByTarget)
  const baseAlerts = useSamples(s => s.alerts)
  const settings = useSettings(s => s.settings)

  const merged = useMemo(() => {
    if (!settings) return [] as Alert[]
    const labelOf = (id: string) => settings.targets.find(t => t.id === id)?.label ?? id
    const spikes: Alert[] = []
    for (const arr of Object.values(samplesByTarget)) {
      spikes.push(...deriveSpikes(arr.slice(-300), settings.latencyThresholdMs, labelOf))
    }
    const all = [
      ...baseAlerts.map(a => ({ ...a, message: enrich(a, labelOf) })),
      ...spikes
    ]
    all.sort((a, b) => b.t - a.t)
    return all.slice(0, 80)
  }, [samplesByTarget, baseAlerts, settings])

  return (
    <div className="card flex flex-col gap-2 max-h-[260px] overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="stat-label">Event timeline</div>
        <div className="text-xs text-slate-500">{merged.length} events</div>
      </div>
      <div className="overflow-y-auto pr-1 flex flex-col gap-1">
        {merged.length === 0 && (
          <div className="text-sm text-slate-500 py-4 text-center">No events yet — connection is clean.</div>
        )}
        {merged.map(a => (
          <div key={a.id} className="flex items-center gap-2 text-sm py-1">
            <span className="font-mono text-xs text-slate-500 w-20 shrink-0">
              {new Date(a.t).toLocaleTimeString()}
            </span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: KIND_COLOR[a.kind] }}
            />
            <span className="text-slate-300">{KIND_LABEL[a.kind]}</span>
            <span className="text-slate-500 truncate">— {a.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function enrich(a: Alert, labelOf: (id: string) => string): string {
  if (a.message.includes(labelOf(a.targetId))) return a.message
  return `${a.message} · ${labelOf(a.targetId)}`
}
