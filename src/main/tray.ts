import { app, Tray, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { StatusColor } from '@shared/types'

let tray: Tray | null = null

// Resolve resources/icons in both dev and packaged. In dev, app.getAppPath()
// points at the project root; in packaged builds, extraResources copies the
// folder next to the exe under `process.resourcesPath`.
function iconsRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icons')
    : join(app.getAppPath(), 'resources', 'icons')
}

const iconCache = new Map<StatusColor, Electron.NativeImage>()

// Fallback BGRA renderer — used if the .ico files are missing (e.g. someone
// forgot to run `npm run build:icons`).
const FALLBACK_RGB: Record<StatusColor, [number, number, number]> = {
  green: [34, 214, 154],
  yellow: [240, 183, 43],
  orange: [255, 138, 71],
  red: [255, 93, 107],
  gray: [124, 132, 147]
}

function buildFallback(color: StatusColor): Electron.NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  const [r, g, b] = FALLBACK_RGB[color]
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

function loadIcon(color: StatusColor): Electron.NativeImage {
  const cached = iconCache.get(color)
  if (cached) return cached
  const path = join(iconsRoot(), `tray-${color}.ico`)
  const img = existsSync(path) ? nativeImage.createFromPath(path) : buildFallback(color)
  iconCache.set(color, img)
  return img
}

export interface TrayCallbacks {
  onShow: () => void
  onToggleMonitoring: () => void
  isMonitoring: () => boolean
  onQuit: () => void
}

export function ensureTray(cb: TrayCallbacks): Tray {
  if (tray) return tray
  tray = new Tray(loadIcon('gray'))
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
  tray.setImage(loadIcon(color))
  tray.setToolTip(tooltip)
}

export function destroyTray() {
  tray?.destroy()
  tray = null
}
