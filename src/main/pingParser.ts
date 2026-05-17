// Parses the stdout of a single `ping -n 1 <host>` invocation across Windows,
// macOS, and Linux. Returns the round-trip time in ms, or null on timeout /
// unreachable / parse failure.

const TIME_RE = /time[=<]\s*([\d.]+)\s*ms/i
const TIMEOUT_HINTS = [
  'request timed out',
  'destination host unreachable',
  'destination net unreachable',
  '100% packet loss',
  '100.0% packet loss',
  'general failure',
  'transmit failed'
]

export function parsePingOutput(stdout: string, stderr = ''): number | null {
  const haystack = (stdout + '\n' + stderr).toLowerCase()
  if (TIMEOUT_HINTS.some(h => haystack.includes(h))) return null
  const m = stdout.match(TIME_RE)
  if (!m) return null
  const rtt = Number(m[1])
  if (!Number.isFinite(rtt) || rtt < 0) return null
  return rtt
}
