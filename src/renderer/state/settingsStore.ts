import { create } from 'zustand'
import type { Settings } from '@shared/types'

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
    const next = await window.pingpulse.setSettings(p)
    set({ settings: next })
  },
  setMonitoring: async on => {
    await window.pingpulse.setMonitoring(on)
  },
  setCompact: async on => {
    await window.pingpulse.setCompact(on)
  }
}))
