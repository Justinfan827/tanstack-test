import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authId: v.string(),
    trustMode: v.union(v.literal("high"), v.literal("low")),
  }).index("by_auth_id", ["authId"]),

  exerciseLibrary: defineTable({
    name: v.string(),
    userId: v.optional(v.id("users")), // null = global default
  })
    .index("by_user", ["userId"])
    .searchIndex("search_name", { searchField: "name" }),

  programs: defineTable({
    name: v.string(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]),

  days: defineTable({
    programId: v.id("programs"),
    dayLabel: v.string(),
    order: v.number(), // integer, renumber on reorder
  })
    .index("by_program", ["programId"])
    .index("by_program_and_order", ["programId", "order"]),

  programRows: defineTable(
    v.union(
      v.object({
        kind: v.literal("exercise"),
        dayId: v.id("days"),
        order: v.number(),
        libraryExerciseId: v.id("exerciseLibrary"),
        weight: v.string(),
        reps: v.string(),
        sets: v.string(),
        notes: v.string(),
        groupId: v.optional(v.string()),
      }),
      v.object({
        kind: v.literal("header"),
        dayId: v.id("days"),
        order: v.number(),
        groupId: v.string(),
        name: v.string(),
        sets: v.optional(v.string()),
      }),
    )
  )
    .index("by_day", ["dayId"])
    .index("by_day_and_order", ["dayId", "order"])
    .index("by_group", ["groupId"]),

  // TODO: Pending changes tables for low trust mode
  // - pendingExerciseFieldUpdates
  // - pendingExerciseAdds
  // - pendingExerciseDeletes
  // - pendingDayAdds / pendingDayDeletes / pendingDayReplaces
});
