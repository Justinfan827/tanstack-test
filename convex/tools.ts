import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// Row-level Tools
// =============================================================================

export const addExerciseTool = createTool({
  description:
    "Add an exercise row to a workout day. Use this to add a new exercise to a day's workout.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to add the exercise to"),
    libraryExerciseId: z
      .string()
      .describe("The ID of the exercise from the exercise library"),
    weight: z
      .string()
      .describe(
        `Weight notation (unitless). Examples:
- Fixed: "125"
- Per-set: "125,130,135"
- Range: "125-135"
- Per side: "50 ES", "50ES", "50 E/S"
- Bodyweight: "BW", "BW+25", "BW+20-30"
- Mixed: "125-135,140,145"
Decimals up to 2 places allowed. Max 2000.`
      ),
    reps: z
      .string()
      .describe(
        `Rep notation. Examples:
- Fixed: "8"
- Per-set: "12,10,8"
- Range: "8-12"
- AMRAP: "AMRAP" (case-insensitive)
- Mixed: "10,8,AMRAP"
Integers only, min 1, max 999.`
      ),
    sets: z
      .string()
      .describe(
        `Set notation. Examples:
- Fixed: "3"
- Range: "3-4"
- With AMRAP finisher: "3+AMRAP"
Integers only, min 1, max 99.`
      ),
    rest: z
      .string()
      .optional()
      .describe(
        `Rest notation. Examples:
- Seconds: "90s"
- Minutes: "2m"
- Combined: "1m30s"
- Range: "1m-2m", "60s-90s"
- Per-set: "90s,2m,2m"
Min 1s, max 60m.`
      ),
    effort: z
      .string()
      .optional()
      .describe(
        `Effort notation (unitless, displayed as RPE or RIR per config). Examples:
- Fixed: "8"
- Per-set: "7,8,9"
- Range: "7-8"
Range 0-10. Decimals up to 2 places allowed.`
      ),
    notes: z.string().describe("Optional notes for the exercise").default(""),
    groupId: z
      .string()
      .optional()
      .describe("Optional group ID to add exercise to a superset/circuit"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; rowId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const rowId = await ctx.runMutation(internal.programRows.internalAddExercise, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
      libraryExerciseId: args.libraryExerciseId as Id<"exerciseLibrary">,
      weight: args.weight,
      reps: args.reps,
      sets: args.sets,
      rest: args.rest,
      effort: args.effort,
      notes: args.notes,
      groupId: args.groupId,
    });
    return { success: true, rowId };
  },
});

export const addHeaderTool = createTool({
  description:
    "Add a header row to group exercises into a superset or circuit. Returns the groupId that exercises can be added to.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to add the header to"),
    name: z
      .string()
      .describe("Name of the group, e.g. 'Chest-Triceps Superset'"),
    sets: z
      .string()
      .optional()
      .describe("Optional number of sets for the entire group"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; rowId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const rowId = await ctx.runMutation(internal.programRows.internalAddHeader, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
      name: args.name,
      sets: args.sets,
    });
    return { success: true, rowId };
  },
});

