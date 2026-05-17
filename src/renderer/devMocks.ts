// Mock-data mode for the Claude Design redesign workflow.
//
// Activate with Ctrl+Shift+M (toggles localStorage + reload).
// When active, the renderer is fully populated without needing the ping engine:
// 4 targets, a 10-minute rolling history of samples, calibrated thresholds,
// a realistic event timeline (loss/down/recovered + derived spikes), and a
// live sample stream so the graph keeps animating during screen recording.

import type { Alert, PingSample, Settings, Target, PingPulseApi } from '@shared/types'
import type { EffectiveThresholds } from '@shared/baseline'
import { useSamples } from './state/samplesStore'

const STORAGE_KEY = 'pingpulse:mock'

export function isMockMode(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('mock') === '1') return true
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function toggleMockMode() {
  const next = isMockMode() ? '0' : '1'
  window.localStorage.setItem(STORAGE_KEY, next)
  window.location.reload()
}

// --- Mock fixture -----------------------------------------------------------

function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const NOW = Date.now()
const WINDOW_MIN = 10
const INTERVAL_MS = 1000
const SAMPLES = (WINDOW_MIN * 60_000) / INTERVAL_MS // 600

const TARGETS: Target[] = [
  { id: 'github.com', label: 'GitHub', host: 'github.com' },
  { id: '8.8.8.8', label: 'Google DNS', host: '8.8.8.8', builtin: true },
  { id: '1.1.1.1', label: 'Cloudflare DNS', host: '1.1.1.1', builtin: true },
  { id: '192.168.1.1', label: 'Local gateway', host: '192.168.1.1' }
]

interface Profile {
  baseRtt: number
  noise: number
  spikes: Array<{ at: number; mag: number; width?: number }>
  lossAt: number[]
  liveSpikeChance: number
  liveSpikeMag: number
  liveLossChance: number
}

const PROFILES: Record<string, Profile> = {
  'github.com': {
    baseRtt: 78, noise: 9,
    spikes: [
      { at: 80, mag: 110, width: 5 },
      { at: 215, mag: 90, width: 3 },
      { at: 470, mag: 220, width: 6 },
      { at: 555, mag: 140, width: 4 }
    ],
    lossAt: [180, 305, 360, 361, 362, 510],
    liveSpikeChance: 0.025,
    liveSpikeMag: 140,
    liveLossChance: 0.005
  },
  '8.8.8.8': {
    baseRtt: 22, noise: 4,
    spikes: [{ at: 140, mag: 50, width: 3 }],
    lossAt: [410],
    liveSpikeChance: 0.008,
    liveSpikeMag: 50,
    liveLossChance: 0.0015
  },
  '1.1.1.1': {
    baseRtt: 18, noise: 3,
    spikes: [],
    lossAt: [],
    liveSpikeChance: 0.004,
    liveSpikeMag: 35,
    liveLossChance: 0.0008
  },
  '192.168.1.1': {
    baseRtt: 2, noise: 1,
    spikes: [],
    lossAt: [],
    liveSpikeChance: 0,
    liveSpikeMag: 0,
    liveLossChance: 0
  }
}

function generateSamples(id: string, seedOffset: number): PingSample[] {
  const r = rng(0xc0ffee + seedOffset * 7919)
  const p = PROFILES[id]
  const start = NOW - WINDOW_MIN * 60_000
  const lossSet = new Set(p.lossAt)
  const out: PingSample[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const t = start + i * INTERVAL_MS
    if (lossSet.has(i)) {
      out.push({ targetId: id, t, rttMs: null })
      continue
    }
    let rtt = p.baseRtt + (r() - 0.5) * 2 * p.noise
    for (const s of p.spikes) {
      const w = s.width ?? 4
      const dist = Math.abs(i - s.at)
      if (dist < w) rtt += s.mag * Math.max(0, 1 - dist / w)
    }
    out.push({ targetId: id, t, rttMs: Math.max(1, rtt) })
  }
  return out
}

function buildAlerts(): Alert[] {
  const start = NOW - WINDOW_MIN * 60_000
  const at = (i: number) => start + i * INTERVAL_MS
  // Mirrors the loss/down/recovered cadence the real samplesStore.push would derive
  // from the github.com sample stream above. Spike events are derived live by the
  // EventTimeline component from the seeded samples — we don't include them here.
  return [
    { id: 'm-loss-180', t: at(180), kind: 'loss', targetId: 'github.com', message: 'Packet loss · GitHub' },
    { id: 'm-loss-305', t: at(305), kind: 'loss', targetId: 'github.com', message: 'Packet loss · GitHub' },
    { id: 'm-loss-360', t: at(360), kind: 'loss', targetId: 'github.com', message: 'Packet loss · GitHub' },
    { id: 'm-down-362', t: at(362), kind: 'down', targetId: 'github.com', message: 'Connection down · GitHub' },
    { id: 'm-rec-363',  t: at(363), kind: 'recovered', targetId: 'github.com', message: 'Recovered · GitHub' },
    { id: 'm-loss-410', t: at(410), kind: 'loss', targetId: '8.8.8.8', message: 'Packet loss · Google DNS' },
    { id: 'm-loss-510', t: at(510), kind: 'loss', targetId: 'github.com', message: 'Packet loss · GitHub' }
  ]
}

