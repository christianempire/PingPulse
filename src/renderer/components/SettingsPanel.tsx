import { useEffect, useState } from 'react'
import { useSettings } from '../state/settingsStore'
import { selectThresholds, useThresholds } from '../state/thresholdsStore'
import type { Target } from '@shared/types'

interface Props { onClose: () => void }

export default function SettingsPanel({ onClose }: Props) {
  const settings = useSettings(s => s.settings)!
  const patch = useSettings(s => s.patch)
  const [newLabel, setNewLabel] = useState('')
  const [newHost, setNewHost] = useState('')
  const [isPackaged, setIsPackaged] = useState<boolean | null>(null)
  const activeThresholds = useThresholds(selectThresholds(settings.activeTargetId))

  useEffect(() => {
    window.pingpulse.isPackaged().then(setIsPackaged)
  }, [])

  const addTarget = () => {
    const host = newHost.trim()
    if (!host) return
    const label = newLabel.trim() || host
    const id = host
    if (settings.targets.some(t => t.id === id)) return
    const target: Target = { id, label, host }
    patch({ targets: [...settings.targets, target] })
    setNewLabel('')
    setNewHost('')
  }

  const removeTarget = (id: string) => {
    const next = settings.targets.filter(t => t.id !== id)
    const activeTargetId =
      settings.activeTargetId === id ? next[0]?.id ?? null : settings.activeTargetId
    patch({ targets: next, activeTargetId })
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-40" onClick={onClose}>
      <div
        className="bg-surface-1 border border-surface-border rounded-2xl w-[640px] max-w-[92vw] max-h-[88vh] overflow-y-auto shadow-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="font-semibold">Settings</div>
          <button
            className="text-slate-400 hover:text-slate-200 text-lg"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5 grid gap-5">
          <Field label="Ping interval (ms)">
            <input
              type="number"
              min={250}
              step={50}
              className="input"
              value={settings.intervalMs}
              onChange={e => patch({ intervalMs: Math.max(250, Number(e.target.value) || 1000) })}
            />
          </Field>

          <Field label="Latency alert threshold (ms)">
            <input
              type="number"
              min={20}
              step={10}
              className="input"
              value={settings.latencyThresholdMs}
              onChange={e => patch({ latencyThresholdMs: Math.max(20, Number(e.target.value) || 150) })}
            />
          </Field>

          <Field label="Rolling graph window (minutes)">
            <input
              type="number"
              min={1}
              max={120}
              className="input"
              value={settings.rollingWindowMin}
              onChange={e => patch({ rollingWindowMin: Math.max(1, Number(e.target.value) || 10) })}
            />
          </Field>

          <Toggle
            label="Packet loss alerts"
            checked={settings.lossAlertEnabled}
            onChange={v => patch({ lossAlertEnabled: v })}
          />
          <Toggle
            label="Desktop notifications"
            checked={settings.desktopNotifications}
            onChange={v => patch({ desktopNotifications: v })}
          />
          <Toggle
            label="Dark mode"
            checked={settings.darkMode}
            onChange={v => patch({ darkMode: v })}
          />
          <Toggle
            label="Compact overlay mode"
            checked={settings.compactMode}
            onChange={v => patch({ compactMode: v })}
          />
          <Toggle
            label="Start minimized to tray"
            checked={settings.startMinimized}
            onChange={v => patch({ startMinimized: v })}
          />
          <div>
            <Toggle
              label="Launch on Windows startup"
              checked={settings.launchOnStartup}
              onChange={v => patch({ launchOnStartup: v })}
            />
            {isPackaged === false && (
              <div className="text-xs text-amber-400/80 mt-1">
                Dev mode — autostart will only stick after <span className="font-mono">npm run deploy</span>.
              </div>
            )}
          </div>

          <div className="bg-surface-2 border border-surface-border rounded-md px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="stat-label">Calibration</span>
              <span className={`text-xs px-2 py-0.5 rounded ${activeThresholds.calibrated ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {activeThresholds.calibrated ? 'Calibrated to your network' : `Using seed thresholds (${activeThresholds.samples}/500 samples)`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
              <Stat label="Latency ok" val={`${activeThresholds.latency.ok} ms`} />
              <Stat label="Latency bad" val={`${activeThresholds.latency.bad} ms`} />
              <Stat label="Jitter bad" val={`${activeThresholds.jitter.bad} ms`} />
              <Stat label="Loss good" val={`${activeThresholds.lossPct.good}%`} />
              <Stat label="Loss ok" val={`${activeThresholds.lossPct.ok}%`} />
              <Stat label="Loss bad" val={`${activeThresholds.lossPct.bad}%`} />
            </div>
          </div>

          <div>
            <div className="stat-label mb-2">Targets</div>
            <div className="grid gap-2">
              {settings.targets.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 bg-surface-2 border border-surface-border rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 truncate">{t.label}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">{t.host}</div>
                  </div>
                  <button
                    className="text-xs px-2 py-1 rounded border border-surface-border hover:bg-surface-3 text-slate-300 disabled:opacity-40"
                    onClick={() => removeTarget(t.id)}
                    disabled={settings.targets.length <= 1}
                    title={settings.targets.length <= 1 ? 'At least one target required' : 'Remove'}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                placeholder="Label (optional)"
                className="input"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
              <input
                placeholder="Host (e.g. cloudflare.com)"
                className="input"
                value={newHost}
                onChange={e => setNewHost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTarget()}
              />
              <button
                className="px-3 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm"
                onClick={addTarget}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .input {
          background: #171b24;
          border: 1px solid #262c3a;
          border-radius: 6px;
          padding: 6px 10px;
          color: #e2e8f0;
          font-size: 13px;
          outline: none;
        }
        .input:focus { border-color: #0ea5e9; }
      `}</style>
    </div>
  )
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-mono text-slate-300">{val}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="w-48">{children}</div>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`inline-flex w-10 h-6 rounded-full border transition ${
          checked ? 'bg-sky-600 border-sky-500' : 'bg-surface-3 border-surface-border'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mt-[1px] ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </label>
  )
}
