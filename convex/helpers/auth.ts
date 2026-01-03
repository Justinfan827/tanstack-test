import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { components } from "../_generated/api";
import { authComponent, betterAuthComponent } from "../auth";

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

/**
 * Get Better Auth user data for a given authId.
 * Returns user object with name, email, image fields.
 */
export async function getBetterAuthUser(
  ctx: QueryCtx | MutationCtx,
  authId: string
) {
  // Query Better Auth user table via component adapter
  const authUser = await ctx.runQuery(betterAuthComponent.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: authId }],
  });
  
  if (!authUser) {
    throw new Error(`Auth user not found: ${authId}`);
  }
  
  return {
    name: authUser.name as string,
    email: authUser.email as string,
    image: (authUser.image as string | null) || undefined,
    emailVerified: authUser.emailVerified as boolean,
  };
}

/**
 * Enrich a single Convex user with Better Auth data.
 * Splits name into firstName/lastName on whitespace.
 */
export async function enrichUserWithAuth(
  ctx: QueryCtx | MutationCtx,
  user: {
    _id: Id<"users">;
    _creationTime: number;
    authId: string;
    role: "trainer" | "client";
    trustMode: "high" | "low";
    trainerId?: Id<"users">;
    age?: number;
    gender?: "male" | "female";
    heightValue?: number;
    heightUnit?: "cm" | "in";
    weightValue?: number;
    weightUnit?: "kg" | "lbs";
  }
) {
  const authUser = await getBetterAuthUser(ctx, user.authId);
  
  // Split name on whitespace: "John Doe" → firstName: "John", lastName: "Doe"
  const nameParts = authUser.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    authId: user.authId,
    role: user.role,
    trustMode: user.trustMode,
    trainerId: user.trainerId,
    
    // From Better Auth
    email: authUser.email,
    name: authUser.name,
    firstName,
    lastName,
    image: authUser.image,
    emailVerified: authUser.emailVerified,
    
    // Fitness data
    age: user.age,
    gender: user.gender,
    heightValue: user.heightValue,
    heightUnit: user.heightUnit,
    weightValue: user.weightValue,
    weightUnit: user.weightUnit,
  };
}

/**
 * Enrich multiple users in parallel (batch operation).
 * More efficient than sequential enrichment.
 */
export async function enrichUsersWithAuth<
  T extends {
    _id: Id<"users">;
    _creationTime: number;
    authId: string;
    role: "trainer" | "client";
    trustMode: "high" | "low";
    trainerId?: Id<"users">;
    age?: number;
    gender?: "male" | "female";
    heightValue?: number;
    heightUnit?: "cm" | "in";
    weightValue?: number;
    weightUnit?: "kg" | "lbs";
  }
>(ctx: QueryCtx | MutationCtx, users: T[]) {
  return await Promise.all(
    users.map((user) => enrichUserWithAuth(ctx, user))
  );
}

/**
 * Generate a secure temporary password for new clients.
 * Format: 12 chars alphanumeric + special chars
 * Example: "aB3$xY9#mK2@"
 */
export function generateTemporaryPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill remaining 8 chars randomly
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Verify user owns the thread. Checks both:
 * 1. programThreads table (for program-linked threads)
 * 2. Agent component's thread.userId (for standalone threads)
 */
export async function verifyThreadOwnership(
  ctx: QueryCtx | MutationCtx,
  threadId: string,
  userId: Id<"users">
): Promise<void> {
  // Check programThreads table first (indexed lookup)
  const programThread = await ctx.db
    .query("programThreads")
    .withIndex("by_thread", (q) => q.eq("threadId", threadId))
    .first();

  if (programThread) {
    if (programThread.userId !== userId) {
      throw new Error("Not authorized");
    }
    return;
  }

  // For non-program threads, check agent component
  const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });

  if (!thread) {
    throw new Error("Thread not found");
  }

  // Agent stores userId as string, compare with our Id<"users">
  if (thread.userId !== userId) {
    throw new Error("Not authorized");
  }
}
