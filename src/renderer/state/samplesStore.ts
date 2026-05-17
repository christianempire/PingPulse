import { create } from 'zustand'
import type { Alert, PingSample } from '@shared/types'

interface SamplesState {
  samplesByTarget: Record<string, PingSample[]>
  alerts: Alert[]
  windowMs: number
  startedAt: number
  push: (s: PingSample) => void
  setWindowMs: (ms: number) => void
  clear: () => void
}

const MAX_PER_TARGET = 4000 // hard cap to keep memory bounded

export const useSamples = create<SamplesState>((set, get) => ({
  samplesByTarget: {},
  alerts: [],
  windowMs: 10 * 60 * 1000,
  startedAt: Date.now(),
  setWindowMs: ms => set({ windowMs: ms }),
  clear: () => set({ samplesByTarget: {}, alerts: [], startedAt: Date.now() }),
  push: s => {
    const { samplesByTarget, alerts, windowMs } = get()
    const arr = samplesByTarget[s.targetId] ?? []
    const cutoff = s.t - windowMs
    let i = 0
    while (i < arr.length && arr[i].t < cutoff) i++
    const trimmed = i > 0 ? arr.slice(i) : arr.slice()
    trimmed.push(s)
    if (trimmed.length > MAX_PER_TARGET) trimmed.splice(0, trimmed.length - MAX_PER_TARGET)

    // Maintain a lightweight in-app alert log derived from the sample stream.
    const nextAlerts = alerts.slice()
    const prev = arr[arr.length - 1]
    const wasDown = (() => {
      const tail = arr.slice(-3)
      return tail.length === 3 && tail.every(x => x.rttMs === null)
    })()
    if (s.rttMs === null && (!prev || prev.rttMs !== null)) {
      nextAlerts.push({
        id: `${s.t}-loss`,
        t: s.t,
        kind: 'loss',
        targetId: s.targetId,
        message: 'Packet loss'
      })
    }
    const isDownNow = (() => {
      const tail = [...arr.slice(-2), s]
      return tail.length === 3 && tail.every(x => x.rttMs === null)
    })()
    if (isDownNow && !wasDown) {
      nextAlerts.push({
        id: `${s.t}-down`,
        t: s.t,
        kind: 'down',
        targetId: s.targetId,
        message: 'Connection down'
      })
    }
    if (wasDown && s.rttMs !== null) {
      nextAlerts.push({
        id: `${s.t}-rec`,
        t: s.t,
        kind: 'recovered',
        targetId: s.targetId,
        message: 'Recovered'
      })
    }
    // Cap alert log to last 200 entries
    if (nextAlerts.length > 200) nextAlerts.splice(0, nextAlerts.length - 200)

    set({
      samplesByTarget: { ...samplesByTarget, [s.targetId]: trimmed },
      alerts: nextAlerts
    })
  }
}))
