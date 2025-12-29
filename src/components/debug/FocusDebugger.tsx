import { useEffect, useState } from 'react'

interface FocusInfo {
  rect: DOMRect
  tagName: string
  id: string
  className: string
}

/**
 * Debug overlay that shows the currently focused element.
 * Add to root layout with: {import.meta.env.DEV && <FocusDebugger />}
 */
export function FocusDebugger() {
  const [info, setInfo] = useState<FocusInfo | null>(null)
  const [showRing, setShowRing] = useState(true)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    const updateInfo = () => {
      const el = document.activeElement as HTMLElement
      if (!el || el === document.body || el === document.documentElement) {
        setInfo(null)
        return
      }

      setInfo({
        rect: el.getBoundingClientRect(),
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
      })
    }

    // Initial check
    updateInfo()

    // Update on focus changes
    document.addEventListener('focusin', updateInfo)
    document.addEventListener('focusout', updateInfo)

    return () => {
      document.removeEventListener('focusin', updateInfo)
      document.removeEventListener('focusout', updateInfo)
    }
  }, [])

  const label = info
    ? [
        info.tagName,
        info.id && `#${info.id}`,
        info.className && `.${info.className.split(' ').join('.')}`,
      ]
        .filter(Boolean)
        .join('')
    : 'none'

  return (
    <>
      {/* Focus ring overlay */}
      {showRing && info && (
        <div
          style={{
            position: 'fixed',
            top: info.rect.top - 2,
            left: info.rect.left - 2,
            width: info.rect.width + 4,
            height: info.rect.height + 4,
            border: '2px solid #f00',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        />
      )}
      {/* Status bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          background: '#000',
          color: '#0f0',
          padding: '4px 8px',
          fontSize: 11,
          fontFamily: 'monospace',
          borderRadius: 4,
          zIndex: 99999,
          border: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setMinimized((m) => !m)}
          style={{
            background: 'none',
            border: 'none',
            color: '#0f0',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          {minimized ? '+' : '-'}
        </button>
        {!minimized && (
          <>
            <button
              type="button"
              onClick={() => setShowRing((r) => !r)}
              style={{
                background: showRing ? '#0f0' : '#333',
                border: 'none',
                color: showRing ? '#000' : '#0f0',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: 10,
                fontFamily: 'monospace',
                borderRadius: 2,
              }}
            >
              ring
            </button>
            <span
              style={{
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </>
        )}
      </div>
    </>
  )
}
