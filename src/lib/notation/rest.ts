import type { ParsedRest, ParseResult, RestValue } from './types'
import { MAX_REST_SECONDS } from './types'

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

  // Validate max
  if (totalSeconds > MAX_REST_SECONDS) return null

  return totalSeconds
}

function parseRestValue(segment: string): RestValue | null {
  const trimmed = segment.trim()

  // Check if it's a range (contains hyphen that's not at start)
  // Need to be careful: "1m30s-2m" is a range, "1m30s" is not
  // Strategy: try to find a hyphen that separates two valid time patterns

  // First, try parsing as a single time value
  const singleTime = parseTimeToSeconds(trimmed)
  if (singleTime !== null) {
    return { type: 'fixed', seconds: singleTime }
  }

  // Try parsing as a range
  // Find all positions where hyphen could be a separator
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
          type: 'range',
          minSeconds: leftSeconds,
          maxSeconds: rightSeconds,
        }
      }
    }
  }

  return null
}

export function parse(input: string): ParseResult<ParsedRest> {
  const trimmed = input.trim()

  // Empty string is valid
  if (trimmed === '') {
    return { value: null, valid: true, errors: [] }
  }

  const segments = trimmed.split(',')
  const values: RestValue[] = []
  const errors: string[] = []

  for (const segment of segments) {
    const parsed = parseRestValue(segment)
    if (parsed === null) {
      errors.push(`invalid rest segment: "${segment.trim()}"`)
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
