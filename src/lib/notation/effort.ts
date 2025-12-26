import type { EffortValue, ParsedEffort, ParseResult } from './types'
import { MAX_EFFORT, MIN_EFFORT } from './types'

// Matches: N or N-N (with optional decimals up to 2 places)
const EFFORT_VALUE_PATTERN = /^(\d+(?:\.\d{1,2})?)(?:-(\d+(?:\.\d{1,2})?))?$/

function parseEffortValue(segment: string): EffortValue | null {
  const trimmed = segment.trim()
  const match = trimmed.match(EFFORT_VALUE_PATTERN)

  if (!match) return null

  const first = parseFloat(match[1])
  const second = match[2] ? parseFloat(match[2]) : null

  // Validate range bounds
  if (first < MIN_EFFORT || first > MAX_EFFORT) return null
  if (second !== null && (second < MIN_EFFORT || second > MAX_EFFORT))
    return null

  // Range: min must be less than max
  if (second !== null && first >= second) return null

  if (second !== null) {
    return { type: 'range', min: first, max: second }
  }

  return { type: 'fixed', value: first }
}

export function parse(input: string): ParseResult<ParsedEffort> {
  const trimmed = input.trim()

  // Empty string is valid
  if (trimmed === '') {
    return { value: null, valid: true, errors: [] }
  }

  const segments = trimmed.split(',')
  const values: EffortValue[] = []
  const errors: string[] = []

  for (const segment of segments) {
    const parsed = parseEffortValue(segment)
    if (parsed === null) {
      errors.push(`invalid effort segment: "${segment.trim()}"`)
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
