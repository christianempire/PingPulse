import { useSettings } from '../state/settingsStore'
import StatusBadge from './StatusBadge'
import type { StatusColor } from '@shared/types'

interface Props {
  status: StatusColor
  onOpenSettings: () => void
  sessionMs: number
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

export default function Header({ status, onOpenSettings, sessionMs }: Props) {
  const settings = useSettings(s => s.settings)
  const setMonitoring = useSettings(s => s.setMonitoring)
  const setCompact = useSettings(s => s.setCompact)
  return (
    <header className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center font-bold text-white shadow-card">P</div>
        <div>
          <div className="text-lg font-semibold tracking-tight">PingPulse</div>
          <div className="text-xs text-slate-500 font-mono">session {formatDuration(sessionMs)}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge color={status} />
        <button
          className="text-sm px-3 py-1.5 rounded-md border border-surface-border bg-surface-2 hover:bg-surface-3 text-slate-200"
          onClick={() => setMonitoring(!(settings?.monitoring ?? true))}
        >
          {settings?.monitoring ? 'Pause' : 'Resume'}
        </button>
        <button
          className="text-sm px-3 py-1.5 rounded-md border border-surface-border bg-surface-2 hover:bg-surface-3 text-slate-200"
          onClick={() => setCompact(!(settings?.compactMode ?? false))}
        >
          {settings?.compactMode ? 'Hide overlay' : 'Compact overlay'}
        </button>
        <button
          className="text-sm px-3 py-1.5 rounded-md border border-surface-border bg-surface-2 hover:bg-surface-3 text-slate-200"
          onClick={onOpenSettings}
        >
          ⚙ Settings
        </button>
      </div>
    </header>
  )
}
