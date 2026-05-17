import { useEffect, useState } from 'react'
import { useSettings } from '../state/settingsStore'
import { useSamples } from '../state/samplesStore'
import { useThresholds } from '../state/thresholdsStore'
import { computeStats } from '../lib/stats'
import { statusFromStats } from '../lib/status'
import type { StatusColor, Target } from '@shared/types'
import { STATUS_COLOR_HEX } from '@shared/thresholds'
import { pingpulse } from '../api'
import { I } from './primitives'

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const settings = useSettings(s => s.settings)!
  const patch = useSettings(s => s.patch)
  const samplesByTarget = useSamples(s => s.samplesByTarget)
  const thresholdsMap = useThresholds(s => s.map)
  const [newLabel, setNewLabel] = useState('')
  const [newHost, setNewHost] = useState('')
  const [isPackaged, setIsPackaged] = useState<boolean | null>(null)

  useEffect(() => {
    pingpulse.isPackaged().then(setIsPackaged)
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

  const activeTarget = settings.targets.find(t => t.id === settings.activeTargetId)
  const activeThresholds = settings.activeTargetId ? thresholdsMap[settings.activeTargetId] : undefined

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 40,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)'
      }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{
          width: 720,
          maxWidth: '92vw',
          maxHeight: '88vh',
          borderRadius: 22,
          padding: '20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span className="t-display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
            Settings
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              border: 0,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--fg-1)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer'
            }}
          >
            <I.Close />
          </button>
        </div>

        <div
          className="scroll"
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingRight: 12,
            marginRight: -8
          }}
        >
          <Section label="Monitoring">
            <Row label="Ping interval" sub="Lower values use more CPU & battery">
              <NumericInput
                value={settings.intervalMs}
                min={250}
                step={50}
                unit="ms"
                onChange={v => patch({ intervalMs: Math.max(250, v || 1000) })}
              />
            </Row>
            <Row label="Latency alert threshold" sub="Highlight any sample above this value">
              <NumericInput
                value={settings.latencyThresholdMs}
                min={20}
                step={10}
                unit="ms"
                onChange={v => patch({ latencyThresholdMs: Math.max(20, v || 150) })}
              />
            </Row>
            <Row label="Rolling window" sub="History kept in memory (capped at 4 000 samples / target)">
              <NumericInput
                value={settings.rollingWindowMin}
                min={1}
                step={1}
                unit="min"
                onChange={v => patch({ rollingWindowMin: Math.max(1, v || 10) })}
              />
            </Row>
          </Section>

          <Section label="Notifications & window">
            <Row label="Packet loss alerts" sub="Notify on 3+ consecutive timeouts">
              <Toggle on={settings.lossAlertEnabled} onChange={v => patch({ lossAlertEnabled: v })} />
            </Row>
            <Row label="Desktop notifications" sub="Native toasts for spike / loss / recovered">
              <Toggle on={settings.desktopNotifications} onChange={v => patch({ desktopNotifications: v })} />
            </Row>
            <Row label="Dark mode" sub="Light theme is a polished alternative">
              <Toggle on={settings.darkMode} onChange={v => patch({ darkMode: v })} />
            </Row>
            <Row label="Compact overlay" sub="Always-on-top mini window (260 × 96)">
              <Toggle on={settings.compactMode} onChange={v => patch({ compactMode: v })} />
            </Row>
            <Row label="Start minimized to tray">
              <Toggle on={settings.startMinimized} onChange={v => patch({ startMinimized: v })} />
            </Row>
            <div>
              <Row
                label="Launch on Windows startup"
                sub={'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\PingPulse'}
              >
                <Toggle on={settings.launchOnStartup} onChange={v => patch({ launchOnStartup: v })} />
              </Row>
              {isPackaged === false && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--st-yellow)', marginTop: -4, paddingLeft: 2 }}>
                  Dev mode — autostart only sticks after <span style={{ color: 'var(--fg-1)' }}>npm run deploy</span>.
                </div>
              )}
            </div>
          </Section>

          {activeTarget && activeThresholds && (
            <div className="glass--inset" style={{ marginTop: 6, padding: '14px 16px', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span className="t-eyebrow">Calibration · {activeTarget.label}</span>
                <span style={{ flex: 1 }} />
                <span
                  className="chip"
                  style={{
                    height: 22,
                    fontSize: 10.5,
                    paddingInline: 10,
                    color: activeThresholds.calibrated ? 'var(--st-green)' : 'var(--st-yellow)',
                    background: activeThresholds.calibrated ? 'rgba(34,214,154,0.08)' : 'rgba(240,183,43,0.08)',
                    boxShadow: activeThresholds.calibrated
                      ? '0 0 0 1px rgba(34,214,154,0.32)'
                      : '0 0 0 1px rgba(240,183,43,0.32)'
                  }}
                >
                  {activeThresholds.calibrated ? (
                    <>
                      <I.Check /> Calibrated · {activeThresholds.samples.toLocaleString()} samples
                    </>
                  ) : (
                    <>Calibrating · {activeThresholds.samples} / 500</>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <CalibrationBar label="Latency ok" value={`${activeThresholds.latency.ok} ms`} fillPct={50} color="var(--st-yellow)" />
                <CalibrationBar label="Latency bad" value={`${activeThresholds.latency.bad} ms`} fillPct={75} color="var(--st-orange)" />
                <CalibrationBar label="Jitter bad" value={`${activeThresholds.jitter.bad} ms`} fillPct={60} color="var(--st-orange)" />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <CalibrationBar label="Loss good" value={`${activeThresholds.lossPct.good} %`} fillPct={20} color="var(--st-green)" />
                <CalibrationBar label="Loss ok" value={`${activeThresholds.lossPct.ok} %`} fillPct={45} color="var(--st-yellow)" />
                <CalibrationBar label="Loss bad" value={`${activeThresholds.lossPct.bad} %`} fillPct={70} color="var(--st-orange)" />
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 12 }}>
                Derived from p95 latency · auto-recalibrates every 50 000 samples
              </div>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span className="t-eyebrow">Targets</span>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>
                {settings.targets.length} active
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {settings.targets.map(t => {
                const tSamples = samplesByTarget[t.id] ?? []
                const tStats = computeStats(tSamples)
                const tThresh = thresholdsMap[t.id]
                const tStatus: StatusColor = tThresh ? statusFromStats(tStats, tThresh) : 'gray'
                const dotColor = STATUS_COLOR_HEX[tStatus]
                return (
                  <div
                    key={t.id}
                    className="glass--inset"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}
                  >
                    <span
                      className={`dot dot--${tStatus}`}
                      style={{ flex: '0 0 8px', background: dotColor }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{t.label}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{t.host}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 4 }}>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--fg-1)' }}>
                        {tStats.current === null ? '—' : `${Math.round(tStats.current)} ms`} · {tStats.lossPct.toFixed(1)}%
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 9.5,
                          marginTop: 2,
                          color: tThresh?.calibrated ? 'var(--st-green)' : 'var(--st-yellow)'
                        }}
                      >
                        {tThresh?.calibrated
                          ? `calibrated · ${tThresh.samples.toLocaleString()} samples`
                          : `calibrating · ${tThresh?.samples ?? 0} / 500`}
                      </span>
                    </div>
                    <button
                      className="btn btn--ghost"
                      style={{ height: 26, fontSize: 11, padding: '0 10px', opacity: settings.targets.length <= 1 ? 0.4 : 1 }}
                      onClick={() => removeTarget(t.id)}
                      disabled={settings.targets.length <= 1}
                      title={settings.targets.length <= 1 ? 'At least one target required' : 'Remove'}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="tinput"
                placeholder="Label (optional)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                className="tinput"
                placeholder="Host · e.g. cloudflare.com"
                value={newHost}
                onChange={e => setNewHost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTarget()}
                style={{ flex: 1.4 }}
              />
              <button className="btn btn--primary" onClick={addTarget}>
                <I.Plus />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
      <span className="t-eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '11px 0',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        gap: 16
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{label}</span>
        {sub && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
      <i />
    </button>
  )
}

function NumericInput({
  value,
  min,
  step,
  unit,
  onChange
}: {
  value: number
  min: number
  step: number
  unit: string
  onChange: (n: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 130 }}>
      <input
        className="tinput"
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ textAlign: 'right' }}
      />
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
        {unit}
      </span>
    </div>
  )
}

function CalibrationBar({
  label,
  value,
  fillPct,
  color
}: {
  label: string
  value: string
  fillPct: number
  color: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--fg-2)' }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-1)' }}>
          {value}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, fillPct))}%`,
            height: '100%',
            background: color,
            boxShadow: `0 0 8px ${color}99`,
            borderRadius: 2
          }}
        />
      </div>
    </div>
  )
}
