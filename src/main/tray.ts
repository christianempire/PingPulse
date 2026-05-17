import { Tray, Menu, nativeImage } from 'electron'
import type { StatusColor } from '@shared/types'

let tray: Tray | null = null

const COLOR_RGB: Record<StatusColor, [number, number, number]> = {
  green: [34, 197, 94],
  yellow: [234, 179, 8],
  orange: [249, 115, 22],
  red: [239, 68, 68],
  gray: [107, 114, 128]
}

// Builds a 16x16 BGRA bitmap (Electron's createFromBitmap expects BGRA on Win/Linux)
// containing a soft-edged colored disc on a transparent background.
function buildIcon(color: StatusColor): Electron.NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  const [r, g, b] = COLOR_RGB[color]
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const radius = 6
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const edge = Math.max(0, Math.min(1, radius - dist))
      const alpha = Math.round(edge * 255)
      const i = (y * size + x) * 4
      buf[i] = b
      buf[i + 1] = g
      buf[i + 2] = r
      buf[i + 3] = alpha
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

export interface TrayCallbacks {
  onShow: () => void
  onToggleMonitoring: () => void
  isMonitoring: () => boolean
  onQuit: () => void
}

export function ensureTray(cb: TrayCallbacks): Tray {
  if (tray) return tray
  tray = new Tray(buildIcon('gray'))
  tray.setToolTip('PingPulse')
  refreshMenu(cb)
  tray.on('click', cb.onShow)
  return tray
}

export function refreshMenu(cb: TrayCallbacks) {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: 'Show PingPulse', click: cb.onShow },
    {
      label: cb.isMonitoring() ? 'Pause Monitoring' : 'Resume Monitoring',
      click: cb.onToggleMonitoring
    },
    { type: 'separator' },
    { label: 'Quit', click: cb.onQuit }
  ])
  tray.setContextMenu(menu)
}

export function updateTrayStatus(color: StatusColor, tooltip: string) {
  if (!tray) return
  tray.setImage(buildIcon(color))
  tray.setToolTip(tooltip)
}

export function destroyTray() {
  tray?.destroy()
  tray = null
}

