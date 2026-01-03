import { useEffect, useState } from 'react'
import { Wand2 } from 'lucide-react'
import {
  getMinimized,
  setMinimized,
  getActiveTab,
  setActiveTab,
  getFocusRingEnabled,
  subscribe,
} from '@/features/dev-tools/store'
import { FocusPanel } from '@/features/dev-tools/panels/focus-panel'
import { FormPanel } from '@/features/dev-tools/panels/form-panel'

const TABS = ['focus', 'forms'] as const
type Tab = (typeof TABS)[number]

export function DevToolsPanel() {
  const [minimized, setMinimizedState] = useState(getMinimized)
  const [activeTab, setActiveTabState] = useState<Tab>(
    () => getActiveTab() as Tab,
  )
  const [focusRingEnabled, setFocusRingEnabled] = useState(getFocusRingEnabled)
  const [focusRect, setFocusRect] = useState<DOMRect | null>(null)

  // Subscribe to store changes
  useEffect(() => {
    return subscribe(() => {
      setMinimizedState(getMinimized())
      setActiveTabState(getActiveTab() as Tab)
      setFocusRingEnabled(getFocusRingEnabled())
    })
  }, [])

  // Track focus element rect for overlay
  useEffect(() => {
    const updateFocusRect = () => {
      const el = document.activeElement as HTMLElement
      if (!el || el === document.body || el === document.documentElement) {
        setFocusRect(null)
        return
      }
      setFocusRect(el.getBoundingClientRect())
    }

    updateFocusRect()
    document.addEventListener('focusin', updateFocusRect)
    document.addEventListener('focusout', updateFocusRect)
    window.addEventListener('scroll', updateFocusRect, true)
    window.addEventListener('resize', updateFocusRect)

    return () => {
      document.removeEventListener('focusin', updateFocusRect)
      document.removeEventListener('focusout', updateFocusRect)
      window.removeEventListener('scroll', updateFocusRect, true)
      window.removeEventListener('resize', updateFocusRect)
    }
  }, [])

  const handleToggleMinimize = () => {
    setMinimized(!minimized)
  }

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab)
  }

  return (
    <>
      {/* Focus ring overlay - always rendered if enabled, regardless of tab */}
      {focusRingEnabled && focusRect && (
        <div
          style={{
            position: 'fixed',
            top: focusRect.top - 2,
            left: focusRect.left - 2,
            width: focusRect.width + 4,
            height: focusRect.height + 4,
            border: '2px solid #f00',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 99998,
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          background: '#000',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: 11,
          borderRadius: 4,
          zIndex: 99999,
          border: '1px solid #333',
          minWidth: minimized ? 'auto' : 300,
          maxWidth: 350,
        }}
      >
        {/* Header */}
        {minimized ? (
          <button
            type="button"
            onClick={handleToggleMinimize}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <Wand2 size={20} style={{ color: '#0f0' }} />
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              borderBottom: '1px solid #333',
            }}
          >
            <button
              type="button"
              onClick={handleToggleMinimize}
              style={{
                background: 'none',
                border: 'none',
                color: '#0f0',
                cursor: 'pointer',
                padding: 0,
                fontSize: 11,
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              -
            </button>

            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  style={{
                    background: activeTab === tab ? '#0f0' : 'transparent',
                    border: 'none',
                    color: activeTab === tab ? '#000' : '#0f0',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    borderRadius: 2,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {!minimized && (
          <div
            style={{
              padding: 8,
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {activeTab === 'focus' && <FocusPanel />}
            {activeTab === 'forms' && <FormPanel />}
          </div>
        )}
      </div>
    </>
  )
}
