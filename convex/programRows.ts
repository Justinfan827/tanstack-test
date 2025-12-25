import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId, verifyDayOwnership, verifyRowOwnership } from "./helpers/auth";
import { getNextRowOrder, renumberRows } from "./helpers/ordering";
import { exerciseFieldUpdates, headerFieldUpdates } from "./helpers/validators";

/**
 * Add an exercise row to a day.
 */
export const addExercise = mutation({
  args: {
    dayId: v.id("days"),
    libraryExerciseId: v.id("exerciseLibrary"),
    weight: v.string(),
    reps: v.string(),
    sets: v.string(),
    notes: v.string(),
    groupId: v.optional(v.string()),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    await verifyDayOwnership(ctx, args.dayId, userId);

    // Validate exercise exists and user has access
    const exercise = await ctx.db.get(args.libraryExerciseId);
    if (!exercise) {
      throw new Error("Exercise not found in library");
    }
    if (exercise.userId !== undefined && exercise.userId !== userId) {
      throw new Error("Not authorized to use this exercise");
    }

    const order = await getNextRowOrder(ctx, args.dayId);

    return await ctx.db.insert("programRows", {
      kind: "exercise",
      dayId: args.dayId,
      order,
      libraryExerciseId: args.libraryExerciseId,
      weight: args.weight,
      reps: args.reps,
      sets: args.sets,
      notes: args.notes,
      groupId: args.groupId,
    });
  },
});

/**
 * Add a header row to a day.
 */
export const addHeader = mutation({
  args: {
    dayId: v.id("days"),
    name: v.string(),
    sets: v.optional(v.string()),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    await verifyDayOwnership(ctx, args.dayId, userId);

    const order = await getNextRowOrder(ctx, args.dayId);
    const groupId = crypto.randomUUID();

    return await ctx.db.insert("programRows", {
      kind: "header",
      dayId: args.dayId,
      order,
      groupId,
      name: args.name,
      sets: args.sets,
    });
  },
});

/**
 * Update an exercise row's fields.
 */
export const updateExercise = mutation({
  args: {
    rowId: v.id("programRows"),
    updates: exerciseFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.rowId, userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    // Validate libraryExerciseId if being updated
    if (args.updates.libraryExerciseId !== undefined) {
      const exercise = await ctx.db.get(args.updates.libraryExerciseId);
      if (!exercise) {
        throw new Error("Exercise not found in library");
      }
      if (exercise.userId !== undefined && exercise.userId !== userId) {
        throw new Error("Not authorized to use this exercise");
      }
    }

    // Build patch object, converting null groupId to undefined
    const patch: Record<string, unknown> = {};
    if (args.updates.libraryExerciseId !== undefined) {
      patch.libraryExerciseId = args.updates.libraryExerciseId;
    }
    if (args.updates.weight !== undefined) {
      patch.weight = args.updates.weight;
    }
    if (args.updates.reps !== undefined) {
      patch.reps = args.updates.reps;
    }
    if (args.updates.sets !== undefined) {
      patch.sets = args.updates.sets;
    }
    if (args.updates.notes !== undefined) {
      patch.notes = args.updates.notes;
    }
    if (args.updates.groupId !== undefined) {
      patch.groupId = args.updates.groupId === null ? undefined : args.updates.groupId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.rowId, patch);
    }

    return null;
  },
});

/**
 * Update a header row's fields.
 */
export const updateHeader = mutation({
  args: {
    rowId: v.id("programRows"),
    updates: headerFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.rowId, userId);

    if (row.kind !== "header") {
      throw new Error("Row is not a header");
    }

    const patch: Record<string, unknown> = {};
    if (args.updates.name !== undefined) {
      patch.name = args.updates.name;
    }
    if (args.updates.sets !== undefined) {
      patch.sets = args.updates.sets === null ? undefined : args.updates.sets;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.rowId, patch);
    }

    return null;
  },
});

/**
 * Delete a single row.
 */
export const deleteRow = mutation({
  args: {
    rowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.rowId, userId);

    await ctx.db.delete(args.rowId);
    await renumberRows(ctx, row.dayId);

    return null;
  },
});

