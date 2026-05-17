import type { StatusColor } from './types'

export const DEFAULT_THRESHOLDS = {
  latency: { good: 60, ok: 120, bad: 200 },
  jitter: { good: 10, ok: 25, bad: 50 },
  lossPct: { good: 0.5, ok: 2, bad: 5 }
}

export const STATUS_COLOR_HEX: Record<StatusColor, string> = {
  green: '#22D69A',
  yellow: '#F0B72B',
  orange: '#FF8A47',
  red: '#FF5D6B',
  gray: '#7C8493'
}

export const STATUS_GLOW_RGB: Record<StatusColor, string> = {
  green: '34 214 154',
  yellow: '240 183 43',
  orange: '255 138 71',
  red: '255 93 107',
  gray: '124 132 147'
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