export const updateExerciseTool = createTool({
  description: "Update fields on an exercise row.",
  args: z.object({
    rowId: z.string().describe("The ID of the exercise row to update"),
    libraryExerciseId: z
      .string()
      .optional()
      .describe("New exercise from library"),
    weight: z
      .string()
      .optional()
      .describe(
        `Weight notation (unitless). Examples: "125", "125,130,135", "125-135", "50 ES", "BW", "BW+25". Max 2000.`
      ),
    reps: z
      .string()
      .optional()
      .describe(
        `Rep notation. Examples: "8", "12,10,8", "8-12", "AMRAP", "10,8,AMRAP". Min 1, max 999.`
      ),
    sets: z
      .string()
      .optional()
      .describe(
        `Set notation. Examples: "3", "3-4", "3+AMRAP". Min 1, max 99.`
      ),
    rest: z
      .string()
      .optional()
      .describe(
        `Rest notation. Examples: "90s", "2m", "1m30s", "1m-2m", "90s,2m,2m". Min 1s, max 60m.`
      ),
    effort: z
      .string()
      .optional()
      .describe(
        `Effort notation (unitless). Examples: "8", "7,8,9", "7-8". Range 0-10.`
      ),
    notes: z.string().optional().describe("New notes"),
    groupId: z
      .string()
      .nullable()
      .optional()
      .describe("New group ID, or null to remove from group"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const updates: {
      libraryExerciseId?: Id<"exerciseLibrary">;
      weight?: string;
      reps?: string;
      sets?: string;
      rest?: string | null;
      effort?: string | null;
      notes?: string;
      groupId?: string | null;
    } = {};
    if (args.libraryExerciseId !== undefined)
      updates.libraryExerciseId = args.libraryExerciseId as Id<"exerciseLibrary">;
    if (args.weight !== undefined) updates.weight = args.weight;
    if (args.reps !== undefined) updates.reps = args.reps;
    if (args.sets !== undefined) updates.sets = args.sets;
    if (args.rest !== undefined) updates.rest = args.rest;
    if (args.effort !== undefined) updates.effort = args.effort;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.groupId !== undefined) updates.groupId = args.groupId;

    await ctx.runMutation(internal.programRows.internalUpdateExercise, {
      userId: ctx.userId as Id<"users">,
      rowId: args.rowId as Id<"programRows">,
      updates,
    });
    return { success: true };
  },
});

export const updateHeaderTool = createTool({
  description: "Update fields on a header row.",
  args: z.object({
    rowId: z.string().describe("The ID of the header row to update"),
    name: z.string().optional().describe("New name for the group"),
    sets: z
      .string()
      .nullable()
      .optional()
      .describe("New sets for the group, or null to clear"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const updates: { name?: string; sets?: string | null } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.sets !== undefined) updates.sets = args.sets;

    await ctx.runMutation(internal.programRows.internalUpdateHeader, {
      userId: ctx.userId as Id<"users">,
      rowId: args.rowId as Id<"programRows">,
      updates,
    });
    return { success: true };
  },
});

export const deleteRowTool = createTool({
  description: "Delete a single row (exercise or header) from a day.",
  args: z.object({
    rowId: z.string().describe("The ID of the row to delete"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programRows.internalDeleteRow, {
      userId: ctx.userId as Id<"users">,
      rowId: args.rowId as Id<"programRows">,
    });
    return { success: true };
  },
});

export const deleteGroupTool = createTool({
  description:
    "Delete a header and all exercises in its group. Use this to remove an entire superset/circuit.",
  args: z.object({
    headerRowId: z.string().describe("The ID of the header row to delete"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programRows.internalDeleteGroup, {
      userId: ctx.userId as Id<"users">,
      headerRowId: args.headerRowId as Id<"programRows">,
    });
    return { success: true };
  },
});

export const moveRowTool = createTool({
  description:
    "Move a row to a new position within its day. Provide both current and target positions.",
  args: z.object({
    rowId: z.string().describe("The ID of the row to move"),
    fromOrder: z
      .number()
      .describe("Current position of the row (for validation)"),
    toOrder: z.number().describe("Target position to move the row to"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programRows.internalMoveRow, {
      userId: ctx.userId as Id<"users">,
      rowId: args.rowId as Id<"programRows">,
      fromOrder: args.fromOrder,
      toOrder: args.toOrder,
    });
    return { success: true };
  },
});

export const groupExerciseTool = createTool({
  description: "Add an exercise to an existing group/superset.",
  args: z.object({
    exerciseRowId: z.string().describe("The ID of the exercise row"),
    groupId: z.string().describe("The group ID to add the exercise to"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programRows.internalGroupExercise, {
      userId: ctx.userId as Id<"users">,
      exerciseRowId: args.exerciseRowId as Id<"programRows">,
      groupId: args.groupId,
    });
    return { success: true };
  },
});

export const ungroupExerciseTool = createTool({
  description: "Remove an exercise from its group/superset.",
  args: z.object({
    exerciseRowId: z.string().describe("The ID of the exercise row to ungroup"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programRows.internalUngroupExercise, {
      userId: ctx.userId as Id<"users">,
      exerciseRowId: args.exerciseRowId as Id<"programRows">,
    });
    return { success: true };
  },
});

// =============================================================================
// Day-level Tools
// =============================================================================

export const addDayTool = createTool({
  description: "Add a new workout day to a program.",
  args: z.object({
    programId: z.string().describe("The ID of the program"),
    dayLabel: z
      .string()
      .describe("Label for the day, e.g. 'Day 1', 'Push Day', 'Monday'"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; dayId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const dayId = await ctx.runMutation(internal.days.internalAddDay, {
      userId: ctx.userId as Id<"users">,
      programId: args.programId as Id<"programs">,
      dayLabel: args.dayLabel,
    });
    return { success: true, dayId };
  },
});

export const updateDayTool = createTool({
  description: "Update a day's label.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to update"),
    dayLabel: z.string().describe("New label for the day"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.days.internalUpdateDay, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
      dayLabel: args.dayLabel,
    });
    return { success: true };
  },
});

export const deleteDayTool = createTool({
  description:
    "Delete a workout day and all its exercises. This cannot be undone.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to delete"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.days.internalDeleteDay, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
    });
    return { success: true };
  },
});

export const moveDayTool = createTool({
  description: "Move a day to a new position within its program.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to move"),
    fromOrder: z
      .number()
      .describe("Current position of the day (for validation)"),
    toOrder: z.number().describe("Target position to move the day to"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.days.internalMoveDay, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
      fromOrder: args.fromOrder,
      toOrder: args.toOrder,
    });
    return { success: true };
  },
});

