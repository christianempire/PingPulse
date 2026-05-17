// Per-target baseline of "what's normal on this connection".
//
// This is what makes PingPulse self-calibrating: instead of hard-coding what
// "bad" looks like (e.g. "200 ms is bad"), we learn the user's own typical
// latency / jitter / loss and derive thresholds as multiples of that baseline.
// The seed thresholds in shared/thresholds.ts act as a floor — we never claim
// a connection is "great" at 600 ms even if that's the user's median.

import type { TargetId } from './types'

// 200 buckets × 5 ms = 0..1000 ms. Anything >= 1000 ms goes in the last bucket.
export const BUCKET_COUNT = 200
export const BUCKET_WIDTH_MS = 5

export const MIN_SAMPLES_FOR_CALIBRATION = 500

export interface TargetBaseline {
  targetId: TargetId
  buckets: number[]           // RTT histogram (successful pings only)
  ok: number                  // count of successful samples in baseline
  loss: number                // count of timeouts in baseline
  meanJitter: number          // EMA of |rtt[i] - rtt[i-1]|
  lastRtt: number | null      // for incremental jitter calculation
  lastUpdated: number         // epoch ms
}

export interface EffectiveThresholds {
  latency: { good: number; ok: number; bad: number }
  jitter: { good: number; ok: number; bad: number }
  lossPct: { good: number; ok: number; bad: number }
  calibrated: boolean
  basis: 'seed' | 'baseline'
  samples: number             // ok + loss count contributing to baseline
}

export interface SeedThresholds {
  latency: { good: number; ok: number; bad: number }
  jitter: { good: number; ok: number; bad: number }
  lossPct: { good: number; ok: number; bad: number }
}

export function emptyBaseline(targetId: TargetId): TargetBaseline {
  return {
    targetId,
    buckets: new Array(BUCKET_COUNT).fill(0),
    ok: 0,
    loss: 0,
    meanJitter: 0,
    lastRtt: null,
    lastUpdated: 0
  }
}

// Returns the bucket index for a given RTT (clamped to last bucket).
function bucketFor(rttMs: number): number {
  if (rttMs <= 0) return 0
  const idx = Math.floor(rttMs / BUCKET_WIDTH_MS)
  return idx >= BUCKET_COUNT ? BUCKET_COUNT - 1 : idx
}

// Pure update: returns a new baseline reflecting one more sample.
// Caller may also call decayIfFull() periodically.
export function applySample(b: TargetBaseline, rttMs: number | null, t: number): TargetBaseline {
  if (rttMs === null) {
    return { ...b, loss: b.loss + 1, lastUpdated: t, lastRtt: null }
  }
  const buckets = b.buckets.slice()
  buckets[bucketFor(rttMs)] += 1
  // EMA jitter — alpha tuned so a fresh baseline reaches steady-state in
  // a few hundred samples but doesn't react sharply to a single spike.
  let meanJitter = b.meanJitter
  if (b.lastRtt !== null) {
    const diff = Math.abs(rttMs - b.lastRtt)
    const alpha = 0.01
    meanJitter = b.meanJitter === 0 ? diff : b.meanJitter * (1 - alpha) + diff * alpha
  }
  return {
    ...b,
    buckets,
    ok: b.ok + 1,
    meanJitter,
    lastRtt: rttMs,
    lastUpdated: t
  }
}

// Hard cap. Once the baseline is "full", decay every bucket by half so the
// distribution slowly adapts to a network that's actually changed.
const DECAY_AT = 50_000
const DECAY_FACTOR = 0.5

export function decayIfFull(b: TargetBaseline): TargetBaseline {
  if (b.ok + b.loss < DECAY_AT) return b
  const buckets = b.buckets.map(v => Math.floor(v * DECAY_FACTOR))
  return {
    ...b,
    buckets,
    ok: Math.floor(b.ok * DECAY_FACTOR),
    loss: Math.floor(b.loss * DECAY_FACTOR)
  }
}

function percentile(buckets: number[], total: number, p: number): number {
  if (total === 0) return 0
  const target = total * p
  let cum = 0
  for (let i = 0; i < buckets.length; i++) {
    cum += buckets[i]
    if (cum >= target) return i * BUCKET_WIDTH_MS + BUCKET_WIDTH_MS / 2
  }
  return (buckets.length - 1) * BUCKET_WIDTH_MS
}

export function deriveThresholds(b: TargetBaseline | null, seed: SeedThresholds): EffectiveThresholds {
  const samples = b ? b.ok + b.loss : 0
  if (!b || samples < MIN_SAMPLES_FOR_CALIBRATION) {
    return {
      latency: { ...seed.latency },
      jitter: { ...seed.jitter },
      lossPct: { ...seed.lossPct },
      calibrated: false,
      basis: 'seed',
      samples
    }
  }
  const p50 = percentile(b.buckets, b.ok, 0.5)
  const p95 = percentile(b.buckets, b.ok, 0.95)
  const lossPct = (b.loss / samples) * 100

  return {
    latency: {
      good: Math.max(seed.latency.good, Math.round(p50 * 1.5)),
      ok: Math.max(seed.latency.ok, Math.round(Math.max(p95 * 1.2, p50 * 2.5))),
      bad: Math.max(seed.latency.bad, Math.round(Math.max(p95 * 2, p50 * 4)))
    },
    jitter: {
      good: Math.max(seed.jitter.good, Math.round(b.meanJitter * 2)),
      ok: Math.max(seed.jitter.ok, Math.round(b.meanJitter * 4)),
      bad: Math.max(seed.jitter.bad, Math.round(b.meanJitter * 8))
    },
    lossPct: {
      good: Math.max(seed.lossPct.good, +(lossPct + 0.5).toFixed(2)),
      ok: Math.max(seed.lossPct.ok, +(lossPct + 2).toFixed(2)),
      bad: Math.max(seed.lossPct.bad, +(lossPct + 5).toFixed(2))
    },
    calibrated: true,
    basis: 'baseline',
    samples
  }
}
