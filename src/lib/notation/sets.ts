import type { ParsedSets, ParseResult } from './types'
import { MAX_SETS } from './types'

// Matches: N, N-N, N+AMRAP (case-insensitive for AMRAP)
const SETS_PATTERN = /^(\d+)(?:-(\d+)|(\+amrap))?$/i

export function parse(input: string): ParseResult<ParsedSets> {
  const trimmed = input.trim()

  // Empty string is valid
  if (trimmed === '') {
    return { value: null, valid: true, errors: [] }
  }

  const match = trimmed.match(SETS_PATTERN)

  if (!match) {
    return {
      value: null,
      valid: false,
      errors: [`invalid sets notation: "${trimmed}"`],
    }
  }

  const first = parseInt(match[1], 10)
  const second = match[2] ? parseInt(match[2], 10) : null
  const hasAmrap = !!match[3]

  // Validate min 1
  if (first < 1) {
    return {
      value: null,
      valid: false,
      errors: ['sets must be at least 1'],
    }
  }

  // Validate max
  if (first > MAX_SETS) {
    return {
      value: null,
      valid: false,
      errors: [`sets cannot exceed ${MAX_SETS}`],
    }
  }

  // Range validation
  if (second !== null) {
    if (second < 1) {
      return {
        value: null,
        valid: false,
        errors: ['sets must be at least 1'],
      }
    }
    if (second > MAX_SETS) {
      return {
        value: null,
        valid: false,
        errors: [`sets cannot exceed ${MAX_SETS}`],
      }
    }
    if (first >= second) {
      return {
        value: null,
        valid: false,
        errors: ['range min must be less than max'],
      }
    }

    return {
      value: {
        count: { type: 'range', min: first, max: second },
        amrapFinisher: false,
      },
      valid: true,
      errors: [],
    }
  }

  // Fixed with optional AMRAP finisher
  return {
    value: {
      count: { type: 'fixed', value: first },
      amrapFinisher: hasAmrap,
    },
    valid: true,
    errors: [],
  }
}

export function validate(input: string): boolean {
  return parse(input).valid
}