export const duplicateDayTool = createTool({
  description: "Duplicate a workout day within the same program.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to duplicate"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; newDayId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const newDayId = await ctx.runMutation(internal.days.internalDuplicateDay, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
    });
    return { success: true, newDayId };
  },
});

const rowInputSchema = z.union([
  z.object({
    kind: z.literal("exercise"),
    libraryExerciseId: z.string(),
    weight: z.string().describe("Weight notation (unitless). See addExercise for format."),
    reps: z.string().describe("Rep notation. See addExercise for format."),
    sets: z.string().describe("Set notation. See addExercise for format."),
    rest: z.string().optional().describe("Rest notation. See addExercise for format."),
    effort: z.string().optional().describe("Effort notation (unitless). See addExercise for format."),
    notes: z.string(),
    groupId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("header"),
    groupId: z.string(),
    name: z.string(),
    sets: z.string().optional(),
  }),
]);

export const replaceDayTool = createTool({
  description:
    "Replace all exercises in a day with new ones. Use for bulk rewrites.",
  args: z.object({
    dayId: z.string().describe("The ID of the day to replace"),
    rows: z.array(rowInputSchema).describe("New rows for the day"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.days.internalReplaceDay, {
      userId: ctx.userId as Id<"users">,
      dayId: args.dayId as Id<"days">,
      rows: args.rows.map((row) => {
        if (row.kind === "exercise") {
          return {
            kind: "exercise" as const,
            libraryExerciseId: row.libraryExerciseId as Id<"exerciseLibrary">,
            weight: row.weight,
            reps: row.reps,
            sets: row.sets,
            rest: row.rest,
            effort: row.effort,
            notes: row.notes,
            groupId: row.groupId,
          };
        } else {
          return {
            kind: "header" as const,
            groupId: row.groupId,
            name: row.name,
            sets: row.sets,
          };
        }
      }),
    });
    return { success: true };
  },
});

// =============================================================================
// Program-level Tools
// =============================================================================

export const createProgramTool = createTool({
  description: "Create a new workout program.",
  args: z.object({
    name: z.string().describe("Name for the program"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; programId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const programId = await ctx.runMutation(internal.programs.internalCreateProgram, {
      userId: ctx.userId as Id<"users">,
      name: args.name,
    });
    return { success: true, programId };
  },
});

export const updateProgramTool = createTool({
  description: "Update a program's name.",
  args: z.object({
    programId: z.string().describe("The ID of the program to update"),
    name: z.string().describe("New name for the program"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programs.internalUpdateProgram, {
      userId: ctx.userId as Id<"users">,
      programId: args.programId as Id<"programs">,
      name: args.name,
    });
    return { success: true };
  },
});

export const deleteProgramTool = createTool({
  description:
    "Delete a program and all its days/exercises. This cannot be undone.",
  args: z.object({
    programId: z.string().describe("The ID of the program to delete"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programs.internalDeleteProgram, {
      userId: ctx.userId as Id<"users">,
      programId: args.programId as Id<"programs">,
    });
    return { success: true };
  },
});

export const duplicateProgramTool = createTool({
  description: "Duplicate an entire workout program.",
  args: z.object({
    programId: z.string().describe("The ID of the program to duplicate"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; newProgramId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const newProgramId = await ctx.runMutation(internal.programs.internalDuplicateProgram, {
      userId: ctx.userId as Id<"users">,
      programId: args.programId as Id<"programs">,
    });
    return { success: true, newProgramId };
  },
});

const dayInputSchema = z.object({
  dayLabel: z.string(),
  rows: z.array(rowInputSchema),
});

export const replaceProgramTool = createTool({
  description:
    "Replace all days and exercises in a program. Use for bulk rewrites.",
  args: z.object({
    programId: z.string().describe("The ID of the program to replace"),
    days: z.array(dayInputSchema).describe("New days for the program"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.programs.internalReplaceProgram, {
      userId: ctx.userId as Id<"users">,
      programId: args.programId as Id<"programs">,
      days: args.days.map((day) => ({
        dayLabel: day.dayLabel,
        rows: day.rows.map((row) => {
          if (row.kind === "exercise") {
            return {
              kind: "exercise" as const,
              libraryExerciseId: row.libraryExerciseId as Id<"exerciseLibrary">,
              weight: row.weight,
              reps: row.reps,
              sets: row.sets,
              rest: row.rest,
              effort: row.effort,
              notes: row.notes,
              groupId: row.groupId,
            };
          } else {
            return {
              kind: "header" as const,
              groupId: row.groupId,
              name: row.name,
              sets: row.sets,
            };
          }
        }),
      })),
    });
    return { success: true };
  },
});

// =============================================================================
// Query Tools (for agent to read state)
// =============================================================================

export const getProgramTool = createTool({
  description:
    "Get the full state of a program including all days and exercises. Use this to understand current program state before making edits.",
  args: z.object({
    programId: z.string().describe("The ID of the program to fetch"),
  }),
  handler: async (ctx, args): Promise<unknown> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const program = await ctx.runQuery(internal.programs.internalGetProgram, {
      userId: ctx.userId as Id<"users">,
      programId: args.programId as Id<"programs">,
    });
    return program;
  },
});

export const listProgramsTool = createTool({
  description: "List all programs for the current user.",
  args: z.object({}),
  handler: async (ctx): Promise<unknown> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const programs = await ctx.runQuery(internal.programs.internalListUserPrograms, {
      userId: ctx.userId as Id<"users">,
    });
    return programs;
  },
});

export const searchExercisesTool = createTool({
  description:
    "Search the exercise library by name. Use this to find exercise IDs before adding exercises.",
  args: z.object({
    query: z
      .string()
      .describe("Search query for exercise name, e.g. 'bench', 'squat'"),
  }),
  handler: async (ctx, args): Promise<unknown> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const exercises = await ctx.runQuery(internal.exerciseLibrary.internalSearchExercises, {
      userId: ctx.userId as Id<"users">,
      query: args.query,
    });
    return exercises;
  },
});

export const listExercisesTool = createTool({
  description: "List all available exercises in the library.",
  args: z.object({}),
  handler: async (ctx): Promise<unknown> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const exercises = await ctx.runQuery(internal.exerciseLibrary.internalListExercises, {
      userId: ctx.userId as Id<"users">,
    });
    return exercises;
  },
});

export const getLibraryExerciseTool = createTool({
  description: "Get details of a specific exercise from the library by ID.",
  args: z.object({
    exerciseId: z.string().describe("The ID of the exercise to fetch"),
  }),
  handler: async (ctx, args): Promise<unknown> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const exercise = await ctx.runQuery(internal.exerciseLibrary.internalGetExercise, {
      userId: ctx.userId as Id<"users">,
      exerciseId: args.exerciseId as Id<"exerciseLibrary">,
    });
    return exercise;
  },
});

export const createLibraryExerciseTool = createTool({
  description:
    "Create a new custom exercise in the user's exercise library. Use this when the user wants to add a new exercise that doesn't exist in the library.",
  args: z.object({
    name: z.string().describe("Name of the exercise, e.g. 'Romanian Deadlift', 'Cable Fly'"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; exerciseId: string }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    const exerciseId = await ctx.runMutation(internal.exerciseLibrary.internalAddExercise, {
      userId: ctx.userId as Id<"users">,
      name: args.name,
    });
    return { success: true, exerciseId };
  },
});

export const updateLibraryExerciseTool = createTool({
  description:
    "Update the name of a custom exercise in the library. Cannot edit global exercises.",
  args: z.object({
    exerciseId: z.string().describe("The ID of the exercise to update"),
    name: z.string().describe("New name for the exercise"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.exerciseLibrary.internalUpdateExercise, {
      userId: ctx.userId as Id<"users">,
      exerciseId: args.exerciseId as Id<"exerciseLibrary">,
      name: args.name,
    });
    return { success: true };
  },
});

export const deleteLibraryExerciseTool = createTool({
  description:
    "Delete a custom exercise from the library. Cannot delete global exercises. This will not affect exercises already added to programs.",
  args: z.object({
    exerciseId: z.string().describe("The ID of the exercise to delete"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }
    await ctx.runMutation(internal.exerciseLibrary.internalDeleteExercise, {
      userId: ctx.userId as Id<"users">,
      exerciseId: args.exerciseId as Id<"exerciseLibrary">,
    });
    return { success: true };
  },
});

// =============================================================================
// Export all tools as a record for agent registration
// =============================================================================

export const workoutProgramTools = {
  // Row-level
  addExercise: addExerciseTool,
  addHeader: addHeaderTool,
  updateExercise: updateExerciseTool,
  updateHeader: updateHeaderTool,
  deleteRow: deleteRowTool,
  deleteGroup: deleteGroupTool,
  moveRow: moveRowTool,
  groupExercise: groupExerciseTool,
  ungroupExercise: ungroupExerciseTool,

  // Day-level
  addDay: addDayTool,
  updateDay: updateDayTool,
  deleteDay: deleteDayTool,
  moveDay: moveDayTool,
  duplicateDay: duplicateDayTool,
  replaceDay: replaceDayTool,

  // Program-level
  createProgram: createProgramTool,
  updateProgram: updateProgramTool,
  deleteProgram: deleteProgramTool,
  duplicateProgram: duplicateProgramTool,
  replaceProgram: replaceProgramTool,

  // Exercise library queries
  searchExercises: searchExercisesTool,
  listExercises: listExercisesTool,
  getLibraryExercise: getLibraryExerciseTool,

  // Exercise library mutations
  createLibraryExercise: createLibraryExerciseTool,
  updateLibraryExercise: updateLibraryExerciseTool,
  deleteLibraryExercise: deleteLibraryExerciseTool,

  // Program queries
  getProgram: getProgramTool,
  listPrograms: listProgramsTool,
};
