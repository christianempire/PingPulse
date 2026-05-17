import type { PingPulseApi } from '@shared/types'
import { getMockApi, isMockMode } from './devMocks'

// Single entry point for the renderer's IPC surface.
// In mock mode, returns an in-process stub; otherwise the real contextBridge API.
export const pingpulse: PingPulseApi = isMockMode() ? getMockApi() : window.pingpulse
