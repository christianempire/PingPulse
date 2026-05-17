import Store from 'electron-store'
import { DEFAULT_SETTINGS, DEFAULT_TARGETS } from '@shared/thresholds'
import type { Settings, Target } from '@shared/types'

const store = new Store<{ settings: Settings }>({
  name: 'pingpulse-settings'
})

function makeDefault(): Settings {
  const targets: Target[] = [...DEFAULT_TARGETS]
  return {
    ...DEFAULT_SETTINGS,
    targets,
    activeTargetId: targets[0]?.id ?? null
  }
}

export function loadSettings(): Settings {
  const existing = store.get('settings') as Settings | undefined
  if (!existing) {
    const fresh = makeDefault()
    store.set('settings', fresh)
    return fresh
  }
  // Merge to backfill new fields if the schema grows
  return { ...makeDefault(), ...existing, targets: existing.targets ?? makeDefault().targets }
}

export function saveSettings(s: Settings) {
  store.set('settings', s)
}

export function mergeSettings(patch: Partial<Settings>): Settings {
  const next: Settings = { ...loadSettings(), ...patch }
  saveSettings(next)
  return next
}
