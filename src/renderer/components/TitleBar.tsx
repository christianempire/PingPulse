import { useEffect, useState, type CSSProperties } from 'react'
import { pingpulse } from '../api'
import { I } from './primitives'

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    pingpulse.windowIsMaximized().then(setMaximized).catch(() => {})
    return pingpulse.onMaximized(setMaximized)
  }, [])

  return (
    <div
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px 0 12px',
        fontSize: 11,
        color: 'var(--fg-2)',
        letterSpacing: '0.04em',
        WebkitAppRegion: 'drag',
        userSelect: 'none'
      } as CSSProperties}
    >
      <div style={{ flex: 1 }} />
      <div className="t-display" style={{ fontWeight: 500, color: 'var(--fg-1)', fontSize: 11 }}>
        PingPulse
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' } as CSSProperties}>
        <ChromeButton title="Minimize" onClick={() => pingpulse.windowMinimize()}>
          <I.Min />
        </ChromeButton>
        <ChromeButton
          title={maximized ? 'Restore' : 'Maximize'}
          onClick={() => pingpulse.windowMaximizeToggle()}
        >
          {maximized ? <I.Restore /> : <I.Max />}
        </ChromeButton>
        <ChromeButton title="Close" hoverColor="#e81123" onClick={() => pingpulse.windowClose()}>
          <I.Close />
        </ChromeButton>
      </div>
    </div>
  )
}

function ChromeButton({
  title,
  hoverColor,
  onClick,
  children
}: {
  title: string
  hoverColor?: string
  onClick: () => void
  children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 22,
        display: 'grid',
        placeItems: 'center',
        background: hover ? (hoverColor ?? 'rgba(255,255,255,0.08)') : 'transparent',
        color: hover && hoverColor ? '#fff' : hover ? 'var(--fg-0)' : 'var(--fg-2)',
        border: 0,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 120ms ease, color 120ms ease'
      }}
    >
      {children}
    </button>
  )
}
