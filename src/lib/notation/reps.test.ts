import { describe, expect, it } from 'vitest'
import { parse, validate } from './reps'

describe('reps parser', () => {
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

    it('parses max value (999)', () => {
      const result = parse('999')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 999 }],
      })
    })

    it('parses range', () => {
      const result = parse('8-12')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 8, max: 12 }],
      })
    })

    it('parses AMRAP (uppercase)', () => {
      const result = parse('AMRAP')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'amrap' }],
      })
    })

    it('parses AMRAP (lowercase)', () => {
      const result = parse('amrap')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'amrap' }],
      })
    })

    it('parses AMRAP (mixed case)', () => {
      const result = parse('Amrap')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'amrap' }],
      })
    })

    it('parses per-set values (comma-separated)', () => {
      const result = parse('12,10,8')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 12 },
          { type: 'fixed', value: 10 },
          { type: 'fixed', value: 8 },
        ],
      })
    })

    it('parses per-set with whitespace around commas', () => {
      const result = parse('12 , 10 , 8')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 12 },
          { type: 'fixed', value: 10 },
          { type: 'fixed', value: 8 },
        ],
      })
    })

    it('parses mixed fixed and AMRAP', () => {
      const result = parse('10,8,AMRAP')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 10 },
          { type: 'fixed', value: 8 },
          { type: 'amrap' },
        ],
      })
    })

    it('parses mixed range and AMRAP', () => {
      const result = parse('8-12,AMRAP')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 8, max: 12 }, { type: 'amrap' }],
      })
    })

    it('parses mixed fixed, range, and AMRAP', () => {
      const result = parse('10,8-12,AMRAP')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 10 },
          { type: 'range', min: 8, max: 12 },
          { type: 'amrap' },
        ],
      })
    })

    it('parses AMRAP in middle of list', () => {
      const result = parse('10,AMRAP,8')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 10 },
          { type: 'amrap' },
          { type: 'fixed', value: 8 },
        ],
      })
    })
  })

  describe('invalid inputs', () => {
    it('rejects zero', () => {
      const result = parse('0')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects negative values', () => {
      const result = parse('-5')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects values above max (999)', () => {
      const result = parse('1000')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range with zero', () => {
      const result = parse('0-8')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min >= max', () => {
      const result = parse('8-8')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min > max', () => {
      const result = parse('12-8')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects non-numeric input', () => {
      const result = parse('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects decimals (reps must be integers)', () => {
      const result = parse('8.5')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects multiple ranges in single segment (8-12-15)', () => {
      const result = parse('8-12-15')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects partial invalid in comma list', () => {
      const result = parse('8,abc,12')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('invalid reps segment: "abc"')
    })

    it('rejects empty segment in comma list', () => {
      const result = parse('8,,12')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validate function', () => {
    it('returns true for valid input', () => {
      expect(validate('8')).toBe(true)
      expect(validate('8-12')).toBe(true)
      expect(validate('AMRAP')).toBe(true)
      expect(validate('10,8,AMRAP')).toBe(true)
      expect(validate('')).toBe(true)
    })

    it('returns false for invalid input', () => {
      expect(validate('0')).toBe(false)
      expect(validate('1000')).toBe(false)
      expect(validate('abc')).toBe(false)
      expect(validate('8.5')).toBe(false)
    })
  })
})
