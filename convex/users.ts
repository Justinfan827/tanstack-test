import { query, mutation } from "./_generated/server"
import { v } from "convex/values";
import { authComponent, createAuth } from "./auth";
import { getCurrentUserId, enrichUserWithAuth, enrichUsersWithAuth, generateTemporaryPassword } from "./helpers/auth";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const betterAuthUser = await authComponent.getAuthUser(ctx);
    if (!betterAuthUser) {
      return null;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", betterAuthUser._id))
      .unique();
    
    if (!user) {
      return null;
    }
    
    return await enrichUserWithAuth(ctx, user);
  },
})

/**
 * Get all clients for the current trainer.
 */
export const getAllClients = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      authId: v.string(),
      role: v.union(v.literal("trainer"), v.literal("client")),
      trustMode: v.union(v.literal("high"), v.literal("low")),
      trainerId: v.optional(v.id("users")),
      
      // From Better Auth
      email: v.string(),
      name: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      image: v.optional(v.string()),
      emailVerified: v.boolean(),
      
      // Fitness data
      age: v.optional(v.number()),
      gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
      heightValue: v.optional(v.number()),
      heightUnit: v.optional(v.union(v.literal("cm"), v.literal("in"))),
      weightValue: v.optional(v.number()),
      weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
    })
  ),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    const clients = await ctx.db
      .query("users")
      .withIndex("by_trainer_id", (q) => q.eq("trainerId", userId))
      .collect();

    return await enrichUsersWithAuth(ctx, clients);
  },
})

/**
 * Get a client by ID (only if current user is their trainer).
 */
export const getClientById = query({
  args: { clientId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      authId: v.string(),
      role: v.union(v.literal("trainer"), v.literal("client")),
      trustMode: v.union(v.literal("high"), v.literal("low")),
      trainerId: v.optional(v.id("users")),
      
      // From Better Auth
      email: v.string(),
      name: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      image: v.optional(v.string()),
      emailVerified: v.boolean(),
      
      // Fitness data
      age: v.optional(v.number()),
      gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
      heightValue: v.optional(v.number()),
      heightUnit: v.optional(v.union(v.literal("cm"), v.literal("in"))),
      weightValue: v.optional(v.number()),
      weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const client = await ctx.db.get(args.clientId);
    if (!client || client.trainerId !== userId) {
      return null;
    }

    return await enrichUserWithAuth(ctx, client);
  },
})

/**
 * Create a new client for the current trainer.
 */
export const createClient = mutation({
  args: {
    // Basic info (stored in Better Auth)
    name: v.string(), // "FirstName LastName"
    email: v.string(),
    image: v.optional(v.string()),
    
    // Fitness data (stored in Convex)
    age: v.number(),
    gender: v.union(v.literal("male"), v.literal("female")),
    heightValue: v.number(),
    heightUnit: v.union(v.literal("cm"), v.literal("in")),
    weightValue: v.number(),
    weightUnit: v.union(v.literal("kg"), v.literal("lbs")),
  },
  returns: v.object({
    clientId: v.id("users"),
    temporaryPassword: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // 1. Generate secure temporary password
    const temporaryPassword = generateTemporaryPassword();

    // 2. Create Better Auth user
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    
    const authResult = await auth.api.signUpEmail({
      body: {
        email: args.email,
        password: temporaryPassword,
        name: args.name,
        image: args.image,
      },
      headers,
    });

    if (!authResult.user) {
      throw new Error("Failed to create auth user");
    }

    // 3. Create Convex user record (client role, fitness data only)
    const clientId = await ctx.db.insert("users", {
      authId: authResult.user.id,
      role: "client",
      trustMode: "high", // default
      trainerId: userId,
      
      // Fitness data
      age: args.age,
      gender: args.gender,
      heightValue: args.heightValue,
      heightUnit: args.heightUnit,
      weightValue: args.weightValue,
      weightUnit: args.weightUnit,
    });

    // 4. Return client ID + temp password (for trainer to share)
    return {
      clientId,
      temporaryPassword,
    };
  },
})

/**
 * Remove a client from the current trainer.
 */
export const removeClient = mutation({
  args: { clientId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const client = await ctx.db.get(args.clientId);
    if (!client || client.trainerId !== userId) {
      throw new Error("Client not found or not owned by trainer");
    }

    // Remove trainer relationship (keeps user record)
    await ctx.db.patch(args.clientId, { 
      trainerId: undefined 
    });

    return null;
  },
})
