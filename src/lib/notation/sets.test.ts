import { describe, expect, it } from 'vitest'
import { parse, validate } from './sets'

describe('sets parser', () => {
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
      const result = parse('3')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'fixed', value: 3 },
        amrapFinisher: false,
      })
    })

    it('parses max value (99)', () => {
      const result = parse('99')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'fixed', value: 99 },
        amrapFinisher: false,
      })
    })

    it('parses range', () => {
      const result = parse('3-4')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'range', min: 3, max: 4 },
        amrapFinisher: false,
      })
    })

    it('parses fixed with AMRAP finisher (uppercase)', () => {
      const result = parse('3+AMRAP')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'fixed', value: 3 },
        amrapFinisher: true,
      })
    })

    it('parses fixed with AMRAP finisher (lowercase)', () => {
      const result = parse('3+amrap')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'fixed', value: 3 },
        amrapFinisher: true,
      })
    })

    it('parses fixed with AMRAP finisher (mixed case)', () => {
      const result = parse('3+Amrap')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'fixed', value: 3 },
        amrapFinisher: true,
      })
    })

    it('parses with leading/trailing whitespace', () => {
      const result = parse('  3  ')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        count: { type: 'fixed', value: 3 },
        amrapFinisher: false,
      })
    })
  })

  describe('invalid inputs', () => {
    it('rejects zero', () => {
      const result = parse('0')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sets must be at least 1')
    })

    it('rejects negative values', () => {
      const result = parse('-1')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects values above max (99)', () => {
      const result = parse('100')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sets cannot exceed 99')
    })

    it('rejects range with zero', () => {
      const result = parse('0-3')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sets must be at least 1')
    })

    it('rejects range with max above limit', () => {
      const result = parse('3-100')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sets cannot exceed 99')
    })

    it('rejects range where min >= max', () => {
      const result = parse('3-3')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('range min must be less than max')
    })

    it('rejects range where min > max', () => {
      const result = parse('5-3')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('range min must be less than max')
    })

    it('rejects non-numeric input', () => {
      const result = parse('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects decimals (sets must be integers)', () => {
      const result = parse('3.5')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects multiple ranges (3-4-5)', () => {
      const result = parse('3-4-5')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects AMRAP with range (range+AMRAP not supported)', () => {
      const result = parse('3-4+AMRAP')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects comma-separated values (not supported for sets)', () => {
      const result = parse('3,4,5')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects just +AMRAP without number', () => {
      const result = parse('+AMRAP')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validate function', () => {
    it('returns true for valid input', () => {
      expect(validate('3')).toBe(true)
      expect(validate('3-4')).toBe(true)
      expect(validate('3+AMRAP')).toBe(true)
      expect(validate('')).toBe(true)
    })

    it('returns false for invalid input', () => {
      expect(validate('0')).toBe(false)
      expect(validate('100')).toBe(false)
      expect(validate('abc')).toBe(false)
      expect(validate('3.5')).toBe(false)
    })
  })
})
