import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default async function createAdmin(args: string[]) {
    const [name, email, password] = args;
    const secret = process.env.API_ADMIN_SECRET;
    if (!name || !email || !password || !secret) {
        console.error("Usage: p run createAdminUser <full name> <email> <password>");
        process.exit(1);
    }
    if (!process.env.CONVEX_URL) {
        throw new Error("Missing CONVEX_URL");
    }
    console.log(`🔐 Creating admin: ${email}`);
    // 2️⃣ Call Convex mutation
    const convex = new ConvexHttpClient(process.env.CONVEX_URL);

    await convex.mutation(api.admin.createAdminUser, {
        secret,
        name,
        email,
        password,
    });

    console.log("✅ Admin user ready");
}
