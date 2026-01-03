import { useEffect, useState } from 'react'
import {
  getFocusRingEnabled,
  setFocusRingEnabled,
  subscribe,
} from '@/features/dev-tools/store'

interface FocusInfo {
  tagName: string
  id: string
  className: string
}

export function FocusPanel() {
  const [info, setInfo] = useState<FocusInfo | null>(null)
  const [showRing, setShowRing] = useState(getFocusRingEnabled)

  // Subscribe to store changes for ring toggle
  useEffect(() => {
    return subscribe(() => {
      setShowRing(getFocusRingEnabled())
    })
  }, [])

  // Track focus changes
  useEffect(() => {
    const updateInfo = () => {
      const el = document.activeElement as HTMLElement
      if (!el || el === document.body || el === document.documentElement) {
        setInfo(null)
        return
      }

      setInfo({
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
      })
    }

    updateInfo()
    document.addEventListener('focusin', updateInfo)
    document.addEventListener('focusout', updateInfo)

    return () => {
      document.removeEventListener('focusin', updateInfo)
      document.removeEventListener('focusout', updateInfo)
    }
  }, [])

  const handleToggleRing = () => {
    setFocusRingEnabled(!showRing)
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        onClick={handleToggleRing}
        style={{
          background: showRing ? '#0f0' : '#333',
          border: 'none',
          color: showRing ? '#000' : '#0f0',
          cursor: 'pointer',
          padding: '2px 6px',
          fontSize: 10,
          fontFamily: 'monospace',
          borderRadius: 2,
          alignSelf: 'flex-start',
        }}
      >
        ring: {showRing ? 'on' : 'off'}
      </button>
      <span
        style={{
          maxWidth: 280,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 11,
        }}
      >
        {label}
      </span>
    </div>
  )
}
