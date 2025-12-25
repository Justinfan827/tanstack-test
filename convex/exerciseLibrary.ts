import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./helpers/auth";

/**
 * List all exercises available to user (global + user's own).
 */
export const listExercises = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("exerciseLibrary"),
      _creationTime: v.number(),
      name: v.string(),
      isGlobal: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);

    // Get global exercises (userId = undefined)
    const globalExercises = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_user", (q) => q.eq("userId", undefined))
      .collect();

    // Get user's exercises
    const userExercises = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return [
      ...globalExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: true,
      })),
      ...userExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: false,
      })),
    ];
  },
});

/**
 * Search exercises by name (full-text search).
 */
export const searchExercises = query({
  args: {
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("exerciseLibrary"),
      _creationTime: v.number(),
      name: v.string(),
      isGlobal: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    if (!args.query.trim()) {
      // Empty query - return all exercises
      const globalExercises = await ctx.db
        .query("exerciseLibrary")
        .withIndex("by_user", (q) => q.eq("userId", undefined))
        .collect();

      const userExercises = await ctx.db
        .query("exerciseLibrary")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      return [
        ...globalExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: true,
        })),
        ...userExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: false,
        })),
      ];
    }

    // Full-text search
    const results = await ctx.db
      .query("exerciseLibrary")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(50);

    // Filter to only global + user's exercises
    const filtered = results.filter(
      (e) => e.userId === undefined || e.userId === userId
    );

    return filtered.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      name: e.name,
      isGlobal: e.userId === undefined,
    }));
  },
});

/**
 * Add a custom exercise for the current user.
 */
export const addExercise = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("exerciseLibrary"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    return await ctx.db.insert("exerciseLibrary", {
      name: args.name,
      userId,
    });
  },
});

/**
 * Delete a custom exercise (only if owned by user).
 */
export const deleteExercise = mutation({
  args: {
    exerciseId: v.id("exerciseLibrary"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.userId === undefined) {
      throw new Error("Cannot delete global exercises");
    }

    if (exercise.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.exerciseId);

    return null;
  },
});

/**
 * Get a single exercise by ID.
 */
export const getExercise = query({
  args: {
    exerciseId: v.id("exerciseLibrary"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("exerciseLibrary"),
      _creationTime: v.number(),
      name: v.string(),
      isGlobal: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      return null;
    }

    // Check access
    if (exercise.userId !== undefined && exercise.userId !== userId) {
      return null;
    }

    return {
      _id: exercise._id,
      _creationTime: exercise._creationTime,
      name: exercise.name,
      isGlobal: exercise.userId === undefined,
    };
  },
});

// =============================================================================
// Internal queries/mutations for agent tools (accept userId as parameter)
// =============================================================================

/**
 * Internal: List all exercises available to user (for agent tools).
 */
export const internalListExercises = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("exerciseLibrary"),
      _creationTime: v.number(),
      name: v.string(),
      isGlobal: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const globalExercises = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_user", (q) => q.eq("userId", undefined))
      .collect();

    const userExercises = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return [
      ...globalExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: true,
      })),
      ...userExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: false,
      })),
    ];
  },
});

/**
 * Internal: Search exercises by name (for agent tools).
 */
export const internalSearchExercises = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("exerciseLibrary"),
      _creationTime: v.number(),
      name: v.string(),
      isGlobal: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      const globalExercises = await ctx.db
        .query("exerciseLibrary")
        .withIndex("by_user", (q) => q.eq("userId", undefined))
        .collect();

      const userExercises = await ctx.db
        .query("exerciseLibrary")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      return [
        ...globalExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: true,
        })),
        ...userExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: false,
        })),
      ];
    }

    const results = await ctx.db
      .query("exerciseLibrary")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(50);

    const filtered = results.filter(
      (e) => e.userId === undefined || e.userId === args.userId
    );

    return filtered.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      name: e.name,
      isGlobal: e.userId === undefined,
    }));
  },
});

/**
 * Internal: Add a custom exercise (for agent tools).
 */
export const internalAddExercise = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  returns: v.id("exerciseLibrary"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("exerciseLibrary", {
      name: args.name,
      userId: args.userId,
    });
  },
});

/**
 * Internal: Delete a custom exercise (for agent tools).
 */
export const internalDeleteExercise = internalMutation({
  args: {
    userId: v.id("users"),
    exerciseId: v.id("exerciseLibrary"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.userId === undefined) {
      throw new Error("Cannot delete global exercises");
    }

    if (exercise.userId !== args.userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.exerciseId);
    return null;
  },
});

/**
 * Internal: Update a custom exercise name (for agent tools).
 */
export const internalUpdateExercise = internalMutation({
  args: {
    userId: v.id("users"),
    exerciseId: v.id("exerciseLibrary"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.userId === undefined) {
      throw new Error("Cannot edit global exercises");
    }

    if (exercise.userId !== args.userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.exerciseId, { name: args.name });
    return null;
  },
});

/**
 * Internal: Get a single exercise by ID (for agent tools).
 */
export const internalGetExercise = internalQuery({
  args: {
    userId: v.id("users"),
    exerciseId: v.id("exerciseLibrary"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("exerciseLibrary"),
      _creationTime: v.number(),
      name: v.string(),
      isGlobal: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      return null;
    }

    // Check access
    if (exercise.userId !== undefined && exercise.userId !== args.userId) {
      return null;
    }

    return {
      _id: exercise._id,
      _creationTime: exercise._creationTime,
      name: exercise.name,
      isGlobal: exercise.userId === undefined,
    };
  },
});
