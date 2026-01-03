import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { workoutProgramTools } from "./tools";

const BASE_INSTRUCTIONS = `You are a workout program assistant that helps users create and edit their workout programs.

You have access to tools to:
- Create, update, delete, and duplicate programs
- Add, update, delete, and move workout days
- Add, update, delete, and move exercises within days
- Create exercise groups (supersets/circuits) with headers
- Search the exercise library

When the user asks you to make changes:
1. First use getProgram to understand the current state
2. Use searchExercises to find exercise IDs before adding exercises
3. Make the requested changes using the appropriate tools
4. Confirm what you did

For bulk changes (like rewriting a whole day or program), use replaceDay or replaceProgram.
For granular changes (like updating one exercise), use the specific update tools.

Always validate your understanding with the user before making destructive changes like deleting programs or days.`;

export const workoutAgent = new Agent(components.agent, {
  name: "Workout Program Assistant",
  languageModel: openai.chat("gpt-4.1-mini"),
  instructions: BASE_INSTRUCTIONS,
  tools: workoutProgramTools,
  maxSteps: 10,
});

export function createProgramAgent(programId: Id<"programs">) {
  return new Agent(components.agent, {
    name: "Workout Program Assistant",
    languageModel: openai.chat("gpt-4.1-mini"),
    instructions: `${BASE_INSTRUCTIONS}

## Current Program Context
You are currently editing program ID: ${programId}
Use the getProgram tool with this ID to see the current state before making changes.`,
    tools: workoutProgramTools,
    maxSteps: 10,
  });
}
