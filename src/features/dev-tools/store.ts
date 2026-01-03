// Dev tools store - only used in development
// Manages form registry, history, and settings with localStorage persistence

type FormRegistration = {
  getValues: () => unknown
  prefill: (values: unknown) => void
  generateLabel?: (values: unknown) => string
}

type HistoryEntry = {
  timestamp: number
  values: unknown
  label: string
}

type FormHistory = Record<string, HistoryEntry[]>

type Listener = () => void

// In-memory form registry
const formRegistry = new Map<string, FormRegistration>()

// Subscribers for reactivity
const listeners = new Set<Listener>()

const STORAGE_KEYS = {
  minimized: 'dev-tools:minimized',
  activeTab: 'dev-tools:active-tab',
  focusRing: 'dev-tools:focus-ring',
  formHistory: 'dev-tools:form-history',
} as const

// Notify all listeners of state change
function notify() {
  for (const listener of listeners) {
    listener()
  }
}

// Subscribe to store changes
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// --- Form Registry ---

export function registerForm(formId: string, registration: FormRegistration) {
  formRegistry.set(formId, registration)
  notify()
}

export function unregisterForm(formId: string) {
  formRegistry.delete(formId)
  notify()
}

export function getRegisteredForms(): string[] {
  return Array.from(formRegistry.keys())
}

export function prefillForm(formId: string, values: unknown) {
  const registration = formRegistry.get(formId)
  if (registration) {
    registration.prefill(values)
  }
}

// --- Form History (localStorage) ---

function getFormHistoryStorage(): FormHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.formHistory)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function getAllFormIdsWithHistory(): string[] {
  const history = getFormHistoryStorage()
  return Object.keys(history).filter((id) => history[id].length > 0)
}

function setFormHistoryStorage(history: FormHistory) {
  localStorage.setItem(STORAGE_KEYS.formHistory, JSON.stringify(history))
  notify()
}

export function saveToHistory(formId: string) {
  const registration = formRegistry.get(formId)
  if (!registration) return

  const values = registration.getValues()
  const label = registration.generateLabel?.(values) || 'Entry'

  const history = getFormHistoryStorage()
  const formEntries = history[formId] || []

  // Add new entry at the beginning
  const newEntry: HistoryEntry = {
    timestamp: Date.now(),
    values,
    label,
  }

  // Keep only last 10 entries
  history[formId] = [newEntry, ...formEntries].slice(0, 10)
  setFormHistoryStorage(history)
}

export function getHistory(formId: string): HistoryEntry[] {
  const history = getFormHistoryStorage()
  return history[formId] || []
}

export function clearHistory(formId: string) {
  const history = getFormHistoryStorage()
  delete history[formId]
  setFormHistoryStorage(history)
}

// --- Settings (localStorage) ---

export function getMinimized(): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS.minimized)
  return stored === 'true'
}

export function setMinimized(value: boolean) {
  localStorage.setItem(STORAGE_KEYS.minimized, String(value))
  notify()
}

export function getActiveTab(): string {
  return localStorage.getItem(STORAGE_KEYS.activeTab) || 'focus'
}

export function setActiveTab(value: string) {
  localStorage.setItem(STORAGE_KEYS.activeTab, value)
  notify()
}

export function getFocusRingEnabled(): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS.focusRing)
  // Default to true if not set
  return stored === null ? true : stored === 'true'
}

export function setFocusRingEnabled(value: boolean) {
  localStorage.setItem(STORAGE_KEYS.focusRing, String(value))
  notify()
}

// --- Relative Time Helper ---

export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
