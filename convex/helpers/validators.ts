import { v } from "convex/values";

/**
 * Validator for exercise row input (without dayId/order - computed at insert time)
 */
export const exerciseRowInput = v.object({
  kind: v.literal("exercise"),
  libraryExerciseId: v.id("exerciseLibrary"),
  weight: v.string(),
  reps: v.string(),
  sets: v.string(),
  rest: v.optional(v.string()),
  effort: v.optional(v.string()),
  notes: v.string(),
  groupId: v.optional(v.string()),
});

/**
 * Validator for circuit header row input (without dayId/order - computed at insert time)
 */
export const circuitHeaderRowInput = v.object({
  kind: v.literal("circuitHeader"),
  groupId: v.string(),
  name: v.string(),
  sets: v.optional(v.string()),
});

/**
 * Validator for any row input (union of exercise and circuitHeader)
 */
export const rowInput = v.union(exerciseRowInput, circuitHeaderRowInput);

/**
 * Validator for day input with rows (for bulk operations)
 */
export const dayInput = v.object({
  dayLabel: v.string(),
  rows: v.array(rowInput),
});

/**
 * Validator for exercise field updates
 */
export const exerciseFieldUpdates = v.object({
  libraryExerciseId: v.optional(v.id("exerciseLibrary")),
  weight: v.optional(v.string()),
  reps: v.optional(v.string()),
  sets: v.optional(v.string()),
  rest: v.optional(v.union(v.string(), v.null())), // null to clear
  effort: v.optional(v.union(v.string(), v.null())), // null to clear
  notes: v.optional(v.string()),
  groupId: v.optional(v.union(v.string(), v.null())), // null to clear
});

/**
 * Validator for circuit header field updates
 */
export const circuitHeaderFieldUpdates = v.object({
  name: v.optional(v.string()),
  sets: v.optional(v.union(v.string(), v.null())), // null to clear
  notes: v.optional(v.union(v.string(), v.null())), // null to clear
});
