import { Notification } from 'electron'
import type { AlertKind } from '@shared/types'

const DEBOUNCE_MS: Record<AlertKind, number> = {
  spike: 30_000,
  loss: 30_000,
  down: 15_000,
  recovered: 5_000
}

const lastFired = new Map<string, number>()

export function notify(kind: AlertKind, title: string, body: string, enabled: boolean) {
  if (!enabled) return
  if (!Notification.isSupported()) return
  const key = `${kind}`
  const now = Date.now()
  const prev = lastFired.get(key) ?? 0
  if (now - prev < DEBOUNCE_MS[kind]) return
  lastFired.set(key, now)
  try {
    new Notification({ title, body, silent: false }).show()
  } catch {
    // ignore — degrade to in-app alerts only
  }
}
