import Store from 'electron-store'
import {
  applySample,
  decayIfFull,
  deriveThresholds,
  emptyBaseline,
  type EffectiveThresholds,
  type SeedThresholds,
  type TargetBaseline
} from '@shared/baseline'
import { DEFAULT_THRESHOLDS } from '@shared/thresholds'
import type { PingSample, TargetId } from '@shared/types'

interface StoreShape {
  baselines: Record<TargetId, TargetBaseline>
}

const store = new Store<StoreShape>({ name: 'pingpulse-baseline' })

// Persistence is throttled so we don't write JSON to disk on every ping.
const PERSIST_THROTTLE_MS = 5_000

class BaselineStore {
  private baselines = new Map<TargetId, TargetBaseline>()
  private persistTimer: NodeJS.Timeout | null = null

  constructor() {
    const raw = (store.get('baselines') as Record<TargetId, TargetBaseline> | undefined) ?? {}
    for (const [id, b] of Object.entries(raw)) {
      // Defensive: ensure bucket array is present and correctly sized
      const bucketsOk = Array.isArray(b.buckets) && b.buckets.length > 0
      this.baselines.set(id, bucketsOk ? b : emptyBaseline(id))
    }
  }

  onSample(s: PingSample) {
    let b = this.baselines.get(s.targetId) ?? emptyBaseline(s.targetId)
    b = applySample(b, s.rttMs, s.t)
    b = decayIfFull(b)
    this.baselines.set(s.targetId, b)
    this.schedulePersist()
  }

  pruneTo(activeIds: ReadonlySet<TargetId>) {
    for (const id of [...this.baselines.keys()]) {
      if (!activeIds.has(id)) this.baselines.delete(id)
    }
    this.schedulePersist()
  }

  getThresholdsFor(targetId: TargetId, seed: SeedThresholds = DEFAULT_THRESHOLDS): EffectiveThresholds {
    return deriveThresholds(this.baselines.get(targetId) ?? null, seed)
  }

  getAllThresholds(activeIds: ReadonlyArray<TargetId>, seed: SeedThresholds = DEFAULT_THRESHOLDS): Record<TargetId, EffectiveThresholds> {
    const out: Record<TargetId, EffectiveThresholds> = {}
    for (const id of activeIds) out[id] = this.getThresholdsFor(id, seed)
    return out
  }

  private schedulePersist() {
    if (this.persistTimer) return
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      const obj: Record<TargetId, TargetBaseline> = {}
      for (const [id, b] of this.baselines) obj[id] = b
      store.set('baselines', obj)
    }, PERSIST_THROTTLE_MS)
    this.persistTimer.unref()
  }

  flush() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    const obj: Record<TargetId, TargetBaseline> = {}
    for (const [id, b] of this.baselines) obj[id] = b
    store.set('baselines', obj)
  }
}

export const baselineStore = new BaselineStore()
