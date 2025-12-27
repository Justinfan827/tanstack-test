// Constants
export const MAX_WEIGHT = 2000
export const MAX_REPS = 999
export const MAX_SETS = 99
export const MAX_REST_SECONDS = 3600 // 60 minutes
export const MAX_EFFORT = 10
export const MIN_EFFORT = 0

// Weight types
export type WeightValue =
  | { type: 'fixed'; value: number }
  | { type: 'range'; min: number; max: number }

export type ParsedWeight = {
  values: WeightValue[]
  perSide: boolean
  bodyweight: boolean
  added?: WeightValue
}

// Reps types
export type RepValue =
  | { type: 'fixed'; value: number }
  | { type: 'range'; min: number; max: number }
  | { type: 'amrap' }
  | { type: 'time'; seconds: number }
  | { type: 'timeRange'; minSeconds: number; maxSeconds: number }

export type ParsedReps = {
  values: RepValue[]
}

// Sets types
export type ParsedSets = {
  count:
    | { type: 'fixed'; value: number }
    | { type: 'range'; min: number; max: number }
  amrapFinisher: boolean
}

// Rest types
export type RestValue =
  | { type: 'fixed'; seconds: number }
  | { type: 'range'; minSeconds: number; maxSeconds: number }

export type ParsedRest = {
  values: RestValue[]
}

// Effort types (RPE/RIR - unitless)
export type EffortValue =
  | { type: 'fixed'; value: number }
  | { type: 'range'; min: number; max: number }

export type ParsedEffort = {
  values: EffortValue[]
}

// Generic parse result wrapper
export type ParseResult<T> = {
  value: T | null // null if empty string
  valid: boolean
  errors: string[]
}
