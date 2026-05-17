import { useSettings } from '../state/settingsStore'

export default function TargetSelector() {
  const settings = useSettings(s => s.settings)
  const patch = useSettings(s => s.patch)
  if (!settings) return null
  return (
    <div className="flex items-center gap-2">
      <label className="stat-label">Target</label>
      <select
        className="bg-surface-2 border border-surface-border rounded-md px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
        value={settings.activeTargetId ?? ''}
        onChange={e => patch({ activeTargetId: e.target.value })}
      >
        {settings.targets.map(t => (
          <option key={t.id} value={t.id}>
            {t.label} ({t.host})
          </option>
        ))}
      </select>
    </div>
  )
}
