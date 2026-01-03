import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authId: v.string(),
    
    // App-level role (separate from Better Auth admin role)
    role: v.union(v.literal("trainer"), v.literal("client")),
    
    // Trainer mode settings
    trustMode: v.union(v.literal("high"), v.literal("low")),
    
    // Trainer-client relationship
    trainerId: v.optional(v.id("users")),
    
    // Client-specific fitness data
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    heightValue: v.optional(v.number()),
    heightUnit: v.optional(v.union(v.literal("cm"), v.literal("in"))),
    weightValue: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
  })
    .index("by_auth_id", ["authId"])
    .index("by_trainer_id", ["trainerId"])
    .index("by_role", ["role"]),

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
    clientId: v.string(),
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
        clientId: v.string(),
        dayId: v.id("days"),
        order: v.number(),
        libraryExerciseId: v.optional(v.id("exerciseLibrary")), // optional for empty rows
        weight: v.string(),
        reps: v.string(),
        sets: v.string(),
        rest: v.optional(v.string()),
        effort: v.optional(v.string()),
        notes: v.string(),
        groupId: v.optional(v.string()),
      }),
      v.object({
        kind: v.literal("header"),
        clientId: v.string(),
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

  // Maps agent threads to programs for scoped chat history
  programThreads: defineTable({
    programId: v.id("programs"),
    threadId: v.string(), // from agent component
    userId: v.id("users"),
  })
    .index("by_program", ["programId"])
    .index("by_thread", ["threadId"]),

  // TODO: Pending changes tables for low trust mode
  // - pendingExerciseFieldUpdates
  // - pendingExerciseAdds
  // - pendingExerciseDeletes
  // - pendingDayAdds / pendingDayDeletes / pendingDayReplaces
});
