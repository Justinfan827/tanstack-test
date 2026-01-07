import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { userQuery, userMutation } from "./functions";

// Shared return type for exercise queries
const exerciseReturnType = v.object({
  _id: v.id("exerciseLibrary"),
  _creationTime: v.number(),
  name: v.string(),
  isGlobal: v.boolean(),
  videoUrl: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
});

/**
 * List all exercises available to user (global + user's own).
 */
export const listExercises = userQuery({
  args: {},
  returns: v.array(exerciseReturnType),
  handler: async (ctx) => {
    // Get global exercises (userId = undefined)
    const globalExercises = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_user", (q) => q.eq("userId", undefined))
      .collect();

    // Get user's exercises
    const userExercises = await ctx.db
      .query("exerciseLibrary")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .collect();

    return [
      ...globalExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: true,
        videoUrl: e.videoUrl,
        imageUrl: e.imageUrl,
        notes: e.notes,
      })),
      ...userExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: false,
        videoUrl: e.videoUrl,
        imageUrl: e.imageUrl,
        notes: e.notes,
      })),
    ];
  },
});

/**
 * Search exercises by name (full-text search).
 */
export const searchExercises = userQuery({
  args: {
    query: v.string(),
  },
  returns: v.array(exerciseReturnType),
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      // Empty query - return all exercises
      const globalExercises = await ctx.db
        .query("exerciseLibrary")
        .withIndex("by_user", (q) => q.eq("userId", undefined))
        .collect();

      const userExercises = await ctx.db
        .query("exerciseLibrary")
        .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
        .collect();

      return [
        ...globalExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: true,
          videoUrl: e.videoUrl,
          imageUrl: e.imageUrl,
          notes: e.notes,
        })),
        ...userExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: false,
          videoUrl: e.videoUrl,
          imageUrl: e.imageUrl,
          notes: e.notes,
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
      (e) => e.userId === undefined || e.userId === ctx.userId
    );

    return filtered.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      name: e.name,
      isGlobal: e.userId === undefined,
      videoUrl: e.videoUrl,
      imageUrl: e.imageUrl,
      notes: e.notes,
    }));
  },
});

/**
 * Add a custom exercise for the current user.
 */
export const addExercise = userMutation({
  args: {
    name: v.string(),
  },
  returns: v.id("exerciseLibrary"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("exerciseLibrary", {
      name: args.name,
      userId: ctx.userId,
    });
  },
});

/**
 * Delete a custom exercise (only if owned by user).
 */
export const deleteExercise = userMutation({
  args: {
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

    if (exercise.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.exerciseId);

    return null;
  },
});

// Return type for exercise with category assignments
const exerciseWithCategoriesReturnType = v.object({
  _id: v.id("exerciseLibrary"),
  _creationTime: v.number(),
  name: v.string(),
  isGlobal: v.boolean(),
  videoUrl: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
  categoryAssignments: v.array(
    v.object({
      categoryId: v.id("categories"),
      categoryName: v.string(),
      categoryValueId: v.id("categoryValues"),
      categoryValueName: v.string(),
    })
  ),
});

/**
 * Get a single exercise by ID with its category assignments.
 */
export const getExercise = userQuery({
  args: {
    exerciseId: v.id("exerciseLibrary"),
  },
  returns: v.union(v.null(), exerciseWithCategoriesReturnType),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      return null;
    }

    // Check access
    if (exercise.userId !== undefined && exercise.userId !== ctx.userId) {
      return null;
    }

    // Fetch category assignments
    const assignments = await ctx.db
      .query("categoryAssignments")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .collect();

    // Resolve category and value names, filtering out deleted ones
    const categoryAssignments = (
      await Promise.all(
        assignments.map(async (assignment) => {
          const categoryValue = await ctx.db.get(assignment.categoryValueId);
          if (!categoryValue || categoryValue.deletedAt) return null;

          const category = await ctx.db.get(categoryValue.categoryId);
          if (!category || category.deletedAt) return null;

          return {
            categoryId: category._id,
            categoryName: category.name,
            categoryValueId: assignment.categoryValueId,
            categoryValueName: categoryValue.name,
          };
        })
      )
    ).filter((r) => r !== null);

    return {
      _id: exercise._id,
      _creationTime: exercise._creationTime,
      name: exercise.name,
      isGlobal: exercise.userId === undefined,
      videoUrl: exercise.videoUrl,
      imageUrl: exercise.imageUrl,
      notes: exercise.notes,
      categoryAssignments,
    };
  },
});

/**
 * Update a custom exercise and its category assignments (only if owned by user).
 */
export const updateExercise = userMutation({
  args: {
    exerciseId: v.id("exerciseLibrary"),
    name: v.string(),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    categoryValueIds: v.optional(v.array(v.id("categoryValues"))),
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

    if (exercise.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    // Update exercise fields
    await ctx.db.patch(args.exerciseId, {
      name: args.name,
      videoUrl: args.videoUrl,
      imageUrl: args.imageUrl,
      notes: args.notes,
    });

    // Update category assignments if provided
    if (args.categoryValueIds !== undefined) {
      const now = new Date().toISOString();

      // Validate all category values belong to user's categories
      for (const valueId of args.categoryValueIds) {
        const value = await ctx.db.get(valueId);
        if (!value) {
          throw new Error("Category value not found");
        }
        const category = await ctx.db.get(value.categoryId);
        if (!category || category.userId !== ctx.userId) {
          throw new Error("Not authorized to use this category value");
        }
      }

      // Delete existing assignments
      const existingAssignments = await ctx.db
        .query("categoryAssignments")
        .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
        .collect();

      await Promise.all(
        existingAssignments.map((a) => ctx.db.delete(a._id))
      );

      // Create new assignments
      await Promise.all(
        args.categoryValueIds.map((categoryValueId) =>
          ctx.db.insert("categoryAssignments", {
            exerciseId: args.exerciseId,
            categoryValueId,
            createdAt: now,
          })
        )
      );
    }

    return null;
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
  returns: v.array(exerciseReturnType),
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
        videoUrl: e.videoUrl,
        imageUrl: e.imageUrl,
        notes: e.notes,
      })),
      ...userExercises.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        name: e.name,
        isGlobal: false,
        videoUrl: e.videoUrl,
        imageUrl: e.imageUrl,
        notes: e.notes,
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
  returns: v.array(exerciseReturnType),
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
          videoUrl: e.videoUrl,
          imageUrl: e.imageUrl,
          notes: e.notes,
        })),
        ...userExercises.map((e) => ({
          _id: e._id,
          _creationTime: e._creationTime,
          name: e.name,
          isGlobal: false,
          videoUrl: e.videoUrl,
          imageUrl: e.imageUrl,
          notes: e.notes,
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
      videoUrl: e.videoUrl,
      imageUrl: e.imageUrl,
      notes: e.notes,
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
 * Internal: Update a custom exercise (for agent tools).
 */
export const internalUpdateExercise = internalMutation({
  args: {
    userId: v.id("users"),
    exerciseId: v.id("exerciseLibrary"),
    name: v.string(),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    await ctx.db.patch(args.exerciseId, {
      name: args.name,
      videoUrl: args.videoUrl,
      imageUrl: args.imageUrl,
      notes: args.notes,
    });
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
  returns: v.union(v.null(), exerciseReturnType),
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
      videoUrl: exercise.videoUrl,
      imageUrl: exercise.imageUrl,
      notes: exercise.notes,
    };
  },
});
