import type { StatusColor } from './types'

export const DEFAULT_THRESHOLDS = {
  latency: { good: 60, ok: 120, bad: 200 },
  jitter: { good: 10, ok: 25, bad: 50 },
  lossPct: { good: 0.5, ok: 2, bad: 5 }
}

export const STATUS_COLOR_HEX: Record<StatusColor, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#6b7280'
}

export const STATUS_LABEL: Record<StatusColor, string> = {
  green: 'Stable',
  yellow: 'Elevated',
  orange: 'Unstable',
  red: 'Critical',
  gray: 'Idle'
}

export const DEFAULT_TARGETS = [
  { id: '8.8.8.8', label: 'Google DNS', host: '8.8.8.8', builtin: true },
  { id: '1.1.1.1', label: 'Cloudflare DNS', host: '1.1.1.1', builtin: true }
]

export const DEFAULT_SETTINGS = {
  intervalMs: 1000,
  rollingWindowMin: 10,
  latencyThresholdMs: 150,
  lossAlertEnabled: true,
  desktopNotifications: true,
  darkMode: true,
  compactMode: false,
  startMinimized: false,
  launchOnStartup: false,
  monitoring: true
}
