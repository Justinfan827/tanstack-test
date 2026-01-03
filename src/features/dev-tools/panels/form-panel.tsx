import { useEffect, useState } from 'react'
import {
  getRegisteredForms,
  getAllFormIdsWithHistory,
  getHistory,
  clearHistory,
  prefillForm,
  getRelativeTime,
  subscribe,
} from '@/features/dev-tools/store'

export function FormPanel() {
  const [formIds, setFormIds] = useState<string[]>([])
  const [, setTick] = useState(0)

  // Subscribe to store changes
  useEffect(() => {
    const update = () => {
      // Merge registered forms with forms that have history
      const registered = getRegisteredForms()
      const withHistory = getAllFormIdsWithHistory()
      const merged = [...new Set([...registered, ...withHistory])]
      setFormIds(merged.sort())
      setTick((t) => t + 1)
    }
    update()
    return subscribe(update)
  }, [])

  if (formIds.length === 0) {
    return (
      <div style={{ fontSize: 11, color: '#666' }}>No forms registered</div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {formIds.map((formId) => (
        <FormHistorySection key={formId} formId={formId} />
      ))}
    </div>
  )
}

function FormHistorySection({ formId }: { formId: string }) {
  const [history, setHistory] = useState(() => getHistory(formId))
  const [, setTick] = useState(0)

  // Subscribe to store changes
  useEffect(() => {
    const update = () => {
      setHistory(getHistory(formId))
      setTick((t) => t + 1)
    }
    return subscribe(update)
  }, [formId])

  const handleClear = () => {
    clearHistory(formId)
  }

  const handlePrefill = (values: unknown) => {
    prefillForm(formId, values)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 'bold' }}>{formId}</span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: '#333',
              border: 'none',
              color: '#f66',
              cursor: 'pointer',
              padding: '1px 4px',
              fontSize: 9,
              fontFamily: 'monospace',
              borderRadius: 2,
            }}
          >
            clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ fontSize: 10, color: '#666', paddingLeft: 8 }}>
          no history
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {history.map((entry, index) => (
            <button
              key={entry.timestamp}
              type="button"
              onClick={() => handlePrefill(entry.values)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0f0',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: 10,
                fontFamily: 'monospace',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                borderRadius: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                }}
              >
                {entry.label || `Entry ${index + 1}`}
              </span>
              <span style={{ color: '#666', flexShrink: 0 }}>
                {getRelativeTime(entry.timestamp)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
