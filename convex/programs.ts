import { internalMutation, internalQuery, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { userQuery, userMutation } from "./functions";
import { verifyProgramOwnership } from "./helpers/auth";
import { deleteDaysForProgram } from "./helpers/ordering";
import { dayInput } from "./helpers/validators";
import { Id } from "./_generated/dataModel";

// Types for input
type RowInput =
  | {
      kind: "exercise";
      libraryExerciseId: Id<"exerciseLibrary">;
      weight: string;
      reps: string;
      sets: string;
      notes: string;
      groupId?: string;
    }
  | {
      kind: "header";
      groupId: string;
      name: string;
      sets?: string;
    };

type DayInput = {
  dayLabel: string;
  rows: RowInput[];
};

/**
 * Helper to insert days with rows for a program.
 */
async function insertDaysForProgram(
  ctx: MutationCtx,
  programId: Id<"programs">,
  days: DayInput[]
) {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const dayInput = days[dayIndex];
    const dayId = await ctx.db.insert("days", {
      clientId: crypto.randomUUID(),
      programId,
      dayLabel: dayInput.dayLabel,
      order: dayIndex,
    });

    for (let rowIndex = 0; rowIndex < dayInput.rows.length; rowIndex++) {
      const row = dayInput.rows[rowIndex];
      if (row.kind === "exercise") {
        await ctx.db.insert("programRows", {
          kind: "exercise",
          clientId: crypto.randomUUID(),
          dayId,
          order: rowIndex,
          libraryExerciseId: row.libraryExerciseId,
          weight: row.weight,
          reps: row.reps,
          sets: row.sets,
          notes: row.notes,
          groupId: row.groupId,
        });
      } else {
        await ctx.db.insert("programRows", {
          kind: "header",
          clientId: crypto.randomUUID(),
          dayId,
          order: rowIndex,
          groupId: row.groupId,
          name: row.name,
          sets: row.sets,
        });
      }
    }
  }
}

/**
 * Create a new program.
 */
export const createProgram = userMutation({
  args: {
    name: v.string(),
    days: v.optional(v.array(dayInput)),
  },
  returns: v.id("programs"),
  handler: async (ctx, args) => {
    const programId = await ctx.db.insert("programs", {
      name: args.name,
      userId: ctx.userId,
    });

    if (args.days && args.days.length > 0) {
      await insertDaysForProgram(ctx, programId, args.days as DayInput[]);
    }

    return programId;
  },
});

/**
 * Update a program's name.
 */
export const updateProgram = userMutation({
  args: {
    programId: v.id("programs"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    await ctx.db.patch(args.programId, { name: args.name });

    return null;
  },
});

/**
 * Delete a program and all its days/rows.
 * Trainers can delete programs they assigned to clients.
 */
export const deleteProgram = userMutation({
  args: {
    programId: v.id("programs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");

    // Allow delete if: owner OR trainer who assigned it
    const isOwner = program.userId === ctx.userId;
    const isAssigner = program.assignedByTrainerId === ctx.userId;
    if (!isOwner && !isAssigner) {
      throw new Error("Not authorized to delete this program");
    }

    await deleteDaysForProgram(ctx, args.programId);
    await ctx.db.delete(args.programId);

    return null;
  },
});

/**
 * Duplicate a program.
 */
export const duplicateProgram = userMutation({
  args: {
    programId: v.id("programs"),
  },
  returns: v.id("programs"),
  handler: async (ctx, args) => {
    const program = await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    const newProgramId = await ctx.db.insert("programs", {
      name: `${program.name} (copy)`,
      userId: ctx.userId,
    });

    // Get all days
    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", args.programId))
      .order("asc")
      .collect();

    for (const day of days) {
      const newDayId = await ctx.db.insert("days", {
        clientId: crypto.randomUUID(),
        programId: newProgramId,
        dayLabel: day.dayLabel,
        order: day.order,
      });

      // Copy rows with new groupIds
      const rows = await ctx.db
        .query("programRows")
        .withIndex("by_day_and_order", (q) => q.eq("dayId", day._id))
        .order("asc")
        .collect();

      const groupIdMap = new Map<string, string>();

      for (const row of rows) {
        if (row.kind === "exercise") {
          let newGroupId = row.groupId;
          if (row.groupId) {
            if (!groupIdMap.has(row.groupId)) {
              groupIdMap.set(row.groupId, crypto.randomUUID());
            }
            newGroupId = groupIdMap.get(row.groupId);
          }
          await ctx.db.insert("programRows", {
            kind: "exercise",
            clientId: crypto.randomUUID(),
            dayId: newDayId,
            order: row.order,
            libraryExerciseId: row.libraryExerciseId,
            weight: row.weight,
            reps: row.reps,
            sets: row.sets,
            notes: row.notes,
            groupId: newGroupId,
          });
        } else {
          if (!groupIdMap.has(row.groupId)) {
            groupIdMap.set(row.groupId, crypto.randomUUID());
          }
          const newGroupId = groupIdMap.get(row.groupId)!;
          await ctx.db.insert("programRows", {
            kind: "header",
            clientId: crypto.randomUUID(),
            dayId: newDayId,
            order: row.order,
            groupId: newGroupId,
            name: row.name,
            sets: row.sets,
          });
        }
      }
    }

    return newProgramId;
  },
});

/**
 * Replace entire program contents (bulk operation for AI rewrites).
 */
export const replaceProgram = userMutation({
  args: {
    programId: v.id("programs"),
    days: v.array(dayInput),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    // Delete existing days and rows
    await deleteDaysForProgram(ctx, args.programId);

    // Insert new days and rows
    await insertDaysForProgram(ctx, args.programId, args.days as DayInput[]);

    return null;
  },
});

/**
 * List user's programs (summary only).
 * Excludes assigned programs (those are shown in client detail page).
 */
export const listUserPrograms = userQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("programs"),
      _creationTime: v.number(),
      name: v.string(),
      dayCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .collect();

    const result = [];
    for (const program of programs) {
      // Skip assigned programs - they belong to clients
      if (program.assignedByTrainerId) continue;

      const days = await ctx.db
        .query("days")
        .withIndex("by_program", (q) => q.eq("programId", program._id))
        .collect();

      result.push({
        _id: program._id,
        _creationTime: program._creationTime,
        name: program.name,
        dayCount: days.length,
      });
    }

    return result;
  },
});

