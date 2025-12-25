import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import { workoutAgent } from "./agent";
import { getCurrentUserId } from "./helpers/auth";

export const createNewThread = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user and pass to thread so agent tools can access it
    const userId = await getCurrentUserId(ctx);
    const threadId = await createThread(ctx, components.agent, { userId });
    return threadId;
  },
});

export const listUserThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    const result = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      { userId, paginationOpts: { numItems: 50, cursor: null } }
    );
    return result.page;
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, { threadId, prompt }) => {
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt,
    });
    await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
      threadId,
      promptMessageId: messageId,
    });
    return messageId;
  },
});

export const generateResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId }) => {
    await workoutAgent.streamText(ctx, { threadId }, { promptMessageId }, { saveStreamDeltas: true });
  },
});
