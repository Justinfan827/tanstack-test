import { v } from 'convex/values'
import { adminMutation } from "./functions"
import { createAuth } from "./auth"

// Create an admin user
export const createAdminUser = adminMutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
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
export const deleteAdminUser = adminMutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { password } = args
    const auth = createAuth(ctx)
    await auth.api.deleteUser({
      body: {
        password,
      }
    });
  },
})
