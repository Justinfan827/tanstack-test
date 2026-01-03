import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { customQuery, customMutation, customCtx } from "convex-helpers/server/customFunctions"
import { getCurrentUserId } from "./helpers/auth"
import { ConvexError } from "convex/values"

/**
 * userQuery - requires authenticated user
 * Adds ctx.userId to the handler context
 */
export const userQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    return { userId }
  })
)

/**
 * userMutation - requires authenticated user
 * Adds ctx.userId to the handler context
 */
export const userMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    return { userId }
  })
)

/**
 * adminQuery - requires secret arg for admin API access
 * Consumes args.secret and validates against API_ADMIN_SECRET
 * Handler never receives secret arg
 */
export const adminQuery = customQuery(query, {
  args: { secret: v.string() },
  input: async (_ctx, { secret }) => {
    if (process.env.API_ADMIN_SECRET !== secret) {
      throw new ConvexError("API endpoint failed validation")
    }
    return { ctx: {}, args: {} }
  },
})

/**
 * adminMutation - requires secret arg for admin API access
 * Consumes args.secret and validates against API_ADMIN_SECRET
 * Handler never receives secret arg
 */
export const adminMutation = customMutation(mutation, {
  args: { secret: v.string() },
  input: async (_ctx, { secret }) => {
    if (process.env.API_ADMIN_SECRET !== secret) {
      throw new ConvexError("API endpoint failed validation")
    }
    return { ctx: {}, args: {} }
  },
})
