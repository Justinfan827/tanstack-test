import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { authComponent } from "../auth";

/**
 * Get current user ID from better-auth session.
 * Looks up our users table via authId relationship.
 */
export async function getCurrentUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const betterAuthUser = await authComponent.getAuthUser(ctx);
  if (!betterAuthUser) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", betterAuthUser._id))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user._id;
}

/**
 * Verify user owns the program. Returns program if authorized.
 */
export async function verifyProgramOwnership(
  ctx: QueryCtx | MutationCtx,
  programId: Id<"programs">,
  userId: Id<"users">
) {
  const program = await ctx.db.get(programId);
  if (!program) {
    throw new Error("Program not found");
  }
  if (program.userId !== userId) {
    throw new Error("Not authorized");
  }
  return program;
}

/**
 * Verify user owns the day (via program). Returns day + program if authorized.
 */
export async function verifyDayOwnership(
  ctx: QueryCtx | MutationCtx,
  dayId: Id<"days">,
  userId: Id<"users">
) {
  const day = await ctx.db.get(dayId);
  if (!day) {
    throw new Error("Day not found");
  }
  const program = await verifyProgramOwnership(ctx, day.programId, userId);
  return { day, program };
}

/**
 * Verify user owns the row (via day -> program). Returns row + day if authorized.
 */
export async function verifyRowOwnership(
  ctx: QueryCtx | MutationCtx,
  rowId: Id<"programRows">,
  userId: Id<"users">
) {
  const row = await ctx.db.get(rowId);
  if (!row) {
    throw new Error("Row not found");
  }
  const { day } = await verifyDayOwnership(ctx, row.dayId, userId);
  return { row, day };
}
