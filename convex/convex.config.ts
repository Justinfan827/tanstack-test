import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import betterAuth from "./betterAuth/convex.config"; 

const app = defineApp();
app.use(betterAuth);
app.use(agent);

export default app;
