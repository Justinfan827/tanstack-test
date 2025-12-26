import type { ParsedWeight, ParseResult, WeightValue } from './types'
import { MAX_WEIGHT } from './types'

// Number with up to 2 decimal places
const NUMBER_PATTERN = /\d+(?:\.\d{1,2})?/

// ES/E/S suffix pattern (case-insensitive)
const ES_SUFFIX_PATTERN = /\s*(?:es|e\/s)\s*$/i

// BW prefix pattern (case-insensitive)
const BW_PREFIX_PATTERN = /^bw/i

// BW pattern: BW, BW+N, BW+N-N (ES suffix removed before matching)
const BW_PATTERN = new RegExp(
  `^bw(?:\\+(${NUMBER_PATTERN.source})(?:-(${NUMBER_PATTERN.source}))?)?$`,
  'i',
)

// Simple pattern: N, N-N (ES suffix removed before matching)
const SIMPLE_PATTERN = new RegExp(
  `^(${NUMBER_PATTERN.source})(?:-(${NUMBER_PATTERN.source}))?$`,
  'i',
)

function hasEsSuffix(input: string): boolean {
  return ES_SUFFIX_PATTERN.test(input)
}

function parseNumber(str: string): number | null {
  const num = parseFloat(str)
  if (Number.isNaN(num)) return null
  if (num < 0) return null
  if (num > MAX_WEIGHT) return null
  return num
}

function parseWeightValue(input: string): WeightValue | null {
  // Try to parse as N or N-N
  const match = input.match(SIMPLE_PATTERN)
  if (!match) return null

  const first = parseNumber(match[1])
  if (first === null) return null

  const second = match[2] ? parseNumber(match[2]) : null

  if (second !== null) {
    if (first >= second) return null // Range min must be less than max
    return { type: 'range', min: first, max: second }
  }

  return { type: 'fixed', value: first }
}

type ParsedSegment = {
  value: WeightValue
  perSide: boolean
  bodyweight: boolean
  added?: WeightValue
}

function parseWeightSegment(segment: string): ParsedSegment | null {
  const trimmed = segment.trim()
  const perSide = hasEsSuffix(trimmed)

  // Remove ES suffix for parsing
  const withoutEs = trimmed.replace(ES_SUFFIX_PATTERN, '').trim()

  // Check if it's a bodyweight pattern
  if (BW_PREFIX_PATTERN.test(withoutEs)) {
    const bwMatch = withoutEs.match(BW_PATTERN)
    if (!bwMatch) return null

    // Just "BW"
    if (!bwMatch[1]) {
      return {
        value: { type: 'fixed', value: 0 },
        perSide,
        bodyweight: true,
      }
    }

    // BW+N or BW+N-N
    const addedFirst = parseNumber(bwMatch[1])
    if (addedFirst === null) return null

    const addedSecond = bwMatch[2] ? parseNumber(bwMatch[2]) : null

    let added: WeightValue
    if (addedSecond !== null) {
      if (addedFirst >= addedSecond) return null
      added = { type: 'range', min: addedFirst, max: addedSecond }
    } else {
      added = { type: 'fixed', value: addedFirst }
    }

    return {
      value: { type: 'fixed', value: 0 },
      perSide,
      bodyweight: true,
      added,
    }
  }

  // Regular weight pattern
  const weightValue = parseWeightValue(withoutEs)
  if (weightValue === null) return null

  return {
    value: weightValue,
    perSide,
    bodyweight: false,
  }
}

export function parse(input: string): ParseResult<ParsedWeight> {
  const trimmed = input.trim()

  // Empty string is valid
  if (trimmed === '') {
    return { value: null, valid: true, errors: [] }
  }

  const segments = trimmed.split(',')
  const parsedSegments: ParsedSegment[] = []
  const errors: string[] = []

  for (const segment of segments) {
    const parsed = parseWeightSegment(segment)
    if (parsed === null) {
      errors.push(`invalid weight segment: "${segment.trim()}"`)
    } else {
      parsedSegments.push(parsed)
    }
  }

  if (errors.length > 0) {
    return { value: null, valid: false, errors }
  }

  // Build the final result
  // For simplicity, we'll use the first segment to determine bodyweight/perSide flags
  // and collect all values. Mixed BW and regular weights are allowed.
  const values: WeightValue[] = []
  let hasBodyweight = false
  let hasPerSide = false
  let lastAdded: WeightValue | undefined

  for (const seg of parsedSegments) {
    if (seg.bodyweight) {
      hasBodyweight = true
      if (seg.added) {
        values.push(seg.added)
        lastAdded = seg.added
      } else {
        // Pure BW with no added weight - use 0 as placeholder
        values.push({ type: 'fixed', value: 0 })
      }
    } else {
      values.push(seg.value)
    }
    if (seg.perSide) {
      hasPerSide = true
    }
  }

  return {
    value: {
      values,
      perSide: hasPerSide,
      bodyweight: hasBodyweight,
      added: lastAdded,
    },
    valid: true,
    errors: [],
  }
}

export function validate(input: string): boolean {
  return parse(input).valid
}
