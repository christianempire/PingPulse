import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { platform } from 'node:os'
import { parsePingOutput } from './pingParser'
import type { PingSample, Target } from '@shared/types'

const IS_WIN = platform() === 'win32'
const TIMEOUT_MS = 2000

function buildArgs(host: string): string[] {
  if (IS_WIN) return ['-n', '1', '-w', String(TIMEOUT_MS), host]
  // BSD/Linux/macOS: -c 1 one packet; -W timeout (Linux seconds, BSD ms)
  const isMac = platform() === 'darwin'
  return isMac ? ['-c', '1', '-W', String(TIMEOUT_MS), host] : ['-c', '1', '-W', '2', host]
}

function runOnce(host: string): Promise<number | null> {
  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (rtt: number | null) => {
      if (settled) return
      settled = true
      resolve(rtt)
    }
    let child: ReturnType<typeof spawn>
    try {
      child = spawn('ping', buildArgs(host), { windowsHide: true })
    } catch {
      finish(null)
      return
    }
    child.stdout?.on('data', (b: Buffer) => (stdout += b.toString()))
    child.stderr?.on('data', (b: Buffer) => (stderr += b.toString()))
    child.on('error', () => finish(null))
    child.on('close', () => finish(parsePingOutput(stdout, stderr)))
    // Hard safety net — kill the process if ping itself hangs past timeout+1s
    setTimeout(() => {
      if (!settled) {
        try {
          child.kill()
        } catch {}
        finish(null)
      }
    }, TIMEOUT_MS + 1500).unref()
  })
}

type TargetRunner = {
  target: Target
  timer: NodeJS.Timeout | null
  inflight: boolean
}

export class PingEngine extends EventEmitter {
  private runners = new Map<string, TargetRunner>()
  private intervalMs = 1000
  private running = false

  setInterval(ms: number) {
    this.intervalMs = Math.max(200, Math.floor(ms))
    if (this.running) {
      // Reschedule each runner with the new interval
      for (const r of this.runners.values()) {
        if (r.timer) clearInterval(r.timer)
        r.timer = this.scheduleRunner(r)
      }
    }
  }

  setTargets(targets: Target[]) {
    const next = new Map(targets.map(t => [t.id, t] as const))
    // Remove stale
    for (const id of [...this.runners.keys()]) {
      if (!next.has(id)) {
        const r = this.runners.get(id)!
        if (r.timer) clearInterval(r.timer)
        this.runners.delete(id)
      }
    }
    // Add new
    for (const [id, target] of next) {
      if (!this.runners.has(id)) {
        const runner: TargetRunner = { target, timer: null, inflight: false }
        this.runners.set(id, runner)
        if (this.running) runner.timer = this.scheduleRunner(runner)
      } else {
        this.runners.get(id)!.target = target
      }
    }
  }

  start() {
    if (this.running) return
    this.running = true
    for (const r of this.runners.values()) {
      r.timer = this.scheduleRunner(r)
    }
  }

  stop() {
    if (!this.running) return
    this.running = false
    for (const r of this.runners.values()) {
      if (r.timer) clearInterval(r.timer)
      r.timer = null
    }
  }

  private scheduleRunner(r: TargetRunner): NodeJS.Timeout {
    // Kick off immediately, then every intervalMs
    this.tick(r)
    return setInterval(() => this.tick(r), this.intervalMs)
  }

  private async tick(r: TargetRunner) {
    if (r.inflight) return // backpressure: skip if previous ping still running
    r.inflight = true
    const t0 = Date.now()
    const rttMs = await runOnce(r.target.host)
    r.inflight = false
    const sample: PingSample = { targetId: r.target.id, t: t0, rttMs }
    this.emit('sample', sample)
  }
}
