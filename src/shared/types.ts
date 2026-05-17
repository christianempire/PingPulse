export type TargetId = string

export interface Target {
  id: TargetId
  label: string
  host: string
  builtin?: boolean
}

export interface PingSample {
  targetId: TargetId
  t: number
  rttMs: number | null
}

export type StatusColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray'

export interface TargetStats {
  current: number | null
  avg: number
  min: number
  max: number
  jitter: number
  lossPct: number
  samples: number
}

export type AlertKind = 'spike' | 'loss' | 'down' | 'recovered'

export interface Alert {
  id: string
  t: number
  kind: AlertKind
  targetId: TargetId
  message: string
}

export interface Settings {
  intervalMs: number
  targets: Target[]
  activeTargetId: TargetId | null
  rollingWindowMin: number
  latencyThresholdMs: number
  lossAlertEnabled: boolean
  desktopNotifications: boolean
  darkMode: boolean
  compactMode: boolean
  startMinimized: boolean
  launchOnStartup: boolean
  monitoring: boolean
}

export interface HealthScore {
  score: number
  breakdown: {
    latency: number
    jitter: number
    loss: number
    spikes: number
  }
}

export interface PingPulseApi {
  getSettings: () => Promise<Settings>
  setSettings: (patch: Partial<Settings>) => Promise<Settings>
  setMonitoring: (on: boolean) => Promise<void>
  setCompact: (on: boolean) => Promise<void>
  showMainWindow: () => Promise<void>
  getThresholds: () => Promise<Record<TargetId, import('./baseline').EffectiveThresholds>>
  isPackaged: () => Promise<boolean>
  onSample: (cb: (s: PingSample) => void) => () => void
  onSettings: (cb: (s: Settings) => void) => () => void
  onThresholds: (cb: (m: Record<TargetId, import('./baseline').EffectiveThresholds>) => void) => () => void
}

declare global {
  interface Window {
    pingpulse: PingPulseApi
  }
}
