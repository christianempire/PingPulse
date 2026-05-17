import type { CSSProperties, SVGProps } from 'react'
import type { PingSample, StatusColor } from '@shared/types'
import { STATUS_COLOR_HEX, STATUS_GLOW_RGB, STATUS_LABEL } from '@shared/thresholds'

// --- Icons (line, currentColor) -------------------------------------------
type IconProps = SVGProps<SVGSVGElement>

export const I = {
  Pause: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <rect x="4.25" y="3.25" width="2.5" height="9.5" rx="1" />
      <rect x="9.25" y="3.25" width="2.5" height="9.5" rx="1" />
    </svg>
  ),
  Play: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M5 3.6 L12 8 L5 12.4 Z" strokeLinejoin="round" />
    </svg>
  ),
  Compact: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M2 9 H14" />
    </svg>
  ),
  Settings: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8 3.4 3.4" />
    </svg>
  ),
  Close: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="M4 4 L12 12 M12 4 L4 12" />
    </svg>
  ),
  Min: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}>
      <path d="M4 8 H12" />
    </svg>
  ),
  Max: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <rect x="4" y="4" width="8" height="8" rx="1" />
    </svg>
  ),
  ChevDown: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6 L8 10 L12 6" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="M8 3 V13 M3 8 H13" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 8.5 L6.5 12 L13 4.5" />
    </svg>
  ),
  GlyphStable: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" {...p}>
      <circle cx="6" cy="6" r="3" fill="currentColor" />
    </svg>
  ),
  GlyphElevated: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M6 9.5 V4 M6 4 L3.6 6.2 M6 4 L8.4 6.2" />
    </svg>
  ),
  GlyphUnstable: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}>
      <path d="M6 2.5 L10 6 L6 9.5 L2 6 Z" />
    </svg>
  ),
  GlyphCritical: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}>
      <path d="M3.5 3.5 L8.5 8.5 M8.5 3.5 L3.5 8.5" />
    </svg>
  ),
  GlyphIdle: (p: IconProps) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M3 6 H9" />
    </svg>
  )
}

export const STATUS_GLYPH: Record<StatusColor, (p: IconProps) => JSX.Element> = {
  green: I.GlyphStable,
  yellow: I.GlyphElevated,
  orange: I.GlyphUnstable,
  red: I.GlyphCritical,
  gray: I.GlyphIdle
}

// --- StatusBadge: dot + glyph + label -------------------------------------
interface StatusBadgeProps {
  status: StatusColor
  size?: 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const hex = STATUS_COLOR_HEX[status]
  const glow = STATUS_GLOW_RGB[status]
  const Glyph = STATUS_GLYPH[status]
  const isLg = size === 'lg'
  return (
    <span
      className="chip"
      style={{
        height: isLg ? 32 : 26,
        paddingInline: isLg ? 14 : 10,
        fontSize: isLg ? 13 : 11.5,
        color: hex,
        boxShadow: `0 1px 0 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(${glow}, 0.32), 0 0 18px -4px rgba(${glow}, 0.45)`,
        background: `linear-gradient(180deg, rgba(${glow}, 0.10), rgba(${glow}, 0.025))`
      }}
    >
      <Glyph />
      <span style={{ letterSpacing: '0.4px', fontWeight: 600 }}>{STATUS_LABEL[status].toUpperCase()}</span>
    </span>
  )
}

// --- LogoMark: heartbeat trace inside a glass disc ------------------------
interface LogoMarkProps {
  size?: number
  status?: StatusColor
  showWordmark?: boolean
}

export function LogoMark({ size = 28, status = 'green', showWordmark = false }: LogoMarkProps) {
  const hex = STATUS_COLOR_HEX[status]
  const glow = STATUS_GLOW_RGB[status]
  const gradId = `lg-${status}-${size}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: size * 0.32,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02))',
          boxShadow: `0 1px 0 0 rgba(255,255,255,0.18) inset, 0 0 0 1px rgba(255,255,255,0.08), 0 0 18px -4px rgba(${glow}, 0.5)`,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden'
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(60% 60% at 50% 60%, rgba(${glow}, 0.55), transparent 70%)`,
            opacity: 0.85
          }}
        />
        <svg viewBox="0 0 32 32" width={size * 0.78} height={size * 0.78} fill="none" style={{ position: 'relative' }}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="1" stopColor={hex} />
            </linearGradient>
          </defs>
          <path
            d="M3 16 H8 L10 10 L13 22 L16 8 L19 24 L22 14 L24 16 H29"
            stroke={`url(#${gradId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px rgba(${glow}, 0.6))` }}
          />
        </svg>
      </span>
      {showWordmark && (
        <span
          className="t-display"
          style={{ fontSize: size * 0.65, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: '-0.4px' }}
        >
          Ping<span style={{ color: hex }}>Pulse</span>
        </span>
      )}
    </span>
  )
}

// --- Sparkline (compact overlay) ------------------------------------------
interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

export function Sparkline({ data, color, width = 110, height = 26 }: SparklineProps) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const pad = 2
  const w = width - pad * 2
  const h = height - pad * 2
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [pad + i * step, pad + h - ((v - min) / span) * h] as const)
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const area = `${d} L${pad + w},${pad + h} L${pad},${pad + h} Z`
  const fillId = `sp-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path
        d={d}
        stroke={color}
        strokeWidth="1.4"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}aa)` }}
      />
    </svg>
  )
}

// --- HealthRing -----------------------------------------------------------
interface HealthRingProps {
  score: number
  status?: StatusColor
  size?: number
}

