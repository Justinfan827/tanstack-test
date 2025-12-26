import { describe, expect, it } from 'vitest'
import { parse, validate } from './rest'

describe('rest parser', () => {
  describe('valid inputs', () => {
    it('parses empty string', () => {
      const result = parse('')
      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
      expect(result.errors).toEqual([])
    })

    it('parses whitespace-only string', () => {
      const result = parse('   ')
      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it('parses seconds only', () => {
      const result = parse('90s')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', seconds: 90 }],
      })
    })

    it('parses minutes only', () => {
      const result = parse('2m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', seconds: 120 }],
      })
    })

    it('parses minutes and seconds combined', () => {
      const result = parse('1m30s')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', seconds: 90 }],
      })
    })

    it('parses case-insensitive (uppercase)', () => {
      const result = parse('2M30S')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', seconds: 150 }],
      })
    })

    it('parses max value (60m)', () => {
      const result = parse('60m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', seconds: 3600 }],
      })
    })

    it('parses range with minutes', () => {
      const result = parse('1m-2m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', minSeconds: 60, maxSeconds: 120 }],
      })
    })

    it('parses range with seconds', () => {
      const result = parse('60s-90s')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', minSeconds: 60, maxSeconds: 90 }],
      })
    })

    it('parses range with mixed formats', () => {
      const result = parse('1m30s-2m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', minSeconds: 90, maxSeconds: 120 }],
      })
    })

    it('parses range with complex time values', () => {
      const result = parse('1m-1m30s')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', minSeconds: 60, maxSeconds: 90 }],
      })
    })

    it('parses per-set values (comma-separated)', () => {
      const result = parse('90s,2m,2m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', seconds: 90 },
          { type: 'fixed', seconds: 120 },
          { type: 'fixed', seconds: 120 },
        ],
      })
    })

    it('parses per-set with whitespace around commas', () => {
      const result = parse('90s , 2m , 2m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', seconds: 90 },
          { type: 'fixed', seconds: 120 },
          { type: 'fixed', seconds: 120 },
        ],
      })
    })

    it('parses mixed fixed and range per-set', () => {
      const result = parse('90s,1m-2m,2m')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', seconds: 90 },
          { type: 'range', minSeconds: 60, maxSeconds: 120 },
          { type: 'fixed', seconds: 120 },
        ],
      })
    })

    it('parses 1 second (minimum)', () => {
      const result = parse('1s')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', seconds: 1 }],
      })
    })
  })

  describe('invalid inputs', () => {
    it('rejects zero seconds', () => {
      const result = parse('0s')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects zero minutes', () => {
      const result = parse('0m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects values above max (60m)', () => {
      const result = parse('61m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects values above max in seconds', () => {
      const result = parse('3601s')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects number without unit', () => {
      const result = parse('90')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects unit without number', () => {
      const result = parse('m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects non-numeric input', () => {
      const result = parse('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min >= max', () => {
      const result = parse('2m-2m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min > max', () => {
      const result = parse('2m-1m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects incomplete range', () => {
      const result = parse('1m-')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range starting with hyphen', () => {
      const result = parse('-2m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects partial invalid in comma list', () => {
      const result = parse('90s,abc,2m')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('invalid rest segment: "abc"')
    })

    it('rejects decimals', () => {
      const result = parse('1.5m')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validate function', () => {
    it('returns true for valid input', () => {
      expect(validate('90s')).toBe(true)
      expect(validate('2m')).toBe(true)
      expect(validate('1m30s')).toBe(true)
      expect(validate('1m-2m')).toBe(true)
      expect(validate('90s,2m,2m')).toBe(true)
      expect(validate('')).toBe(true)
    })

    it('returns false for invalid input', () => {
      expect(validate('0s')).toBe(false)
      expect(validate('61m')).toBe(false)
      expect(validate('90')).toBe(false)
      expect(validate('abc')).toBe(false)
    })
  })
})
