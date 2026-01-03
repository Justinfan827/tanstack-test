import {
  createThread,
  getThreadMetadata,
  listUIMessages,
  saveMessage,
  syncStreams,
  updateThreadMetadata,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import { createProgramAgent, workoutAgent } from "./agent";
import { getCurrentUserId, verifyThreadOwnership } from "./helpers/auth";

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
    const userId = await getCurrentUserId(ctx);
    await verifyThreadOwnership(ctx, args.threadId, userId);

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
    const userId = await getCurrentUserId(ctx);
    await verifyThreadOwnership(ctx, threadId, userId);

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
    programId: v.optional(v.id("programs")),
  },
  handler: async (ctx, { threadId, promptMessageId, programId }) => {
    const agent = programId ? createProgramAgent(programId) : workoutAgent;
    await agent.streamText(ctx, { threadId }, { promptMessageId }, { saveStreamDeltas: true });
  },
});

// ============================================================================
// Program-scoped thread APIs
// ============================================================================

// Create a new thread linked to a program
export const createProgramThread = mutation({
  args: { programId: v.id("programs") },
  returns: v.string(),
  handler: async (ctx, { programId }) => {
    const userId = await getCurrentUserId(ctx);
    const threadId = await createThread(ctx, components.agent, { userId });
    await ctx.db.insert("programThreads", { programId, threadId, userId });
    return threadId;
  },
});

// List threads for a program (most recent first)
export const listProgramThreads = query({
  args: { programId: v.id("programs") },
  returns: v.array(
    v.object({
      _id: v.id("programThreads"),
      threadId: v.string(),
      title: v.union(v.string(), v.null()),
      lastMessageTime: v.union(v.number(), v.null()),
      _creationTime: v.number(),
    })
  ),
  handler: async (ctx, { programId }) => {
    await getCurrentUserId(ctx); // Auth check
    const links = await ctx.db
      .query("programThreads")
      .withIndex("by_program", (q) => q.eq("programId", programId))
      .order("desc")
      .collect();

    // Fetch thread metadata for titles and last message time
    const threads = await Promise.all(
      links.map(async (link) => {
        const meta = await getThreadMetadata(ctx, components.agent, {
          threadId: link.threadId,
        });
        // Get most recent message for this thread
        const messages = await listUIMessages(ctx, components.agent, {
          threadId: link.threadId,
          paginationOpts: { numItems: 1, cursor: null },
        });
        const lastMessage = messages.page[0];
        return {
          _id: link._id,
          threadId: link.threadId,
          title: meta?.title ?? null,
          lastMessageTime: lastMessage?._creationTime ?? null,
          _creationTime: link._creationTime,
        };
      })
    );
    return threads;
  },
});

// Get most recent thread for program (returns null if none exist)
export const getMostRecentProgramThread = query({
  args: { programId: v.id("programs") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { programId }) => {
    await getCurrentUserId(ctx); // Auth check
    const existing = await ctx.db
      .query("programThreads")
      .withIndex("by_program", (q) => q.eq("programId", programId))
      .order("desc")
      .first();

    return existing?.threadId ?? null;
  },
});

// Send message with auto-title generation for first message
export const sendProgramMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    programId: v.id("programs"),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, prompt, programId }) => {
    const userId = await getCurrentUserId(ctx);

    // Verify user owns the program
    const program = await ctx.db.get(programId);
    if (!program || program.userId !== userId) {
      throw new Error("Program not found or not authorized");
    }

    // Verify thread is linked to this program and owned by user
    const programThread = await ctx.db
      .query("programThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();

    if (!programThread || programThread.programId !== programId || programThread.userId !== userId) {
      throw new Error("Thread not linked to this program or not authorized");
    }

    // Check if this is the first message (thread has no title yet)
    const meta = await getThreadMetadata(ctx, components.agent, { threadId });
    const isFirstMessage = !meta?.title;

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt,
    });

    // Auto-generate title from first message
    if (isFirstMessage) {
      const title = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
      await updateThreadMetadata(ctx, components.agent, {
        threadId,
        patch: { title },
      });
    }

    await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
      threadId,
      promptMessageId: messageId,
      programId,
    });
    return messageId;
  },
});