export function HealthRing({ score, status = 'green', size = 132 }: HealthRingProps) {
  const hex = STATUS_COLOR_HEX[status]
  const glow = STATUS_GLOW_RGB[status]
  const R = size / 2 - 9
  const C = 2 * Math.PI * R
  const off = C - (Math.max(0, Math.min(100, score)) / 100) * C
  const gradId = `hr-${status}-${size}`
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor={hex} />
            <stop offset="1" stopColor={hex} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          stroke={`url(#${gradId})`}
          strokeWidth="6"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px rgba(${glow}, 0.7))`, transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div
            className="t-display t-num"
            style={{ fontSize: size * 0.32, lineHeight: 1, color: 'var(--fg-0)', fontWeight: 700, letterSpacing: -1 }}
          >
            {score}
          </div>
          <div className="t-eyebrow" style={{ marginTop: 4, fontSize: 9 }}>Health</div>
        </div>
      </div>
    </div>
  )
}

// --- LatencyGraph (responsive SVG) ----------------------------------------
interface LatencyGraphProps {
  samples: PingSample[]
  color: string
  thresholdMs: number
  height?: number
  xLabels?: number
}

export function LatencyGraph({ samples, color, thresholdMs, height = 220, xLabels = 5 }: LatencyGraphProps) {
  if (!samples || samples.length < 2) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
        Waiting for samples…
      </div>
    )
  }
  const W = 1100
  const H = height
  const padL = 48
  const padR = 16
  const padT = 18
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const max = Math.max(...samples.map(s => s.rttMs ?? 0), thresholdMs * 1.4)
  const yMax = Math.max(50, Math.ceil(max / 50) * 50)
  const step = innerW / (samples.length - 1)

  const pts: Array<readonly [number, number] | null> = samples.map((s, i) => {
    if (s.rttMs == null) return null
    const x = padL + i * step
    const y = padT + innerH - (s.rttMs / yMax) * innerH
    return [x, y] as const
  })

  let d = ''
  let lastValid = false
  pts.forEach(p => {
    if (p) {
      d += (!lastValid ? `M${p[0]},${p[1]}` : ` L${p[0]},${p[1]}`)
      lastValid = true
    } else {
      lastValid = false
    }
  })

  const firstValid = pts.find((p): p is readonly [number, number] => p !== null)
  const lastValidPt = [...pts].reverse().find((p): p is readonly [number, number] => p !== null)
  const area = firstValid && lastValidPt
    ? `M${firstValid[0]},${padT + innerH} ${d} L${lastValidPt[0]},${padT + innerH} Z`
    : ''

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(yMax * t))
  const xTickIdx = Array.from({ length: xLabels }, (_, i) => Math.floor((samples.length - 1) * (i / (xLabels - 1))))
  const formatTime = (t: number) => {
    const d = new Date(t)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lg-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(v => {
        const y = padT + innerH - (v / yMax) * innerH
        return (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text
              x={padL - 8}
              y={y + 3}
              fontSize="10"
              fill="rgba(255,255,255,0.36)"
              textAnchor="end"
              fontFamily="JetBrains Mono"
            >
              {v}
            </text>
          </g>
        )
      })}
      {(() => {
        const y = padT + innerH - (thresholdMs / yMax) * innerH
        return (
          <g>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="rgba(255,138,71,0.4)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={W - padR - 4}
              y={y - 4}
              fontSize="9.5"
              fill="rgba(255,138,71,0.72)"
              textAnchor="end"
              fontFamily="JetBrains Mono"
            >
              {thresholdMs} ms threshold
            </text>
          </g>
        )
      })()}
      {area && <path d={area} fill="url(#lg-fill)" />}
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
      {pts.map((p, i) => {
        if (!p && i > 0 && i < pts.length - 1) {
          const x = padL + i * step
          const y = padT + innerH - 4
          return (
            <circle
              key={`loss-${i}`}
              cx={x}
              cy={y}
              r="2.5"
              fill="#FF5D6B"
              style={{ filter: 'drop-shadow(0 0 4px #FF5D6Bcc)' }}
            />
          )
        }
        return null
      })}
      {xTickIdx.map((idx, i) => {
        const x = padL + idx * step
        return (
          <text
            key={`xt-${i}`}
            x={x}
            y={H - 8}
            fontSize="9.5"
            fill="rgba(255,255,255,0.36)"
            textAnchor="middle"
            fontFamily="JetBrains Mono"
          >
            {formatTime(samples[idx].t)}
          </text>
        )
      })}
    </svg>
  )
}

// --- Glass select pill (used by Target + Window pickers) ------------------
interface GlassSelectProps<T extends string | number> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  leading?: JSX.Element
  style?: CSSProperties
}

export function GlassSelect<T extends string | number>({ value, options, onChange, leading, style }: GlassSelectProps<T>) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 28,
        padding: '0 6px 0 12px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.28)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 1px 0 0 rgba(255,255,255,0.04) inset',
        fontSize: 12,
        color: 'var(--fg-0)',
        position: 'relative',
        ...style
      }}
    >
      {leading}
      <span style={{ paddingRight: 18 }}>{options.find(o => o.value === value)?.label ?? ''}</span>
      <I.ChevDown style={{ color: 'var(--fg-2)', position: 'absolute', right: 10, pointerEvents: 'none' }} />
      <select
        value={String(value)}
        onChange={e => {
          const next = options.find(o => String(o.value) === e.target.value)
          if (next) onChange(next.value)
        }}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          border: 0,
          background: 'transparent',
          appearance: 'none',
          font: 'inherit',
          color: 'inherit'
        }}
      >
        {options.map(o => (
          <option key={String(o.value)} value={String(o.value)} style={{ background: '#11151F', color: '#fff' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