/**
 * Get full program with all days and rows (denormalized for UI).
 */
export const getProgram = userQuery({
  args: {
    programId: v.id("programs"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("programs"),
      _creationTime: v.number(),
      name: v.string(),
      days: v.array(
        v.object({
          _id: v.id("days"),
          _creationTime: v.number(),
          clientId: v.string(),
          dayLabel: v.string(),
          order: v.number(),
          rows: v.array(
            v.union(
              v.object({
                _id: v.id("programRows"),
                _creationTime: v.number(),
                clientId: v.string(),
                kind: v.literal("exercise"),
                order: v.number(),
                libraryExerciseId: v.optional(v.id("exerciseLibrary")),
                weight: v.string(),
                reps: v.string(),
                sets: v.string(),
                effort: v.optional(v.string()),
                rest: v.optional(v.string()),
                notes: v.string(),
                groupId: v.optional(v.string()),
              }),
              v.object({
                _id: v.id("programRows"),
                _creationTime: v.number(),
                clientId: v.string(),
                kind: v.literal("header"),
                order: v.number(),
                groupId: v.string(),
                name: v.string(),
                sets: v.optional(v.string()),
              })
            )
          ),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) return null;

    // Allow access if: owner OR trainer who assigned it
    const isOwner = program.userId === ctx.userId;
    const isAssigner = program.assignedByTrainerId === ctx.userId;
    if (!isOwner && !isAssigner) return null;

    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", args.programId))
      .order("asc")
      .collect();

    const daysWithRows = [];
    for (const day of days) {
      const rows = await ctx.db
        .query("programRows")
        .withIndex("by_day_and_order", (q) => q.eq("dayId", day._id))
        .order("asc")
        .collect();

      daysWithRows.push({
        _id: day._id,
        _creationTime: day._creationTime,
        clientId: day.clientId,
        dayLabel: day.dayLabel,
        order: day.order,
        rows: rows.map((row) => {
          if (row.kind === "exercise") {
            return {
              _id: row._id,
              _creationTime: row._creationTime,
              clientId: row.clientId,
              kind: "exercise" as const,
              order: row.order,
              libraryExerciseId: row.libraryExerciseId,
              weight: row.weight,
              reps: row.reps,
              sets: row.sets,
              effort: row.effort,
              rest: row.rest,
              notes: row.notes,
              groupId: row.groupId,
            };
          } else {
            return {
              _id: row._id,
              _creationTime: row._creationTime,
              clientId: row.clientId,
              kind: "header" as const,
              order: row.order,
              groupId: row.groupId,
              name: row.name,
              sets: row.sets,
            };
          }
        }),
      });
    }

    return {
      _id: program._id,
      _creationTime: program._creationTime,
      name: program.name,
      days: daysWithRows,
    };
  },
});

// =============================================================================
// Internal mutations/queries for agent tools (accept userId as parameter)
// =============================================================================

/**
 * Internal: Create a new program (for agent tools).
 */
export const internalCreateProgram = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    days: v.optional(v.array(dayInput)),
  },
  returns: v.id("programs"),
  handler: async (ctx, args) => {
    const programId = await ctx.db.insert("programs", {
      name: args.name,
      userId: args.userId,
    });

    if (args.days && args.days.length > 0) {
      await insertDaysForProgram(ctx, programId, args.days as DayInput[]);
    }

    return programId;
  },
});

