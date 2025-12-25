import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get next order value for appending a row to a day.
 */
export async function getNextRowOrder(
  ctx: MutationCtx,
  dayId: Id<"days">
): Promise<number> {
  const lastRow = await ctx.db
    .query("programRows")
    .withIndex("by_day_and_order", (q) => q.eq("dayId", dayId))
    .order("desc")
    .first();
  return lastRow ? lastRow.order + 1 : 0;
}

/**
 * Renumber all rows in a day sequentially (0, 1, 2, ...).
 * Call after delete/move operations.
 */
export async function renumberRows(
  ctx: MutationCtx,
  dayId: Id<"days">
): Promise<void> {
  const rows = await ctx.db
    .query("programRows")
    .withIndex("by_day_and_order", (q) => q.eq("dayId", dayId))
    .order("asc")
    .collect();

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].order !== i) {
      await ctx.db.patch(rows[i]._id, { order: i });
    }
  }
}

/**
 * Get next order value for appending a day to a program.
 */
export async function getNextDayOrder(
  ctx: MutationCtx,
  programId: Id<"programs">
): Promise<number> {
  const lastDay = await ctx.db
    .query("days")
    .withIndex("by_program_and_order", (q) => q.eq("programId", programId))
    .order("desc")
    .first();
  return lastDay ? lastDay.order + 1 : 0;
}

/**
 * Renumber all days in a program sequentially (0, 1, 2, ...).
 * Call after delete/move operations.
 */
export async function renumberDays(
  ctx: MutationCtx,
  programId: Id<"programs">
): Promise<void> {
  const days = await ctx.db
    .query("days")
    .withIndex("by_program_and_order", (q) => q.eq("programId", programId))
    .order("asc")
    .collect();

  for (let i = 0; i < days.length; i++) {
    if (days[i].order !== i) {
      await ctx.db.patch(days[i]._id, { order: i });
    }
  }
}

/**
 * Delete all rows for a day.
 */
export async function deleteRowsForDay(
  ctx: MutationCtx,
  dayId: Id<"days">
): Promise<void> {
  const rows = await ctx.db
    .query("programRows")
    .withIndex("by_day", (q) => q.eq("dayId", dayId))
    .collect();

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

/**
 * Delete all days (and their rows) for a program.
 */
export async function deleteDaysForProgram(
  ctx: MutationCtx,
  programId: Id<"programs">
): Promise<void> {
  const days = await ctx.db
    .query("days")
    .withIndex("by_program", (q) => q.eq("programId", programId))
    .collect();

  for (const day of days) {
    await deleteRowsForDay(ctx, day._id);
    await ctx.db.delete(day._id);
  }
}
