import type { EffectiveThresholds } from '@shared/baseline'
import type { StatusColor, TargetStats } from '@shared/types'

export function statusFromStats(stats: TargetStats, t: EffectiveThresholds): StatusColor {
  if (stats.samples === 0) return 'gray'
  if (stats.lossPct >= t.lossPct.bad || stats.current === null) return 'red'
  if (stats.lossPct >= t.lossPct.ok || stats.avg >= t.latency.bad || stats.jitter >= t.jitter.bad) return 'orange'
  if (stats.lossPct >= t.lossPct.good || stats.avg >= t.latency.ok || stats.jitter >= t.jitter.ok) return 'yellow'
  return 'green'
}
