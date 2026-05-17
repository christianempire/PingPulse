// Health score 0..100.
//
// The *weights* below are fixed first-pass values (loss > jitter > latency > spikes).
// The *thresholds* used to interpret those signals are personal-baseline-driven —
// see src/shared/baseline.ts. That separation means the score should adapt to
// each user's network without anyone having to tune numbers per install.

import type { EffectiveThresholds } from '@shared/baseline'
import type { HealthScore, PingSample } from '@shared/types'

const WEIGHTS = {
  loss: 50,
  jitter: 20,
  latency: 20,
  spikes: 10
}

export function computeHealthScore(
  samples: PingSample[],
  thresholds: EffectiveThresholds,
  spikeThresholdMs: number
): HealthScore {
  if (samples.length === 0) {
    return { score: 100, breakdown: { latency: 0, jitter: 0, loss: 0, spikes: 0 } }
  }
  const total = samples.length
  const oks = samples.filter(s => s.rttMs !== null).map(s => s.rttMs as number)
  const lossCount = total - oks.length

  // Loss penalty: scaled against the calibrated "bad" loss% threshold.
  const lossPct = (lossCount / total) * 100
  const lossPenalty = Math.min(1, lossPct / Math.max(0.5, thresholds.lossPct.bad)) * WEIGHTS.loss

  // Latency penalty: how the rolling avg sits relative to the "ok" and "bad" thresholds.
  let latencyPenalty = 0
  if (oks.length > 0) {
    const avg = oks.reduce((a, b) => a + b, 0) / oks.length
    const span = Math.max(1, thresholds.latency.bad - thresholds.latency.ok)
    const ratio = Math.max(0, (avg - thresholds.latency.ok) / span)
    latencyPenalty = Math.min(1, ratio) * WEIGHTS.latency
  }

  // Jitter penalty: mean abs diff vs calibrated "bad" jitter.
  let jitter = 0
  for (let i = 1; i < oks.length; i++) jitter += Math.abs(oks[i] - oks[i - 1])
  jitter = oks.length > 1 ? jitter / (oks.length - 1) : 0
  const jitterPenalty = Math.min(1, jitter / Math.max(1, thresholds.jitter.bad)) * WEIGHTS.jitter

  // Spikes: samples >= the user's explicit spike threshold (from Settings),
  // measured over the recent half of the window.
  const recentSlice = samples.slice(-Math.max(20, Math.floor(samples.length / 2)))
  const spikeCount = recentSlice.filter(s => (s.rttMs ?? 0) >= spikeThresholdMs).length
  const spikePenalty = Math.min(1, spikeCount / Math.max(5, recentSlice.length * 0.3)) * WEIGHTS.spikes

  const totalPenalty = lossPenalty + latencyPenalty + jitterPenalty + spikePenalty
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)))
  return {
    score,
    breakdown: {
      latency: Math.round(latencyPenalty),
      jitter: Math.round(jitterPenalty),
      loss: Math.round(lossPenalty),
      spikes: Math.round(spikePenalty)
    }
  }
}