function buildSettings(): Settings {
  return {
    intervalMs: INTERVAL_MS,
    targets: TARGETS,
    activeTargetId: 'github.com',
    rollingWindowMin: WINDOW_MIN,
    latencyThresholdMs: 150,
    lossAlertEnabled: true,
    desktopNotifications: true,
    darkMode: true,
    compactMode: false,
    startMinimized: false,
    launchOnStartup: false,
    monitoring: true
  }
}

function buildThresholds(): Record<string, EffectiveThresholds> {
  const cal = (
    lat: [number, number, number],
    jit: [number, number, number],
    loss: [number, number, number],
    samples: number
  ): EffectiveThresholds => ({
    latency: { good: lat[0], ok: lat[1], bad: lat[2] },
    jitter: { good: jit[0], ok: jit[1], bad: jit[2] },
    lossPct: { good: loss[0], ok: loss[1], bad: loss[2] },
    calibrated: true,
    basis: 'baseline',
    samples
  })
  return {
    'github.com':   cal([110, 220, 380], [18, 40, 80], [1.2, 3.5, 7],   12010),
    '8.8.8.8':      cal([60,  120, 200], [10, 25, 50], [0.8, 2.5, 5.5], 12450),
    '1.1.1.1':      cal([60,  120, 200], [10, 25, 50], [0.5, 2.0, 5.0], 12420),
    '192.168.1.1':  cal([60,  120, 200], [10, 25, 50], [0.5, 2.0, 5.0], 12390)
  }
}

// --- Stub IPC API -----------------------------------------------------------

let liveTimer: number | null = null
let mockApiInstance: PingPulseApi | null = null

export function getMockApi(): PingPulseApi {
  if (!mockApiInstance) mockApiInstance = buildMockApi()
  return mockApiInstance
}

function buildMockApi(): PingPulseApi {
  const samplesByTarget: Record<string, PingSample[]> = {}
  TARGETS.forEach((t, i) => {
    samplesByTarget[t.id] = generateSamples(t.id, i)
  })

  // Seed the samples store directly — much cheaper than replaying 2 400 samples
  // through the IPC subscription path.
  useSamples.setState({
    samplesByTarget,
    alerts: buildAlerts(),
    startedAt: NOW - 12 * 60 * 1000
  })

  let currentSettings = buildSettings()
  const thresholdsMap = buildThresholds()

  const sampleListeners = new Set<(s: PingSample) => void>()
  const settingsListeners = new Set<(s: Settings) => void>()
  const thresholdsListeners = new Set<(m: Record<string, EffectiveThresholds>) => void>()

  const api: PingPulseApi = {
    getSettings: async () => currentSettings,
    setSettings: async patch => {
      currentSettings = { ...currentSettings, ...patch } as Settings
      settingsListeners.forEach(cb => cb(currentSettings))
      return currentSettings
    },
    setMonitoring: async on => {
      currentSettings = { ...currentSettings, monitoring: on }
      settingsListeners.forEach(cb => cb(currentSettings))
    },
    setCompact: async on => {
      currentSettings = { ...currentSettings, compactMode: on }
      settingsListeners.forEach(cb => cb(currentSettings))
      // The overlay is a separate BrowserWindow that only the main process can
      // create/destroy. Forward this one call to the real IPC so the overlay
      // window actually appears. The overlay's renderer reads the same
      // localStorage flag and will load its own mock fixture.
      try {
        await window.pingpulse?.setCompact(on)
      } catch {
        // No real IPC available (e.g. running outside Electron) — nothing to do.
      }
    },
    showMainWindow: async () => {},
    getThresholds: async () => thresholdsMap,
    isPackaged: async () => false,
    onSample: cb => {
      sampleListeners.add(cb)
      return () => { sampleListeners.delete(cb) }
    },
    onSettings: cb => {
      settingsListeners.add(cb)
      return () => { settingsListeners.delete(cb) }
    },
    onThresholds: cb => {
      thresholdsListeners.add(cb)
      return () => { thresholdsListeners.delete(cb) }
    }
  }

  // Live stream: one new sample per target per interval so the graph animates
  // and new events occasionally fire while CD is watching the screen recording.
  if (liveTimer) window.clearInterval(liveTimer)
  const liveRng = rng(0xa11ce)
  liveTimer = window.setInterval(() => {
    if (!currentSettings.monitoring) return
    const now = Date.now()
    for (const target of TARGETS) {
      const p = PROFILES[target.id]
      let rtt: number | null
      if (liveRng() < p.liveLossChance) {
        rtt = null
      } else {
        rtt = p.baseRtt + (liveRng() - 0.5) * 2 * p.noise
        if (p.liveSpikeChance > 0 && liveRng() < p.liveSpikeChance) {
          rtt += p.liveSpikeMag * (0.5 + liveRng() * 0.8)
        }
        rtt = Math.max(1, rtt)
      }
      const sample: PingSample = { targetId: target.id, t: now, rttMs: rtt }
      sampleListeners.forEach(cb => cb(sample))
    }
  }, currentSettings.intervalMs)

  return api
}