/**
 * Delete a header and all exercises in its group.
 */
export const deleteGroup = mutation({
  args: {
    headerRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.headerRowId, userId);

    if (row.kind !== "header") {
      throw new Error("Row is not a header");
    }

    // Delete all exercises in this group
    const groupedRows = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", row.groupId))
      .collect();

    for (const groupedRow of groupedRows) {
      await ctx.db.delete(groupedRow._id);
    }

    // Delete the header itself
    await ctx.db.delete(args.headerRowId);

    await renumberRows(ctx, row.dayId);

    return null;
  },
});

/**
 * Move a row to a new position.
 * Validates fromOrder to detect stale tool calls.
 */
export const moveRow = mutation({
  args: {
    rowId: v.id("programRows"),
    fromOrder: v.number(),
    toOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.rowId, userId);

    // Validate current position matches expected
    if (row.order !== args.fromOrder) {
      throw new Error(
        `Stale move: row is at position ${row.order}, expected ${args.fromOrder}`
      );
    }

    if (args.fromOrder === args.toOrder) {
      return null; // No-op
    }

    // Get all rows for the day
    const rows = await ctx.db
      .query("programRows")
      .withIndex("by_day_and_order", (q) => q.eq("dayId", row.dayId))
      .order("asc")
      .collect();

    // Reorder: remove from old position, insert at new
    const reordered = rows.filter((r) => r._id !== args.rowId);
    const targetIndex = Math.min(Math.max(0, args.toOrder), reordered.length);
    reordered.splice(targetIndex, 0, row);

    // Update all affected orders
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        await ctx.db.patch(reordered[i]._id, { order: i });
      }
    }

    return null;
  },
});

/**
 * Add an exercise to a group (set its groupId).
 */
export const groupExercise = mutation({
  args: {
    exerciseRowId: v.id("programRows"),
    groupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.exerciseRowId, userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    // Verify the group exists (header with this groupId)
    const header = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("kind"), "header"))
      .first();

    if (!header) {
      throw new Error("Group not found");
    }

    await ctx.db.patch(args.exerciseRowId, { groupId: args.groupId });

    return null;
  },
});

/**
 * Remove an exercise from its group (clear groupId).
 */
export const ungroupExercise = mutation({
  args: {
    exerciseRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    const { row } = await verifyRowOwnership(ctx, args.exerciseRowId, userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    await ctx.db.patch(args.exerciseRowId, { groupId: undefined });

    return null;
  },
});

// =============================================================================
// Internal mutations for agent tools (accept userId as parameter)
// =============================================================================

export const internalAddExercise = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
    libraryExerciseId: v.id("exerciseLibrary"),
    weight: v.string(),
    reps: v.string(),
    sets: v.string(),
    notes: v.string(),
    groupId: v.optional(v.string()),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, args.userId);

    const exercise = await ctx.db.get(args.libraryExerciseId);
    if (!exercise) {
      throw new Error("Exercise not found in library");
    }
    if (exercise.userId !== undefined && exercise.userId !== args.userId) {
      throw new Error("Not authorized to use this exercise");
    }

    const order = await getNextRowOrder(ctx, args.dayId);

    return await ctx.db.insert("programRows", {
      kind: "exercise",
      dayId: args.dayId,
      order,
      libraryExerciseId: args.libraryExerciseId,
      weight: args.weight,
      reps: args.reps,
      sets: args.sets,
      notes: args.notes,
      groupId: args.groupId,
    });
  },
});

export const internalAddHeader = internalMutation({
  args: {
    userId: v.id("users"),
    dayId: v.id("days"),
    name: v.string(),
    sets: v.optional(v.string()),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, args.userId);

    const order = await getNextRowOrder(ctx, args.dayId);
    const groupId = crypto.randomUUID();

    return await ctx.db.insert("programRows", {
      kind: "header",
      dayId: args.dayId,
      order,
      groupId,
      name: args.name,
      sets: args.sets,
    });
  },
});

