import { v } from "convex/values";
import { userQuery } from "./functions";

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

// =============================================================================
// Category Mutations (stubs for future configuration UI)
// =============================================================================

// TODO: Implement when building configuration page
// - createCategory
// - updateCategory
// - deleteCategory (soft delete)
// - createCategoryValue
// - updateCategoryValue
// - deleteCategoryValue (soft delete)
// - assignCategoryToExercise
// - removeCategoryFromExercise
