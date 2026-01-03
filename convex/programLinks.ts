import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { userMutation, userQuery } from "./functions";
import { enrichUserWithAuth, verifyProgramOwnership } from "./helpers/auth";

/**
 * Create a public link to a program for a client.
 * Trainer only.
 */
export const createProgramLink = userMutation({
  args: {
    clientId: v.id("users"),
    programId: v.id("programs"),
    trainerNotes: v.string(),
  },
  returns: v.id("programLinks"),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    // Verify trainer owns the client
    const client = await ctx.db.get(args.clientId);
    if (!client || client.trainerId !== ctx.userId) {
      throw new Error("Client not found or not owned by trainer");
    }

    const linkId = await ctx.db.insert("programLinks", {
      userId: ctx.userId,
      clientId: args.clientId,
      programId: args.programId,
      trainerNotes: args.trainerNotes,
    });

    return linkId;
  },
});

/**
 * Get a program link by ID (public - no auth required).
 */
export const getProgramLink = query({
  args: {
    linkId: v.id("programLinks"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("programLinks"),
      _creationTime: v.number(),
      userId: v.id("users"),
      clientId: v.id("users"),
      programId: v.id("programs"),
      trainerNotes: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.linkId);
  },
});

/**
 * Get program link with full program details (public - no auth required).
 * Returns all data needed for the link page in a single query:
 * - Client profile (name, image)
 * - Program with days and exercise rows (with resolved exercise names/notes)
 */
export const getProgramLinkWithDetails = query({
  args: {
    linkId: v.id("programLinks"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("programLinks"),
      _creationTime: v.number(),
      userId: v.id("users"),
      clientId: v.id("users"),
      programId: v.id("programs"),
      trainerNotes: v.string(),
      clientProfile: v.object({
        name: v.string(),
        image: v.optional(v.string()),
      }),
      program: v.object({
        _id: v.id("programs"),
        _creationTime: v.number(),
        name: v.string(),
        days: v.array(
          v.object({
            _id: v.id("days"),
            _creationTime: v.number(),
            dayLabel: v.string(),
            order: v.number(),
            rows: v.array(
              v.object({
                _id: v.id("programRows"),
                _creationTime: v.number(),
                order: v.number(),
                exerciseName: v.string(),
                libraryNotes: v.optional(v.string()),
                weight: v.string(),
                reps: v.string(),
                sets: v.string(),
                effort: v.optional(v.string()),
                rest: v.optional(v.string()),
                notes: v.string(),
                groupId: v.optional(v.string()),
              })
            ),
          })
        ),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) return null;

    // Fetch client profile
    const clientUser = await ctx.db.get(link.clientId);
    if (!clientUser) return null;
    const enrichedClient = await enrichUserWithAuth(ctx, clientUser);
    const clientProfile = {
      name: enrichedClient.name,
      image: enrichedClient.image,
    };

    const program = await ctx.db.get(link.programId);
    if (!program) return null;

    const days = await ctx.db
      .query("days")
      .withIndex("by_program_and_order", (q) => q.eq("programId", link.programId))
      .order("asc")
      .collect();

    // Batch fetch all rows for all days
    const dayIds = days.map((d) => d._id);
    const allRows = await Promise.all(
      dayIds.map((dayId) =>
        ctx.db
          .query("programRows")
          .withIndex("by_day_and_order", (q) => q.eq("dayId", dayId))
          .order("asc")
          .collect()
      )
    );
    const rowsByDay = new Map(dayIds.map((id, i) => [id, allRows[i]]));

    // Collect all unique exercise IDs and batch fetch
    const exerciseIds: Id<"exerciseLibrary">[] = [];
    for (const rows of allRows) {
      for (const row of rows) {
        if (row.kind === "exercise" && row.libraryExerciseId) {
          exerciseIds.push(row.libraryExerciseId);
        }
      }
    }
    const uniqueExerciseIds = [...new Set(exerciseIds)];
    const exercises = await Promise.all(
      uniqueExerciseIds.map((id) => ctx.db.get(id))
    );
    const exerciseMap = new Map(
      exercises.filter(Boolean).map((e) => [e!._id, e!])
    );

    const daysWithRows = days.map((day) => {
      const rows = rowsByDay.get(day._id) ?? [];
      const exerciseRows = rows
        .filter((row) => row.kind === "exercise")
        .map((row) => {
          let exerciseName = "Unknown Exercise";
          let libraryNotes: string | undefined;
          if (row.libraryExerciseId) {
            const exercise = exerciseMap.get(row.libraryExerciseId);
            if (exercise) {
              exerciseName = exercise.name;
              libraryNotes = exercise.notes;
            }
          }
          return {
            _id: row._id,
            _creationTime: row._creationTime,
            order: row.order,
            exerciseName,
            libraryNotes,
            weight: row.weight,
            reps: row.reps,
            sets: row.sets,
            effort: row.effort,
            rest: row.rest,
            notes: row.notes,
            groupId: row.groupId,
          };
        });

      return {
        _id: day._id,
        _creationTime: day._creationTime,
        dayLabel: day.dayLabel,
        order: day.order,
        rows: exerciseRows,
      };
    });

    return {
      _id: link._id,
      _creationTime: link._creationTime,
      userId: link.userId,
      clientId: link.clientId,
      programId: link.programId,
      trainerNotes: link.trainerNotes,
      clientProfile,
      program: {
        _id: program._id,
        _creationTime: program._creationTime,
        name: program.name,
        days: daysWithRows,
      },
    };
  },
});

/**
 * List all links for a program (trainer only).
 */
export const listProgramLinks = userQuery({
  args: {
    programId: v.id("programs"),
  },
  returns: v.array(
    v.object({
      _id: v.id("programLinks"),
      _creationTime: v.number(),
      userId: v.id("users"),
      clientId: v.id("users"),
      programId: v.id("programs"),
      trainerNotes: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    await verifyProgramOwnership(ctx, args.programId, ctx.userId);

    return await ctx.db
      .query("programLinks")
      .withIndex("by_program_id", (q) => q.eq("programId", args.programId))
      .collect();
  },
});

/**
 * Delete a program link (trainer only).
 */
export const deleteProgramLink = userMutation({
  args: {
    linkId: v.id("programLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await verifyProgramOwnership(ctx, link.programId, ctx.userId);

    await ctx.db.delete(args.linkId);

    return null;
  },
});