/**
 * Internal: List user's programs (for agent tools).
 */
export const internalListUserPrograms = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("programs"),
      _creationTime: v.number(),
      name: v.string(),
      dayCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const result = [];
    for (const program of programs) {
      const days = await ctx.db
        .query("days")
        .withIndex("by_program", (q) => q.eq("programId", program._id))
        .collect();

      result.push({
        _id: program._id,
        _creationTime: program._creationTime,
        name: program.name,
        dayCount: days.length,
      });
    }

    return result;
  },
});

/**
 * Internal: Get full program (for agent tools).
 */
export const internalGetProgram = internalQuery({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("programs"),
      _creationTime: v.number(),
      name: v.string(),
      days: v.array(
        v.object({
          _id: v.id("days"),
          _creationTime: v.number(),
          clientId: v.string(),
          dayLabel: v.string(),
          order: v.number(),
          rows: v.array(
            v.union(
              v.object({
                _id: v.id("programRows"),
                _creationTime: v.number(),
                clientId: v.string(),
                kind: v.literal("exercise"),
                order: v.number(),
                libraryExerciseId: v.optional(v.id("exerciseLibrary")),
                weight: v.string(),
                reps: v.string(),
                sets: v.string(),
                effort: v.optional(v.string()),
                rest: v.optional(v.string()),
                notes: v.string(),
                groupId: v.optional(v.string()),
              }),
              v.object({
                _id: v.id("programRows"),
                _creationTime: v.number(),
                clientId: v.string(),
                kind: v.literal("header"),
                order: v.number(),
                groupId: v.string(),
                name: v.string(),
                sets: v.optional(v.string()),
              })
            )
          ),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.userId !== args.userId) {
      return null;
    }

    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", args.programId))
      .order("asc")
      .collect();

    const daysWithRows = [];
    for (const day of days) {
      const rows = await ctx.db
        .query("programRows")
        .withIndex("by_day_and_order", (q) => q.eq("dayId", day._id))
        .order("asc")
        .collect();

      daysWithRows.push({
        _id: day._id,
        _creationTime: day._creationTime,
        clientId: day.clientId,
        dayLabel: day.dayLabel,
        order: day.order,
        rows: rows.map((row) => {
          if (row.kind === "exercise") {
            return {
              _id: row._id,
              _creationTime: row._creationTime,
              clientId: row.clientId,
              kind: "exercise" as const,
              order: row.order,
              libraryExerciseId: row.libraryExerciseId,
              weight: row.weight,
              reps: row.reps,
              sets: row.sets,
              effort: row.effort,
              rest: row.rest,
              notes: row.notes,
              groupId: row.groupId,
            };
          } else {
            return {
              _id: row._id,
              _creationTime: row._creationTime,
              clientId: row.clientId,
              kind: "header" as const,
              order: row.order,
              groupId: row.groupId,
              name: row.name,
              sets: row.sets,
            };
          }
        }),
      });
    }

    return {
      _id: program._id,
      _creationTime: program._creationTime,
      name: program.name,
      days: daysWithRows,
    };
  },
});

/**
 * Internal: Update a program's name (for agent tools).
 */
export const internalUpdateProgram = internalMutation({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, args.userId);
    await ctx.db.patch(args.programId, { name: args.name });
    return null;
  },
});

/**
 * Internal: Delete a program (for agent tools).
 */
export const internalDeleteProgram = internalMutation({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, args.userId);
    await deleteDaysForProgram(ctx, args.programId);
    await ctx.db.delete(args.programId);
    return null;
  },
});

/**
 * Internal: Duplicate a program (for agent tools).
 */
export const internalDuplicateProgram = internalMutation({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
  },
  returns: v.id("programs"),
  handler: async (ctx, args) => {
    const program = await verifyProgramOwnership(ctx, args.programId, args.userId);

    const newProgramId = await ctx.db.insert("programs", {
      name: `${program.name} (copy)`,
      userId: args.userId,
    });

    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", args.programId))
      .order("asc")
      .collect();

    for (const day of days) {
      const newDayId = await ctx.db.insert("days", {
        clientId: crypto.randomUUID(),
        programId: newProgramId,
        dayLabel: day.dayLabel,
        order: day.order,
      });

      const rows = await ctx.db
        .query("programRows")
        .withIndex("by_day_and_order", (q) => q.eq("dayId", day._id))
        .order("asc")
        .collect();

      const groupIdMap = new Map<string, string>();

      for (const row of rows) {
        if (row.kind === "exercise") {
          let newGroupId = row.groupId;
          if (row.groupId) {
            if (!groupIdMap.has(row.groupId)) {
              groupIdMap.set(row.groupId, crypto.randomUUID());
            }
            newGroupId = groupIdMap.get(row.groupId);
          }
          await ctx.db.insert("programRows", {
            kind: "exercise",
            clientId: crypto.randomUUID(),
            dayId: newDayId,
            order: row.order,
            libraryExerciseId: row.libraryExerciseId,
            weight: row.weight,
            reps: row.reps,
            sets: row.sets,
            notes: row.notes,
            groupId: newGroupId,
          });
        } else {
          if (!groupIdMap.has(row.groupId)) {
            groupIdMap.set(row.groupId, crypto.randomUUID());
          }
          const newGroupId = groupIdMap.get(row.groupId)!;
          await ctx.db.insert("programRows", {
            kind: "header",
            clientId: crypto.randomUUID(),
            dayId: newDayId,
            order: row.order,
            groupId: newGroupId,
            name: row.name,
            sets: row.sets,
          });
        }
      }
    }

    return newProgramId;
  },
});

