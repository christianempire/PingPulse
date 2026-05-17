import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc'
import type { EffectiveThresholds } from '@shared/baseline'
import type { PingPulseApi, PingSample, Settings, TargetId } from '@shared/types'

const api: PingPulseApi = {
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  setSettings: patch => ipcRenderer.invoke(IPC.setSettings, patch),
  setMonitoring: on => ipcRenderer.invoke(IPC.setMonitoring, on),
  setCompact: on => ipcRenderer.invoke(IPC.setCompact, on),
  showMainWindow: () => ipcRenderer.invoke(IPC.showMain),
  getThresholds: () => ipcRenderer.invoke(IPC.getThresholds),
  isPackaged: () => ipcRenderer.invoke(IPC.isPackaged),
  windowMinimize: () => ipcRenderer.invoke(IPC.windowMinimize),
  windowMaximizeToggle: () => ipcRenderer.invoke(IPC.windowMaximizeToggle),
  windowClose: () => ipcRenderer.invoke(IPC.windowClose),
  windowIsMaximized: () => ipcRenderer.invoke(IPC.windowIsMaximized),
  onSample: cb => {
    const handler = (_e: Electron.IpcRendererEvent, s: PingSample) => cb(s)
    ipcRenderer.on(IPC.sample, handler)
    return () => ipcRenderer.removeListener(IPC.sample, handler)
  },
  onSettings: cb => {
    const handler = (_e: Electron.IpcRendererEvent, s: Settings) => cb(s)
    ipcRenderer.on(IPC.settings, handler)
    return () => ipcRenderer.removeListener(IPC.settings, handler)
  },
  onThresholds: cb => {
    const handler = (_e: Electron.IpcRendererEvent, m: Record<TargetId, EffectiveThresholds>) => cb(m)
    ipcRenderer.on(IPC.thresholds, handler)
    return () => ipcRenderer.removeListener(IPC.thresholds, handler)
  },
  onMaximized: cb => {
    const handler = (_e: Electron.IpcRendererEvent, m: boolean) => cb(m)
    ipcRenderer.on(IPC.maximized, handler)
    return () => ipcRenderer.removeListener(IPC.maximized, handler)
  }
}

contextBridge.exposeInMainWorld('pingpulse', api)
