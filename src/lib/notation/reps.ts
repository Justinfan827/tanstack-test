import type { ParsedReps, ParseResult, RepValue } from './types'
import { MAX_REPS } from './types'

// Matches: N, N-N, or AMRAP (case-insensitive)
const REP_VALUE_PATTERN = /^(?:(\d+)(?:-(\d+))?|(amrap))$/i

function parseRepValue(segment: string): RepValue | null {
  const trimmed = segment.trim()
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
