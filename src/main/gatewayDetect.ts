import type { Target } from '@shared/types'

export async function detectGatewayTarget(): Promise<Target | null> {
  try {
    // @ts-expect-error -- default-gateway has no bundled types
    const mod: any = await import('default-gateway')
    const res = await (mod.gateway4async?.() ?? mod.v4?.())
    const gw = res?.gateway
    if (typeof gw === 'string' && gw.length > 0) {
      return { id: `gw:${gw}`, label: 'Local Gateway', host: gw, builtin: true }
    }
  } catch {
    // best-effort; ignore
  }
  return null
}
