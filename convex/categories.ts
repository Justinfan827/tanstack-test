import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { userMutation, userQuery } from "./functions";

// =============================================================================
// Category Queries
// =============================================================================

/**
 * Get all categories with their values for the current user.
 * Used in exercise library to display/assign categories.
 */
export const getCategoriesWithValues = userQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      values: v.array(
        v.object({
          _id: v.id("categoryValues"),
          _creationTime: v.number(),
          name: v.string(),
          description: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    // Get user's categories (non-deleted)
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // For each category, get its values
    const result = await Promise.all(
      categories.map(async (category) => {
        const values = await ctx.db
          .query("categoryValues")
          .withIndex("by_category", (q) => q.eq("categoryId", category._id))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();

        return {
          _id: category._id,
          _creationTime: category._creationTime,
          name: category.name,
          description: category.description,
          values: values.map((v) => ({
            _id: v._id,
            _creationTime: v._creationTime,
            name: v.name,
            description: v.description,
          })),
        };
      })
    );

    return result;
  },
});

/**
 * Get category assignments for a specific exercise.
 */
export const getExerciseCategories = userQuery({
  args: {
    exerciseId: v.id("exerciseLibrary"),
  },
  returns: v.array(
    v.object({
      categoryId: v.id("categories"),
      categoryName: v.string(),
      categoryValueId: v.id("categoryValues"),
      categoryValueName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Get assignments for this exercise
    const assignments = await ctx.db
      .query("categoryAssignments")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .collect();

    // Resolve category value and category details
    const result = await Promise.all(
      assignments.map(async (assignment) => {
        const categoryValue = await ctx.db.get(assignment.categoryValueId);
        if (!categoryValue || categoryValue.deletedAt) return null;

        const category = await ctx.db.get(categoryValue.categoryId);
        if (!category || category.deletedAt) return null;

        // Only return if category belongs to current user
        if (category.userId !== ctx.userId) return null;

        return {
          categoryId: category._id,
          categoryName: category.name,
          categoryValueId: categoryValue._id,
          categoryValueName: categoryValue.name,
        };
      })
    );

    return result.filter((r) => r !== null);
  },
});

/**
 * Get exercises that would be affected by deleting a category.
 * Returns exercises that have assignments to any value in this category.
 */
export const getAffectedExercises = userQuery({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.array(
    v.object({
      _id: v.id("exerciseLibrary"),
      name: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify category belongs to user
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== ctx.userId) {
      return [];
    }

    // Get all values for this category
    const values = await ctx.db
      .query("categoryValues")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get all assignments for these values
    const exerciseIds = new Set<string>();
    for (const value of values) {
      const assignments = await ctx.db
        .query("categoryAssignments")
        .withIndex("by_category_value", (q) =>
          q.eq("categoryValueId", value._id)
        )
        .collect();

      for (const assignment of assignments) {
        exerciseIds.add(assignment.exerciseId);
      }
    }

    // Get exercise details
    const exercises: { _id: Id<"exerciseLibrary">; name: string }[] = [];
    for (const id of exerciseIds) {
      const exercise = await ctx.db.get(id as Id<"exerciseLibrary">);
      if (exercise) {
        exercises.push({ _id: exercise._id, name: exercise.name });
      }
    }

    return exercises;
  },
});

// =============================================================================
// Category Mutations
// =============================================================================

/**
 * Create a new category for the current user.
 */
export const createCategory = userMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Check for duplicate name (non-deleted)
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", ctx.userId).eq("name", args.name)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing) {
      throw new Error(`Category "${args.name}" already exists`);
    }

    return await ctx.db.insert("categories", {
      name: args.name,
      description: args.description,
      userId: ctx.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing category.
 */
export const updateCategory = userMutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);

    if (!category) {
      throw new Error("Category not found");
    }

    if (category.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    if (category.deletedAt) {
      throw new Error("Cannot update a deleted category");
    }

    // Check for duplicate name (excluding self)
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", ctx.userId).eq("name", args.name)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing && existing._id !== args.categoryId) {
      throw new Error(`Category "${args.name}" already exists`);
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.categoryId, {
      name: args.name,
      description: args.description,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Soft delete a category and cascade to its values.
 */
export const deleteCategory = userMutation({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);

    if (!category) {
      throw new Error("Category not found");
    }

    if (category.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    if (category.deletedAt) {
      return null; // Already deleted
    }

    const now = new Date().toISOString();

    // Soft delete the category
    await ctx.db.patch(args.categoryId, {
      deletedAt: now,
      updatedAt: now,
    });

    // Cascade soft delete to all values
    const values = await ctx.db
      .query("categoryValues")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    await Promise.all(
      values.map((value) =>
        ctx.db.patch(value._id, {
          deletedAt: now,
          updatedAt: now,
        })
      )
    );

    return null;
  },
});

/**
 * Create a new category value.
 */
export const createCategoryValue = userMutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("categoryValues"),
  handler: async (ctx, args) => {
    // Verify category exists and belongs to user
    const category = await ctx.db.get(args.categoryId);

    if (!category || category.deletedAt) {
      throw new Error("Category not found");
    }

    if (category.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    // Check for duplicate name within category
    const existing = await ctx.db
      .query("categoryValues")
      .withIndex("by_category_and_name", (q) =>
        q.eq("categoryId", args.categoryId).eq("name", args.name)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing) {
      throw new Error(`Value "${args.name}" already exists in this category`);
    }

    const now = new Date().toISOString();

    return await ctx.db.insert("categoryValues", {
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing category value.
 */
export const updateCategoryValue = userMutation({
  args: {
    categoryValueId: v.id("categoryValues"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const categoryValue = await ctx.db.get(args.categoryValueId);

    if (!categoryValue) {
      throw new Error("Category value not found");
    }

    if (categoryValue.deletedAt) {
      throw new Error("Cannot update a deleted category value");
    }

    // Verify category ownership
    const category = await ctx.db.get(categoryValue.categoryId);

    if (!category || category.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    // Check for duplicate name within category (excluding self)
    const existing = await ctx.db
      .query("categoryValues")
      .withIndex("by_category_and_name", (q) =>
        q.eq("categoryId", categoryValue.categoryId).eq("name", args.name)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing && existing._id !== args.categoryValueId) {
      throw new Error(`Value "${args.name}" already exists in this category`);
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.categoryValueId, {
      name: args.name,
      description: args.description,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Soft delete a category value.
 */
export const deleteCategoryValue = userMutation({
  args: {
    categoryValueId: v.id("categoryValues"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const categoryValue = await ctx.db.get(args.categoryValueId);

    if (!categoryValue) {
      throw new Error("Category value not found");
    }

    // Verify category ownership
    const category = await ctx.db.get(categoryValue.categoryId);

    if (!category || category.userId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    if (categoryValue.deletedAt) {
      return null; // Already deleted
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.categoryValueId, {
      deletedAt: now,
      updatedAt: now,
    });

    return null;
  },
});
