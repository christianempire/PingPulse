import { app, BrowserWindow, ipcMain, shell, screen, nativeImage } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { PingEngine } from './pingEngine'
import { loadSettings, mergeSettings } from './settingsStore'
import { detectGatewayTarget } from './gatewayDetect'
import { ensureTray, refreshMenu, updateTrayStatus, destroyTray } from './tray'
import { notify } from './notifications'
import { baselineStore } from './baselineStore'
import { IPC } from '@shared/ipc'
import type { PingSample, Settings, StatusColor, Target } from '@shared/types'
import type { EffectiveThresholds } from '@shared/baseline'

const LAUNCH_HIDDEN = process.argv.includes('--hidden')

function appIconPath(): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, 'icons')
    : join(app.getAppPath(), 'resources', 'icons')
  return join(base, 'app.ico')
}

function appIcon(): Electron.NativeImage | undefined {
  const p = appIconPath()
  return existsSync(p) ? nativeImage.createFromPath(p) : undefined
}

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let engine: PingEngine | null = null
let settings: Settings = loadSettings()

const RECENT_LIMIT = 60
const recent = new Map<string, PingSample[]>()

function pushRecent(s: PingSample) {
  let arr = recent.get(s.targetId)
  if (!arr) {
    arr = []
    recent.set(s.targetId, arr)
  }
  arr.push(s)
  if (arr.length > RECENT_LIMIT) arr.shift()
}

function statsForActive(): { color: StatusColor; tooltip: string } {
  const id = settings.activeTargetId
  if (!id) return { color: 'gray', tooltip: 'PingPulse — no target' }
  const arr = recent.get(id) ?? []
  if (arr.length === 0) return { color: 'gray', tooltip: 'PingPulse — waiting…' }
  const t = baselineStore.getThresholdsFor(id)
  const last = arr[arr.length - 1]
  const lossCount = arr.filter(s => s.rttMs === null).length
  const lossPct = (lossCount / arr.length) * 100
  let color: StatusColor = 'green'
  if (last.rttMs === null || lossPct >= t.lossPct.bad) color = 'red'
  else if (lossPct >= t.lossPct.ok || (last.rttMs ?? 0) >= t.latency.bad) color = 'orange'
  else if (lossPct >= t.lossPct.good || (last.rttMs ?? 0) >= t.latency.ok) color = 'yellow'
  const tooltip = `PingPulse — ${last.rttMs === null ? 'timeout' : `${Math.round(last.rttMs)} ms`} · ${lossPct.toFixed(1)}% loss`
  return { color, tooltip }
}

// --- Alert detection ----------------------------------------------------------
const downSince = new Map<string, number>()

function evaluateAlerts(s: PingSample) {
  const arr = recent.get(s.targetId) ?? []
  if (s.rttMs !== null && s.rttMs >= settings.latencyThresholdMs) {
    notify(
      'spike',
      'PingPulse — Latency spike',
      `${labelFor(s.targetId)}: ${Math.round(s.rttMs)} ms (>= ${settings.latencyThresholdMs} ms)`,
      settings.desktopNotifications
    )
  }
  if (s.rttMs === null && settings.lossAlertEnabled) {
    notify('loss', 'PingPulse — Packet loss', `${labelFor(s.targetId)} dropped a packet`, settings.desktopNotifications)
  }
  const tail = arr.slice(-3)
  const allDown = tail.length === 3 && tail.every(x => x.rttMs === null)
  if (allDown && !downSince.has(s.targetId)) {
    downSince.set(s.targetId, Date.now())
    notify('down', 'PingPulse — Connection down', `${labelFor(s.targetId)} has stopped responding`, settings.desktopNotifications)
  } else if (s.rttMs !== null && downSince.has(s.targetId)) {
    const t0 = downSince.get(s.targetId)!
    downSince.delete(s.targetId)
    const secs = Math.round((Date.now() - t0) / 1000)
    notify('recovered', 'PingPulse — Recovered', `${labelFor(s.targetId)} is back (down ${secs}s)`, settings.desktopNotifications)
  }
}

function labelFor(id: string): string {
  return settings.targets.find(t => t.id === id)?.label ?? id
}

// --- Thresholds broadcast ----------------------------------------------------
const THRESHOLDS_BROADCAST_THROTTLE_MS = 4_000
let thresholdsTimer: NodeJS.Timeout | null = null

function buildThresholdsMap(): Record<string, EffectiveThresholds> {
  return baselineStore.getAllThresholds(settings.targets.map(t => t.id))
}

function scheduleThresholdsBroadcast() {
  if (thresholdsTimer) return
  thresholdsTimer = setTimeout(() => {
    thresholdsTimer = null
    broadcast(IPC.thresholds, buildThresholdsMap())
  }, THRESHOLDS_BROADCAST_THROTTLE_MS)
  thresholdsTimer.unref()
}

// --- Window creation ----------------------------------------------------------
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return
  }
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 540,
    show: !settings.startMinimized && !LAUNCH_HIDDEN,
    backgroundColor: '#07090f',
    frame: false,
    autoHideMenuBar: true,
    icon: appIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  mainWindow.on('close', e => {
    if (!(app as any).isQuiting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
  const broadcastMaximized = () => {
    if (!mainWindow) return
    broadcast(IPC.maximized, mainWindow.isMaximized())
  }
  mainWindow.on('maximize', broadcastMaximized)
  mainWindow.on('unmaximize', broadcastMaximized)
  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/index.html')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show()
    return
  }
  const display = screen.getPrimaryDisplay().workArea
  overlayWindow = new BrowserWindow({
    width: 280,
    height: 116,
    x: display.x + display.width - 300,
    y: display.y + 20,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true,
    backgroundColor: '#00000000',
    icon: appIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  if (process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/index.html?overlay=1')
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), { search: 'overlay=1' })
  }
}

function destroyOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy()
  overlayWindow = null
}

