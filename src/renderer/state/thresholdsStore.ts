import { create } from 'zustand'
import type { EffectiveThresholds } from '@shared/baseline'
import type { TargetId } from '@shared/types'
import { DEFAULT_THRESHOLDS } from '@shared/thresholds'

const SEED: EffectiveThresholds = {
  latency: { ...DEFAULT_THRESHOLDS.latency },
  jitter: { ...DEFAULT_THRESHOLDS.jitter },
  lossPct: { ...DEFAULT_THRESHOLDS.lossPct },
  calibrated: false,
  basis: 'seed',
  samples: 0
}

interface ThresholdsState {
  map: Record<TargetId, EffectiveThresholds>
  setAll: (m: Record<TargetId, EffectiveThresholds>) => void
}

export const useThresholds = create<ThresholdsState>(set => ({
  map: {},
  setAll: m => set({ map: m })
}))

export const SEED_THRESHOLDS = SEED

export function selectThresholds(id: TargetId | null) {
  return (state: ThresholdsState): EffectiveThresholds =>
    (id && state.map[id]) || SEED
}