/**
 * Internal: Replace entire program contents (for agent tools).
 */
export const internalReplaceProgram = internalMutation({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
    days: v.array(dayInput),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, args.userId);
    await deleteDaysForProgram(ctx, args.programId);
    await insertDaysForProgram(ctx, args.programId, args.days as DayInput[]);
    return null;
  },
});

// =============================================================================
// Program Assignment (trainer -> client)
// =============================================================================

/**
 * Assign a program to a client by copying it.
 * The copy belongs to the client (userId = clientId).
 */
export const assignProgramToClient = userMutation({
  args: {
    programId: v.id("programs"),
    clientId: v.id("users"),
  },
  returns: v.id("programs"),
  handler: async (ctx, args) => {
    // Verify trainer owns the source program
    const program = await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    // Verify client exists and belongs to this trainer
    const client = await ctx.db.get(args.clientId);
    if (!client || client.trainerId !== ctx.userId) {
      throw new Error("Client not found or not your client");
    }

    // Create program copy owned by client
    const newProgramId = await ctx.db.insert("programs", {
      name: program.name,
      userId: args.clientId,
      assignedByTrainerId: ctx.userId,
      templateProgramId: args.programId,
    });

    // Copy all days and rows (reuse duplicate logic)
    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", args.programId))
      .order("asc")
      .collect();

    for (const day of days) {
      const newDayId = await ctx.db.insert("days", {
        clientId: crypto.randomUUID(),
        programId: newProgramId,
        dayLabel: day.dayLabel,
        order: day.order,
      });

      const rows = await ctx.db
        .query("programRows")
        .withIndex("by_day_and_order", (q) => q.eq("dayId", day._id))
        .order("asc")
        .collect();

      const groupIdMap = new Map<string, string>();

      for (const row of rows) {
        if (row.kind === "exercise") {
          let newGroupId = row.groupId;
          if (row.groupId) {
            if (!groupIdMap.has(row.groupId)) {
              groupIdMap.set(row.groupId, crypto.randomUUID());
            }
            newGroupId = groupIdMap.get(row.groupId);
          }
          await ctx.db.insert("programRows", {
            kind: "exercise",
            clientId: crypto.randomUUID(),
            dayId: newDayId,
            order: row.order,
            libraryExerciseId: row.libraryExerciseId,
            weight: row.weight,
            reps: row.reps,
            sets: row.sets,
            notes: row.notes,
            groupId: newGroupId,
          });
        } else {
          if (!groupIdMap.has(row.groupId)) {
            groupIdMap.set(row.groupId, crypto.randomUUID());
          }
          const newGroupId = groupIdMap.get(row.groupId)!;
          await ctx.db.insert("programRows", {
            kind: "header",
            clientId: crypto.randomUUID(),
            dayId: newDayId,
            order: row.order,
            groupId: newGroupId,
            name: row.name,
            sets: row.sets,
          });
        }
      }
    }

    return newProgramId;
  },
});

/**
 * Get programs assigned to a specific client.
 * Only the trainer who assigned them can view.
 */
export const getClientPrograms = userQuery({
  args: {
    clientId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("programs"),
      _creationTime: v.number(),
      name: v.string(),
      dayCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify this is the trainer's client
    const client = await ctx.db.get(args.clientId);
    if (!client || client.trainerId !== ctx.userId) {
      return [];
    }

    // Get programs owned by client that were assigned by this trainer
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", args.clientId))
      .collect();

    const result = [];
    for (const program of programs) {
      // Only show programs this trainer assigned
      if (program.assignedByTrainerId !== ctx.userId) continue;

      const days = await ctx.db
        .query("days")
        .withIndex("by_program", (q) => q.eq("programId", program._id))
        .collect();

      result.push({
        _id: program._id,
        _creationTime: program._creationTime,
        name: program.name,
        dayCount: days.length,
      });
    }

    return result;
  },
});
