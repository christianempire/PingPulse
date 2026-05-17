import type { PingSample, TargetStats } from '@shared/types'

export function computeStats(samples: PingSample[]): TargetStats {
  if (samples.length === 0) {
    return { current: null, avg: 0, min: 0, max: 0, jitter: 0, lossPct: 0, samples: 0 }
  }
  const oks = samples.filter(s => s.rttMs !== null).map(s => s.rttMs as number)
  const lossCount = samples.length - oks.length
  const lossPct = (lossCount / samples.length) * 100
  if (oks.length === 0) {
    return {
      current: null,
      avg: 0,
      min: 0,
      max: 0,
      jitter: 0,
      lossPct,
      samples: samples.length
    }
  }
  let sum = 0
  let min = Infinity
  let max = -Infinity
  for (const v of oks) {
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  const avg = sum / oks.length
  let jitterSum = 0
  for (let i = 1; i < oks.length; i++) jitterSum += Math.abs(oks[i] - oks[i - 1])
  const jitter = oks.length > 1 ? jitterSum / (oks.length - 1) : 0
  const last = samples[samples.length - 1]
  return {
    current: last.rttMs,
    avg,
    min,
    max,
    jitter,
    lossPct,
    samples: samples.length
  }
}
