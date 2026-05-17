import { useEffect } from 'react'
import { useSettings } from './state/settingsStore'
import { useSamples } from './state/samplesStore'
import { useThresholds } from './state/thresholdsStore'
import Dashboard from './components/Dashboard'
import CompactOverlay from './components/CompactOverlay'

interface AppProps { isOverlay: boolean }

export default function App({ isOverlay }: AppProps) {
  const settings = useSettings(s => s.settings)
  const setSettings = useSettings(s => s.setSettings)
  const pushSample = useSamples(s => s.push)
  const setWindowMs = useSamples(s => s.setWindowMs)
  const setThresholds = useThresholds(s => s.setAll)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.pingpulse.getSettings(), window.pingpulse.getThresholds()]).then(
      ([s, t]) => {
        if (cancelled) return
        setSettings(s)
        setWindowMs(s.rollingWindowMin * 60_000)
        setThresholds(t)
      }
    )
    const offSettings = window.pingpulse.onSettings(s => {
      setSettings(s)
      setWindowMs(s.rollingWindowMin * 60_000)
    })
    const offSample = window.pingpulse.onSample(s => pushSample(s))
    const offThresholds = window.pingpulse.onThresholds(m => setThresholds(m))
    return () => {
      cancelled = true
      offSettings()
      offSample()
      offThresholds()
    }
  }, [setSettings, pushSample, setWindowMs, setThresholds])

  useEffect(() => {
    if (!settings) return
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }, [settings?.darkMode])

  if (!settings) {
    return <div className="h-full flex items-center justify-center text-slate-400">Loading…</div>
  }
  return isOverlay ? <CompactOverlay /> : <Dashboard />
}
