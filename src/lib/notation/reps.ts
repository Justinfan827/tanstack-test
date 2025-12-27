import type { ParsedReps, ParseResult, RepValue } from './types'
import { MAX_REPS, MAX_REST_SECONDS } from './types'

// Matches: N, N-N, or AMRAP (case-insensitive)
const REP_VALUE_PATTERN = /^(?:(\d+)(?:-(\d+))?|(amrap))$/i

// Matches time patterns: Nm, Ns, NmNs (e.g., 2m, 90s, 1m30s)
const TIME_PATTERN = /^(?:(\d+)m)?(?:(\d+)s)?$/i

function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim()
  const match = trimmed.match(TIME_PATTERN)

  if (!match) return null

  const minutes = match[1] ? parseInt(match[1], 10) : 0
  const seconds = match[2] ? parseInt(match[2], 10) : 0

  // Must have at least one component
  if (minutes === 0 && seconds === 0 && !match[1] && !match[2]) {
    return null
  }

  const totalSeconds = minutes * 60 + seconds

  // Validate min 1 second
  if (totalSeconds < 1) return null

  // Validate max (reuse rest max)
  if (totalSeconds > MAX_REST_SECONDS) return null

  return totalSeconds
}

function parseTimeBasedRep(segment: string): RepValue | null {
  const trimmed = segment.trim()

  // First, try parsing as a single time value
  const singleTime = parseTimeToSeconds(trimmed)
  if (singleTime !== null) {
    return { type: 'time', seconds: singleTime }
  }

  // Try parsing as a range (e.g., 30s-1m)
  for (let i = 1; i < trimmed.length; i++) {
    if (trimmed[i] === '-') {
      const left = trimmed.slice(0, i)
      const right = trimmed.slice(i + 1)

      const leftSeconds = parseTimeToSeconds(left)
      const rightSeconds = parseTimeToSeconds(right)

      if (leftSeconds !== null && rightSeconds !== null) {
        // Validate range
        if (leftSeconds >= rightSeconds) return null

        return {
          type: 'timeRange',
          minSeconds: leftSeconds,
          maxSeconds: rightSeconds,
        }
      }
    }
  }

  return null
}

function parseRepValue(segment: string): RepValue | null {
  const trimmed = segment.trim()

  // Try time-based first (since "30s" shouldn't match numeric pattern)
  const timeValue = parseTimeBasedRep(trimmed)
  if (timeValue !== null) {
    return timeValue
  }

  const match = trimmed.match(REP_VALUE_PATTERN)

  if (!match) return null

  // AMRAP case
  if (match[3]) {
    return { type: 'amrap' }
  }

  const first = parseInt(match[1], 10)
  const second = match[2] ? parseInt(match[2], 10) : null

  // Validate min 1
  if (first < 1) return null

  // Validate max
  if (first > MAX_REPS) return null

  // Range validation
  if (second !== null) {
    if (second < 1) return null
    if (second > MAX_REPS) return null
    if (first >= second) return null

    return { type: 'range', min: first, max: second }
  }

  return { type: 'fixed', value: first }
}

export function parse(input: string): ParseResult<ParsedReps> {
  const trimmed = input.trim()

  // Empty string is valid
  if (trimmed === '') {
    return { value: null, valid: true, errors: [] }
  }

  const segments = trimmed.split(',')
  const values: RepValue[] = []
  const errors: string[] = []

  for (const segment of segments) {
    const parsed = parseRepValue(segment)
    if (parsed === null) {
      errors.push(`invalid reps segment: "${segment.trim()}"`)
    } else {
      values.push(parsed)
    }
  }

  if (errors.length > 0) {
    return { value: null, valid: false, errors }
  }

  return {
    value: { values },
    valid: true,
    errors: [],
  }
}

export function validate(input: string): boolean {
  return parse(input).valid
}
