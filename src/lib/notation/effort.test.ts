import { describe, expect, it } from 'vitest'
import { parse, validate } from './effort'

describe('effort parser', () => {
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

    it('parses single fixed value', () => {
      const result = parse('8')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 8 }],
      })
    })

    it('parses zero (valid for RIR)', () => {
      const result = parse('0')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 0 }],
      })
    })

    it('parses max value (10)', () => {
      const result = parse('10')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 10 }],
      })
    })

    it('parses decimal value (up to 2 places)', () => {
      const result = parse('7.5')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 7.5 }],
      })
    })

    it('parses decimal with 2 places', () => {
      const result = parse('7.25')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 7.25 }],
      })
    })

    it('parses range', () => {
      const result = parse('7-8')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 7, max: 8 }],
      })
    })

    it('parses range with decimals', () => {
      const result = parse('7.5-8.5')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 7.5, max: 8.5 }],
      })
    })

    it('parses per-set values (comma-separated)', () => {
      const result = parse('7,8,9')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 7 },
          { type: 'fixed', value: 8 },
          { type: 'fixed', value: 9 },
        ],
      })
    })

    it('parses per-set with whitespace around commas', () => {
      const result = parse('7 , 8 , 9')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 7 },
          { type: 'fixed', value: 8 },
          { type: 'fixed', value: 9 },
        ],
      })
    })

    it('parses mixed fixed and range per-set', () => {
      const result = parse('7,7-8,9')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 7 },
          { type: 'range', min: 7, max: 8 },
          { type: 'fixed', value: 9 },
        ],
      })
    })
  })

  describe('invalid inputs', () => {
    it('rejects negative values', () => {
      const result = parse('-1')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects values above max (10)', () => {
      const result = parse('11')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range with max above 10', () => {
      const result = parse('5-11')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects non-numeric input', () => {
      const result = parse('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects more than 2 decimal places', () => {
      const result = parse('7.123')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min >= max', () => {
      const result = parse('8-8')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min > max', () => {
      const result = parse('9-7')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects malformed range (double dash)', () => {
      const result = parse('7--8')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects partial invalid in comma list', () => {
      const result = parse('7,abc,9')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('invalid effort segment: "abc"')
    })
  })

  describe('validate function', () => {
    it('returns true for valid input', () => {
      expect(validate('8')).toBe(true)
      expect(validate('7-8')).toBe(true)
      expect(validate('7,8,9')).toBe(true)
      expect(validate('')).toBe(true)
    })

    it('returns false for invalid input', () => {
      expect(validate('11')).toBe(false)
      expect(validate('-1')).toBe(false)
      expect(validate('abc')).toBe(false)
    })
  })
})
