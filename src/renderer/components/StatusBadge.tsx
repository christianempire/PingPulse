import { STATUS_COLOR_HEX, STATUS_LABEL } from '@shared/thresholds'
import type { StatusColor } from '@shared/types'

interface Props { color: StatusColor; pulse?: boolean }

export default function StatusBadge({ color, pulse = true }: Props) {
  const hex = STATUS_COLOR_HEX[color]
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-surface-border">
      <span className="relative inline-flex h-2.5 w-2.5">
        {pulse && color !== 'gray' && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ background: hex }}
          />
        )}
        <span className="relative rounded-full h-2.5 w-2.5" style={{ background: hex }} />
      </span>
      <span className="text-sm font-medium text-slate-200">{STATUS_LABEL[color]}</span>
    </div>
  )
}