export const internalUpdateExercise = internalMutation({
  args: {
    userId: v.id("users"),
    rowId: v.id("programRows"),
    updates: exerciseFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, args.userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    if (args.updates.libraryExerciseId !== undefined) {
      const exercise = await ctx.db.get(args.updates.libraryExerciseId);
      if (!exercise) {
        throw new Error("Exercise not found in library");
      }
      if (exercise.userId !== undefined && exercise.userId !== args.userId) {
        throw new Error("Not authorized to use this exercise");
      }
    }

    const patch: Record<string, unknown> = {};
    if (args.updates.libraryExerciseId !== undefined) {
      patch.libraryExerciseId = args.updates.libraryExerciseId;
    }
    if (args.updates.weight !== undefined) {
      patch.weight = args.updates.weight;
    }
    if (args.updates.reps !== undefined) {
      patch.reps = args.updates.reps;
    }
    if (args.updates.sets !== undefined) {
      patch.sets = args.updates.sets;
    }
    if (args.updates.notes !== undefined) {
      patch.notes = args.updates.notes;
    }
    if (args.updates.groupId !== undefined) {
      patch.groupId = args.updates.groupId === null ? undefined : args.updates.groupId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.rowId, patch);
    }

    return null;
  },
});

export const internalUpdateHeader = internalMutation({
  args: {
    userId: v.id("users"),
    rowId: v.id("programRows"),
    updates: headerFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, args.userId);

    if (row.kind !== "header") {
      throw new Error("Row is not a header");
    }

    const patch: Record<string, unknown> = {};
    if (args.updates.name !== undefined) {
      patch.name = args.updates.name;
    }
    if (args.updates.sets !== undefined) {
      patch.sets = args.updates.sets === null ? undefined : args.updates.sets;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.rowId, patch);
    }

    return null;
  },
});

export const internalDeleteRow = internalMutation({
  args: {
    userId: v.id("users"),
    rowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, args.userId);

    await ctx.db.delete(args.rowId);
    await renumberRows(ctx, row.dayId);

    return null;
  },
});

export const internalDeleteGroup = internalMutation({
  args: {
    userId: v.id("users"),
    headerRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.headerRowId, args.userId);

    if (row.kind !== "header") {
      throw new Error("Row is not a header");
    }

    const groupedRows = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", row.groupId))
      .collect();

    for (const groupedRow of groupedRows) {
      await ctx.db.delete(groupedRow._id);
    }

    await ctx.db.delete(args.headerRowId);
    await renumberRows(ctx, row.dayId);

    return null;
  },
});

export const internalMoveRow = internalMutation({
  args: {
    userId: v.id("users"),
    rowId: v.id("programRows"),
    fromOrder: v.number(),
    toOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, args.userId);

    if (row.order !== args.fromOrder) {
      throw new Error(
        `Stale move: row is at position ${row.order}, expected ${args.fromOrder}`
      );
    }

    if (args.fromOrder === args.toOrder) {
      return null;
    }

    const rows = await ctx.db
      .query("programRows")
      .withIndex("by_day_and_order", (q) => q.eq("dayId", row.dayId))
      .order("asc")
      .collect();

    const reordered = rows.filter((r) => r._id !== args.rowId);
    const targetIndex = Math.min(Math.max(0, args.toOrder), reordered.length);
    reordered.splice(targetIndex, 0, row);

    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        await ctx.db.patch(reordered[i]._id, { order: i });
      }
    }

    return null;
  },
});

export const internalGroupExercise = internalMutation({
  args: {
    userId: v.id("users"),
    exerciseRowId: v.id("programRows"),
    groupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.exerciseRowId, args.userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    const header = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("kind"), "header"))
      .first();

    if (!header) {
      throw new Error("Group not found");
    }

    await ctx.db.patch(args.exerciseRowId, { groupId: args.groupId });

    return null;
  },
});

export const internalUngroupExercise = internalMutation({
  args: {
    userId: v.id("users"),
    exerciseRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.exerciseRowId, args.userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    await ctx.db.patch(args.exerciseRowId, { groupId: undefined });

    return null;
  },
});
