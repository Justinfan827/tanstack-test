import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { userMutation } from "./functions";
import { verifyDayOwnership, verifyRowOwnership } from "./helpers/auth";
import { getNextRowOrder, insertRowAfter, renumberRows } from "./helpers/ordering";
import { exerciseFieldUpdates, circuitHeaderFieldUpdates } from "./helpers/validators";

/**
 * Add an exercise row to a day.
 * If afterOrder is provided, inserts after that position.
 * Otherwise appends to end.
 */
export const addExercise = userMutation({
  args: {
    clientId: v.string(),
    dayId: v.id("days"),
    libraryExerciseId: v.optional(v.id("exerciseLibrary")),
    weight: v.string(),
    reps: v.string(),
    sets: v.string(),
    notes: v.string(),
    groupId: v.optional(v.string()),
    afterOrder: v.optional(v.number()),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    // Validate exercise exists and user has access (if provided)
    if (args.libraryExerciseId) {
      const exercise = await ctx.db.get(args.libraryExerciseId);
      if (!exercise) {
        throw new Error("Exercise not found in library");
      }
      if (exercise.userId !== undefined && exercise.userId !== ctx.userId) {
        throw new Error("Not authorized to use this exercise");
      }
    }

    // Determine order: insert after specified position or append to end
    const order = args.afterOrder !== undefined
      ? await insertRowAfter(ctx, args.dayId, args.afterOrder)
      : await getNextRowOrder(ctx, args.dayId);

    return await ctx.db.insert("programRows", {
      kind: "exercise",
      clientId: args.clientId,
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
 * Add an empty exercise row to a day (for grid row creation).
 */
export const addEmptyExerciseRow = userMutation({
  args: {
    clientId: v.string(),
    dayId: v.id("days"),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    const order = await getNextRowOrder(ctx, args.dayId);

    return await ctx.db.insert("programRows", {
      kind: "exercise",
      clientId: args.clientId,
      dayId: args.dayId,
      order,
      libraryExerciseId: undefined,
      weight: "",
      reps: "",
      sets: "",
      notes: "",
    });
  },
});

/**
 * Add a circuit (header row) to a day.
 */
export const addCircuit = userMutation({
  args: {
    clientId: v.string(),
    dayId: v.id("days"),
    name: v.string(),
    sets: v.optional(v.string()),
  },
  returns: v.id("programRows"),
  handler: async (ctx, args) => {
    await verifyDayOwnership(ctx, args.dayId, ctx.userId);

    const order = await getNextRowOrder(ctx, args.dayId);
    const groupId = crypto.randomUUID();

    return await ctx.db.insert("programRows", {
      kind: "circuitHeader",
      clientId: args.clientId,
      dayId: args.dayId,
      order,
      groupId,
      name: args.name,
      sets: args.sets,
    });
  },
});

/**
 * Update a single field on an exercise row.
 */
export const updateField = userMutation({
  args: {
    rowId: v.id("programRows"),
    field: v.union(
      v.literal("weight"),
      v.literal("reps"),
      v.literal("sets"),
      v.literal("notes"),
    ),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, ctx.userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    const patch = {
      [args.field]: args.value,
    };

    await ctx.db.patch(args.rowId, patch);
    return null;
  },
});

/**
 * Batch update multiple rows, grouping all field changes per row.
 * More efficient than calling updateField multiple times.
 */
export const batchUpdateRows = userMutation({
  args: {
    updates: v.array(
      v.object({
        rowId: v.id("programRows"),
        fields: v.object({
          libraryExerciseId: v.optional(v.id("exerciseLibrary")),
          weight: v.optional(v.string()),
          reps: v.optional(v.string()),
          sets: v.optional(v.string()),
          effort: v.optional(v.string()),
          rest: v.optional(v.string()),
          notes: v.optional(v.string()),
        }),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Looping is efficient here: Convex queues all db changes and executes
    // them in a single transaction when the mutation ends.
    // See: https://docs.convex.dev/database/writing-data#bulk-inserts-or-updates
    for (const update of args.updates) {
      const { row } = await verifyRowOwnership(ctx, update.rowId, ctx.userId);
      if (row.kind !== "exercise") continue;

      // Validate libraryExerciseId if being updated
      if (update.fields.libraryExerciseId !== undefined) {
        const exercise = await ctx.db.get(update.fields.libraryExerciseId);
        if (!exercise) {
          throw new Error("Exercise not found in library");
        }
        if (exercise.userId !== undefined && exercise.userId !== ctx.userId) {
          throw new Error("Not authorized to use this exercise");
        }
      }

      await ctx.db.patch(update.rowId, update.fields);
    }
    return null;
  },
});

/**
 * Update an exercise row's fields.
 */
export const updateExercise = userMutation({
  args: {
    rowId: v.id("programRows"),
    updates: exerciseFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, ctx.userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    // Validate libraryExerciseId if being updated
    if (args.updates.libraryExerciseId !== undefined) {
      const exercise = await ctx.db.get(args.updates.libraryExerciseId);
      if (!exercise) {
        throw new Error("Exercise not found in library");
      }
      if (exercise.userId !== undefined && exercise.userId !== ctx.userId) {
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
    if (args.updates.rest !== undefined) {
      patch.rest = args.updates.rest === null ? undefined : args.updates.rest;
    }
    if (args.updates.effort !== undefined) {
      patch.effort = args.updates.effort === null ? undefined : args.updates.effort;
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
 * Update a circuit header row's fields.
 */
export const updateCircuitHeader = userMutation({
  args: {
    rowId: v.id("programRows"),
    updates: circuitHeaderFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, ctx.userId);

    if (row.kind !== "circuitHeader") {
      throw new Error("Row is not a circuit header");
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
 * If the row is a circuitHeader, cascades to delete all exercises in the circuit.
 */
export const deleteRow = userMutation({
  args: {
    rowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, ctx.userId);

    // If deleting a circuit header, cascade delete all exercises in the circuit
    if (row.kind === "circuitHeader") {
      const groupedRows = await ctx.db
        .query("programRows")
        .withIndex("by_group", (q) => q.eq("groupId", row.groupId))
        .collect();

      for (const groupedRow of groupedRows) {
        await ctx.db.delete(groupedRow._id);
      }
    }

    await ctx.db.delete(args.rowId);
    await renumberRows(ctx, row.dayId);

    return null;
  },
});

/**
 * Batch delete multiple rows.
 */
export const batchDeleteRows = userMutation({
  args: {
    rowIds: v.array(v.id("programRows")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.rowIds.length === 0) return null;

    // Track which days need renumbering
    const dayIds = new Set<string>();

    for (const rowId of args.rowIds) {
      const { row } = await verifyRowOwnership(ctx, rowId, ctx.userId);
      dayIds.add(row.dayId);
      await ctx.db.delete(rowId);
    }

    // Renumber all affected days
    for (const dayId of dayIds) {
      await renumberRows(ctx, dayId as any);
    }

    return null;
  },
});

/**
 * Delete a circuit header and all exercises in its group.
 */
export const deleteCircuit = userMutation({
  args: {
    circuitHeaderRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.circuitHeaderRowId, ctx.userId);

    if (row.kind !== "circuitHeader") {
      throw new Error("Row is not a circuit header");
    }

    // Delete all exercises in this group
    const groupedRows = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", row.groupId))
      .collect();

    for (const groupedRow of groupedRows) {
      await ctx.db.delete(groupedRow._id);
    }

    // Delete the circuit header itself
    await ctx.db.delete(args.circuitHeaderRowId);

    await renumberRows(ctx, row.dayId);

    return null;
  },
});

/**
 * Move a row to a new position.
 * Validates fromOrder to detect stale tool calls.
 */
export const moveRow = userMutation({
  args: {
    rowId: v.id("programRows"),
    fromOrder: v.number(),
    toOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, ctx.userId);

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
 * Add an exercise to a circuit (set its groupId).
 */
export const groupExercise = userMutation({
  args: {
    exerciseRowId: v.id("programRows"),
    groupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.exerciseRowId, ctx.userId);

    if (row.kind !== "exercise") {
      throw new Error("Row is not an exercise");
    }

    // Verify the circuit exists (circuitHeader with this groupId)
    const circuitHeader = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("kind"), "circuitHeader"))
      .first();

    if (!circuitHeader) {
      throw new Error("Circuit not found");
    }

    await ctx.db.patch(args.exerciseRowId, { groupId: args.groupId });

    return null;
  },
});

/**
 * Remove an exercise from its group (clear groupId).
 */
export const ungroupExercise = userMutation({
  args: {
    exerciseRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.exerciseRowId, ctx.userId);

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
    clientId: v.string(),
    userId: v.id("users"),
    dayId: v.id("days"),
    libraryExerciseId: v.id("exerciseLibrary"),
    weight: v.string(),
    reps: v.string(),
    sets: v.string(),
    rest: v.optional(v.string()),
    effort: v.optional(v.string()),
    notes: v.string(),
    groupId: v.optional(v.string()),
    afterOrder: v.optional(v.number()),
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

    // Determine order: insert after specified position or append to end
    const order = args.afterOrder !== undefined
      ? await insertRowAfter(ctx, args.dayId, args.afterOrder)
      : await getNextRowOrder(ctx, args.dayId);

    return await ctx.db.insert("programRows", {
      kind: "exercise",
      clientId: args.clientId,
      dayId: args.dayId,
      order,
      libraryExerciseId: args.libraryExerciseId,
      weight: args.weight,
      reps: args.reps,
      sets: args.sets,
      rest: args.rest,
      effort: args.effort,
      notes: args.notes,
      groupId: args.groupId,
    });
  },
});

export const internalAddCircuit = internalMutation({
  args: {
    clientId: v.string(),
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
      kind: "circuitHeader",
      clientId: args.clientId,
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
    if (args.updates.rest !== undefined) {
      patch.rest = args.updates.rest === null ? undefined : args.updates.rest;
    }
    if (args.updates.effort !== undefined) {
      patch.effort = args.updates.effort === null ? undefined : args.updates.effort;
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

export const internalUpdateCircuitHeader = internalMutation({
  args: {
    userId: v.id("users"),
    rowId: v.id("programRows"),
    updates: circuitHeaderFieldUpdates,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.rowId, args.userId);

    if (row.kind !== "circuitHeader") {
      throw new Error("Row is not a circuit header");
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

    // If deleting a circuit header, cascade delete all exercises in the circuit
    if (row.kind === "circuitHeader") {
      const groupedRows = await ctx.db
        .query("programRows")
        .withIndex("by_group", (q) => q.eq("groupId", row.groupId))
        .collect();

      for (const groupedRow of groupedRows) {
        await ctx.db.delete(groupedRow._id);
      }
    }

    await ctx.db.delete(args.rowId);
    await renumberRows(ctx, row.dayId);

    return null;
  },
});

export const internalDeleteCircuit = internalMutation({
  args: {
    userId: v.id("users"),
    circuitHeaderRowId: v.id("programRows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { row } = await verifyRowOwnership(ctx, args.circuitHeaderRowId, args.userId);

    if (row.kind !== "circuitHeader") {
      throw new Error("Row is not a circuit header");
    }

    const groupedRows = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", row.groupId))
      .collect();

    for (const groupedRow of groupedRows) {
      await ctx.db.delete(groupedRow._id);
    }

    await ctx.db.delete(args.circuitHeaderRowId);
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

    const circuitHeader = await ctx.db
      .query("programRows")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("kind"), "circuitHeader"))
      .first();

    if (!circuitHeader) {
      throw new Error("Circuit not found");
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