function broadcast(channel: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}

// --- Engine wiring ------------------------------------------------------------
function applyEngineFromSettings() {
  if (!engine) return
  engine.setInterval(settings.intervalMs)
  engine.setTargets(settings.targets)
  if (settings.monitoring) engine.start()
  else engine.stop()
  // Drop baseline data for removed targets
  baselineStore.pruneTo(new Set(settings.targets.map(t => t.id)))
}

// --- Login item (autostart) ---------------------------------------------------
function applyLoginItem() {
  if (!app.isPackaged) return // dev exe path would not survive a rebuild
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.launchOnStartup,
      args: ['--hidden']
    })
  } catch {
    // Best-effort: not all platforms / sandboxes support this
  }
}

function refreshTray() {
  refreshMenu({
    onShow: () => createMainWindow(),
    onToggleMonitoring: () => {
      settings = mergeSettings({ monitoring: !settings.monitoring })
      applyEngineFromSettings()
      broadcast(IPC.settings, settings)
      refreshTray()
    },
    isMonitoring: () => settings.monitoring,
    onQuit: () => {
      ;(app as any).isQuiting = true
      app.quit()
    }
  })
}

// --- App lifecycle ------------------------------------------------------------
// Single-instance lock — if a second instance is launched (e.g. from autostart
// after the user already opened the app manually), focus the existing window
// instead of creating a second app.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createMainWindow()
  })
}

app.whenReady().then(async () => {
  // Match build.appId — ensures Windows groups taskbar entries under our app
  // and uses our icon for native notifications.
  if (process.platform === 'win32') app.setAppUserModelId('com.pingpulse.app')

  const gw = await detectGatewayTarget()
  if (gw && !settings.targets.some(t => t.host === gw.host)) {
    settings = mergeSettings({ targets: [...settings.targets, gw] })
  }
  applyLoginItem()

  engine = new PingEngine()
  engine.on('sample', (s: PingSample) => {
    pushRecent(s)
    baselineStore.onSample(s)
    evaluateAlerts(s)
    broadcast(IPC.sample, s)
    if (s.targetId === settings.activeTargetId) {
      const { color, tooltip } = statsForActive()
      updateTrayStatus(color, tooltip)
    }
    scheduleThresholdsBroadcast()
  })
  applyEngineFromSettings()

  ensureTray({
    onShow: () => createMainWindow(),
    onToggleMonitoring: () => {
      settings = mergeSettings({ monitoring: !settings.monitoring })
      applyEngineFromSettings()
      broadcast(IPC.settings, settings)
      refreshTray()
    },
    isMonitoring: () => settings.monitoring,
    onQuit: () => {
      ;(app as any).isQuiting = true
      app.quit()
    }
  })
  refreshTray()

  ipcMain.handle(IPC.getSettings, () => settings)
  ipcMain.handle(IPC.setSettings, (_e, patch: Partial<Settings>) => {
    if (patch.targets) {
      const seen = new Set<string>()
      patch.targets = patch.targets.filter((t: Target) => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
    }
    const launchChanged =
      typeof patch.launchOnStartup === 'boolean' && patch.launchOnStartup !== settings.launchOnStartup
    settings = mergeSettings(patch)
    applyEngineFromSettings()
    broadcast(IPC.settings, settings)
    broadcast(IPC.thresholds, buildThresholdsMap())
    if (typeof patch.compactMode === 'boolean') {
      if (patch.compactMode) createOverlayWindow()
      else destroyOverlayWindow()
    }
    if (launchChanged) applyLoginItem()
    refreshTray()
    return settings
  })
  ipcMain.handle(IPC.setMonitoring, (_e, on: boolean) => {
    settings = mergeSettings({ monitoring: on })
    applyEngineFromSettings()
    broadcast(IPC.settings, settings)
    refreshTray()
  })
  ipcMain.handle(IPC.setCompact, (_e, on: boolean) => {
    settings = mergeSettings({ compactMode: on })
    if (on) createOverlayWindow()
    else destroyOverlayWindow()
    broadcast(IPC.settings, settings)
  })
  ipcMain.handle(IPC.showMain, () => createMainWindow())
  ipcMain.handle(IPC.getThresholds, () => buildThresholdsMap())
  ipcMain.handle(IPC.isPackaged, () => app.isPackaged)
  ipcMain.handle(IPC.windowMinimize, () => mainWindow?.minimize())
  ipcMain.handle(IPC.windowMaximizeToggle, () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle(IPC.windowClose, () => mainWindow?.close())
  ipcMain.handle(IPC.windowIsMaximized, () => mainWindow?.isMaximized() ?? false)

  if (!LAUNCH_HIDDEN && !settings.startMinimized) createMainWindow()
  if (settings.compactMode) createOverlayWindow()

  // Seed thresholds shortly after boot so the renderer doesn't have to wait
  // for the first throttled broadcast.
  setTimeout(() => broadcast(IPC.thresholds, buildThresholdsMap()), 500).unref()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('before-quit', () => {
  ;(app as any).isQuiting = true
  engine?.stop()
  baselineStore.flush()
  destroyTray()
})

app.on('window-all-closed', () => {
  // Keep alive in tray; don't quit
})

