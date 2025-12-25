import { ConvexError } from "convex/values";
import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { createAuth } from "./auth";

const checkSecret = (value: string) => {
  if (process.env.API_ADMIN_SECRET !== value) {
    throw new ConvexError("API endpoint failed validation");
  }
}

// Create an admin user
export const createAdminUser = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    checkSecret(args.secret)
    const { name, email, password } = args
    const auth = createAuth(ctx)
    try {
      await auth.api.createUser({
        body: {
          role: 'admin',
          name,
          email,
          password,
        }
      })
    } catch (e) {
      console.log(e)
    }
  },
})

// Delete an admin user

export const deleteAdminUser = mutation({
  args: {
    secret: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    checkSecret(args.secret)
    const { password } = args
    const auth = createAuth(ctx)
    await auth.api.deleteUser({
      body: {
        password,
      }
    });
  },
})
