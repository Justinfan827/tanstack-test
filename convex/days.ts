import { internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { userMutation } from "./functions";
import { verifyProgramOwnership, verifyDayOwnership } from "./helpers/auth";
import { getNextDayOrder, renumberDays, deleteRowsForDay } from "./helpers/ordering";
import { rowInput } from "./helpers/validators";
import { Id } from "./_generated/dataModel";

// Type for row input
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

/**
 * Helper to insert rows for a day.
 */
async function insertRowsForDay(
  ctx: MutationCtx,
  dayId: Id<"days">,
  rows: RowInput[]
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind === "exercise") {
      await ctx.db.insert("programRows", {
        kind: "exercise",
        clientId: crypto.randomUUID(),
        dayId,
        order: i,
        libraryExerciseId: row.libraryExerciseId,
        weight: row.weight,
        reps: row.reps,
        sets: row.sets,
        notes: row.notes,
        groupId: row.groupId,
      });
    } else {
      await ctx.db.insert("programRows", {
        kind: "circuitHeader",
        clientId: crypto.randomUUID(),
        dayId,
        order: i,
        groupId: row.groupId,
        name: row.name,
        sets: row.sets,
      });
    }
  }
}

/**
 * Add a day to a program.
 */
export const addDay = userMutation({
  args: {
    programId: v.id("programs"),
    dayLabel: v.string(),
    rows: v.optional(v.array(rowInput)),
  },
  returns: v.id("days"),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    const order = await getNextDayOrder(ctx, args.programId);

    const dayId = await ctx.db.insert("days", {
      clientId: crypto.randomUUID(),
      programId: args.programId,
      dayLabel: args.dayLabel,
      order,
    });

    if (args.rows && args.rows.length > 0) {
      await insertRowsForDay(ctx, dayId, args.rows as RowInput[]);
    }

    return dayId;
  },
});

/**
 * Update a day's label.
 */
export const updateDay = userMutation({
  args: {
    dayId: v.id("days"),
    dayLabel: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    await ctx.db.patch(args.dayId, { dayLabel: args.dayLabel });

    return null;
  },
});

/**
 * Delete a day and all its rows.
 */
export const deleteDay = userMutation({
  args: {
    dayId: v.id("days"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { day } = await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    await deleteRowsForDay(ctx, args.dayId);
    await ctx.db.delete(args.dayId);
    await renumberDays(ctx, day.programId);

    return null;
  },
});

/**
 * Move a day to a new position.
 * Validates fromOrder to detect stale tool calls.
 */
export const moveDay = userMutation({
  args: {
    dayId: v.id("days"),
    fromOrder: v.number(),
    toOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { day } = await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    if (day.order !== args.fromOrder) {
      throw new Error(
        `Stale move: day is at position ${day.order}, expected ${args.fromOrder}`
      );
    }

    if (args.fromOrder === args.toOrder) {
      return null;
    }

    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", day.programId))
      .order("asc")
      .collect();

    const reordered = days.filter((d) => d._id !== args.dayId);
    const targetIndex = Math.min(Math.max(0, args.toOrder), reordered.length);
    reordered.splice(targetIndex, 0, day);

    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        await ctx.db.patch(reordered[i]._id, { order: i });
      }
    }

    return null;
  },
});

/**
 * Duplicate a day within the same program.
 */
export const duplicateDay = userMutation({
  args: {
    dayId: v.id("days"),
  },
  returns: v.id("days"),
  handler: async (ctx, args) => {
    const { day } = await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    const order = await getNextDayOrder(ctx, day.programId);

    const newDayId = await ctx.db.insert("days", {
      clientId: crypto.randomUUID(),
      programId: day.programId,
      dayLabel: `${day.dayLabel} (copy)`,
      order,
    });

    // Copy all rows
    const rows = await ctx.db
      .query("programRows")
      .withIndex("by_day_and_order", (q) => q.eq("dayId", args.dayId))
      .order("asc")
      .collect();

    // Map old groupIds to new groupIds for consistent grouping
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
          kind: "circuitHeader",
          clientId: crypto.randomUUID(),
          dayId: newDayId,
          order: row.order,
          groupId: newGroupId,
          name: row.name,
          sets: row.sets,
        });
      }
    }

    return newDayId;
  },
});

/**
 * Replace all rows in a day (bulk operation for AI rewrites).
 */
export const replaceDay = userMutation({
  args: {
    dayId: v.id("days"),
    rows: v.array(rowInput),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    // Delete existing rows
    await deleteRowsForDay(ctx, args.dayId);

    // Insert new rows
    await insertRowsForDay(ctx, args.dayId, args.rows as RowInput[]);

    return null;
  },
});

// =============================================================================
// Internal mutations for agent tools (accept userId as parameter)
// =============================================================================

export const internalAddDay = internalMutation({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
    dayLabel: v.string(),
    rows: v.optional(v.array(rowInput)),
  },
  returns: v.id("days"),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, args.userId);

    const order = await getNextDayOrder(ctx, args.programId);

    const dayId = await ctx.db.insert("days", {
      clientId: crypto.randomUUID(),
      programId: args.programId,
      dayLabel: args.dayLabel,
      order,
    });

    if (args.rows && args.rows.length > 0) {
      await insertRowsForDay(ctx, dayId, args.rows as RowInput[]);
    }

    return dayId;
  },
});

export const internalUpdateDay = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
    dayLabel: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, args.userId);

    await ctx.db.patch(args.dayId, { dayLabel: args.dayLabel });

    return null;
  },
});

export const internalDeleteDay = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { day } = await verifyDayOwnership(ctx, args.dayId, args.userId);

    await deleteRowsForDay(ctx, args.dayId);
    await ctx.db.delete(args.dayId);
    await renumberDays(ctx, day.programId);

    return null;
  },
});

export const internalMoveDay = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
    fromOrder: v.number(),
    toOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { day } = await verifyDayOwnership(ctx, args.dayId, args.userId);

    if (day.order !== args.fromOrder) {
      throw new Error(
        `Stale move: day is at position ${day.order}, expected ${args.fromOrder}`
      );
    }

    if (args.fromOrder === args.toOrder) {
      return null;
    }

    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", day.programId))
      .order("asc")
      .collect();

    const reordered = days.filter((d) => d._id !== args.dayId);
    const targetIndex = Math.min(Math.max(0, args.toOrder), reordered.length);
    reordered.splice(targetIndex, 0, day);

    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        await ctx.db.patch(reordered[i]._id, { order: i });
      }
    }

    return null;
  },
});

export const internalDuplicateDay = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
  },
  returns: v.id("days"),
  handler: async (ctx, args) => {
    const { day } = await verifyDayOwnership(ctx, args.dayId, args.userId);

    const order = await getNextDayOrder(ctx, day.programId);

    const newDayId = await ctx.db.insert("days", {
      clientId: crypto.randomUUID(),
      programId: day.programId,
      dayLabel: `${day.dayLabel} (copy)`,
      order,
    });

    const rows = await ctx.db
      .query("programRows")
      .withIndex("by_day_and_order", (q) => q.eq("dayId", args.dayId))
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
          kind: "circuitHeader",
          clientId: crypto.randomUUID(),
          dayId: newDayId,
          order: row.order,
          groupId: newGroupId,
          name: row.name,
          sets: row.sets,
        });
      }
    }

    return newDayId;
  },
});

export const internalReplaceDay = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
    rows: v.array(rowInput),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, args.userId);

    await deleteRowsForDay(ctx, args.dayId);
    await insertRowsForDay(ctx, args.dayId, args.rows as RowInput[]);

    return null;
  },
});
