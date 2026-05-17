interface Props {
  label: string
  value: string
  suffix?: string
  accent?: string
}

export default function StatCard({ label, value, suffix, accent }: Props) {
  return (
    <div className="card flex flex-col justify-between min-h-[88px]">
      <div className="stat-label">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="stat-value" style={accent ? { color: accent } : undefined}>{value}</span>
        {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
      </div>
    </div>
  )
}
