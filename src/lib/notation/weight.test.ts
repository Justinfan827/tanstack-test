import { describe, expect, it } from 'vitest'
import { parse, validate } from './weight'

describe('weight parser', () => {
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
      const result = parse('125')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 125 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses zero weight', () => {
      const result = parse('0')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 0 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses max weight (2000)', () => {
      const result = parse('2000')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 2000 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses decimal with 1 place', () => {
      const result = parse('125.5')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 125.5 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses decimal with 2 places', () => {
      const result = parse('125.25')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 125.25 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses range', () => {
      const result = parse('125-135')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 125, max: 135 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses range with decimals', () => {
      const result = parse('125.5-135.25')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 125.5, max: 135.25 }],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses per-side with space (ES)', () => {
      const result = parse('50 ES')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 50 }],
        perSide: true,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses per-side without space (ES)', () => {
      const result = parse('50ES')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 50 }],
        perSide: true,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses per-side with slash (E/S)', () => {
      const result = parse('50 E/S')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 50 }],
        perSide: true,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses per-side lowercase', () => {
      const result = parse('50 es')
      expect(result.valid).toBe(true)
      expect(result.value?.perSide).toBe(true)
    })

    it('parses per-side with range', () => {
      const result = parse('50-60 ES')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 50, max: 60 }],
        perSide: true,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses bodyweight (BW)', () => {
      const result = parse('BW')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 0 }],
        perSide: false,
        bodyweight: true,
        added: undefined,
      })
    })

    it('parses bodyweight lowercase', () => {
      const result = parse('bw')
      expect(result.valid).toBe(true)
      expect(result.value?.bodyweight).toBe(true)
    })

    it('parses bodyweight + fixed', () => {
      const result = parse('BW+25')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 25 }],
        perSide: false,
        bodyweight: true,
        added: { type: 'fixed', value: 25 },
      })
    })

    it('parses bodyweight + range', () => {
      const result = parse('BW+20-30')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'range', min: 20, max: 30 }],
        perSide: false,
        bodyweight: true,
        added: { type: 'range', min: 20, max: 30 },
      })
    })

    it('parses bodyweight + per-side', () => {
      const result = parse('BW+25 ES')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [{ type: 'fixed', value: 25 }],
        perSide: true,
        bodyweight: true,
        added: { type: 'fixed', value: 25 },
      })
    })

    it('parses per-set values (comma-separated)', () => {
      const result = parse('125,130,135')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 125 },
          { type: 'fixed', value: 130 },
          { type: 'fixed', value: 135 },
        ],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses per-set with whitespace around commas', () => {
      const result = parse('125 , 130 , 135')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 125 },
          { type: 'fixed', value: 130 },
          { type: 'fixed', value: 135 },
        ],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses mixed range and fixed per-set', () => {
      const result = parse('125-135,140,145')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'range', min: 125, max: 135 },
          { type: 'fixed', value: 140 },
          { type: 'fixed', value: 145 },
        ],
        perSide: false,
        bodyweight: false,
        added: undefined,
      })
    })

    it('parses mixed BW and regular weights (allowed)', () => {
      const result = parse('BW,125,130')
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({
        values: [
          { type: 'fixed', value: 0 },
          { type: 'fixed', value: 125 },
          { type: 'fixed', value: 130 },
        ],
        perSide: false,
        bodyweight: true,
        added: undefined,
      })
    })

    it('parses with leading/trailing whitespace', () => {
      const result = parse('  125  ')
      expect(result.valid).toBe(true)
      expect(result.value?.values).toEqual([{ type: 'fixed', value: 125 }])
    })
  })

  describe('invalid inputs', () => {
    it('rejects negative values', () => {
      const result = parse('-125')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects values above max (2000)', () => {
      const result = parse('2001')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects more than 2 decimal places', () => {
      const result = parse('125.123')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min >= max', () => {
      const result = parse('135-135')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects range where min > max', () => {
      const result = parse('135-125')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects non-numeric input', () => {
      const result = parse('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects malformed range (double dash)', () => {
      const result = parse('125--135')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects duplicate ES suffix', () => {
      const result = parse('50 ES ES')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects partial invalid in comma list', () => {
      const result = parse('125,abc,135')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('invalid weight segment: "abc"')
    })

    it('rejects empty segment in comma list', () => {
      const result = parse('125,,135')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects BW with invalid added value', () => {
      const result = parse('BW+abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects BW with added value above max', () => {
      const result = parse('BW+2001')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validate function', () => {
    it('returns true for valid input', () => {
      expect(validate('125')).toBe(true)
      expect(validate('125-135')).toBe(true)
      expect(validate('50 ES')).toBe(true)
      expect(validate('BW')).toBe(true)
      expect(validate('BW+25')).toBe(true)
      expect(validate('125,130,135')).toBe(true)
      expect(validate('')).toBe(true)
    })

    it('returns false for invalid input', () => {
      expect(validate('2001')).toBe(false)
      expect(validate('-125')).toBe(false)
      expect(validate('abc')).toBe(false)
      expect(validate('125.123')).toBe(false)
    })
  })
})
