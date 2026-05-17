import { create } from 'zustand'
import type { Settings } from '@shared/types'
import { pingpulse } from '../api'

interface SettingsState {
  settings: Settings | null
  setSettings: (s: Settings) => void
  patch: (p: Partial<Settings>) => Promise<void>
  setMonitoring: (on: boolean) => Promise<void>
  setCompact: (on: boolean) => Promise<void>
}

export const useSettings = create<SettingsState>(set => ({
  settings: null,
  setSettings: s => set({ settings: s }),
  patch: async p => {
    const next = await pingpulse.setSettings(p)
    set({ settings: next })
  },
  setMonitoring: async on => {
    await pingpulse.setMonitoring(on)
  },
  setCompact: async on => {
    await pingpulse.setCompact(on)
  }
}))
