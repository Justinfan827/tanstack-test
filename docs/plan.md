# Tech spec: Editable workout program grid

## Overview

Create a spreadsheet-like experience for editing workout programs with AI chatbot assistance. A program contains multiple days of workouts. Users can edit manually or have the agent make edits via tool calls. The agent has edit permissions and can make granular or bulk changes depending on user request.

## UI Layout

- **Left side**: Scrollable list of multiple grids (one grid per day)
- **Right side**: Chat panel for agent interaction
- No sorting/filtering needed in grids

## Grid Columns

1. Exercise name (select cell)
2. Weight (text cell - 'weight notation')
3. Reps (text cell - 'rep notation')
4. Sets (text cell - 'set notation')
5. Notes (text area cell)

Component: Dice UI data-grid (https://www.diceui.com/docs/components/data-grid)

## Data Model

### Convex Schema

```typescript
// convex/schema.ts
users: defineTable({
  authId: v.string(),
  name: v.string(),
  trustMode: v.union(v.literal("high"), v.literal("low")), // user setting
}).index("by_auth_id", ["authId"])

exerciseLibrary: defineTable({
  name: v.string(),
  userId: v.optional(v.id("users")), // null = global default
})
  .index("by_user", ["userId"])
  .searchIndex("search_name", { searchField: "name" })

programs: defineTable({
  name: v.string(),
  userId: v.id("users"),
}).index("by_user", ["userId"])

days: defineTable({
  programId: v.id("programs"),
  dayLabel: v.string(),
  order: v.number(), // integer, renumber on reorder
})
  .index("by_program", ["programId"])
  .index("by_program_and_order", ["programId", "order"])

programRows: defineTable(
  v.union(
    v.object({
      kind: v.literal("exercise"),
      dayId: v.id("days"),
      order: v.number(),
      libraryExerciseId: v.id("exerciseLibrary"),
      weight: v.string(),
      reps: v.string(),
      sets: v.string(),
      notes: v.string(),
      groupId: v.optional(v.string()), // references header's groupId
    }),
    v.object({
      kind: v.literal("header"),
      dayId: v.id("days"),
      order: v.number(),
      groupId: v.string(),
      name: v.string(),
      sets: v.optional(v.string()),
    }),
  )
)
  .index("by_day", ["dayId"])
  .index("by_day_and_order", ["dayId", "order"])
  .index("by_group", ["groupId"])
```

### Example Data
```
order | kind     | groupId | name/exercise
------|----------|---------|---------------
1     | exercise | null    | Squats
2     | header   | "ss1"   | "Chest-Triceps Circuit"
3     | exercise | "ss1"   | Bench Press
4     | exercise | "ss1"   | Tricep Dips
5     | exercise | null    | Deadlifts
```

### Pending Changes (Low Trust Mode) - TODO
Separate tables for different change types:
- pendingExerciseFieldUpdates
- pendingExerciseAdds
- pendingExerciseDeletes
- pendingDayAdds / pendingDayDeletes / pendingDayReplaces

## Agent Tool Interface

Single tool set - trust mode controls execution semantics. Tools use `createTool` from `@convex-dev/agent` and call mutations via `ctx.runMutation`.

### Row-level Tools
```typescript
addExercise(dayId, libraryExerciseId, weight, reps, sets, notes, groupId?)
  → appends to end of day, returns rowId

addHeader(dayId, name, sets?)
  → appends header row, generates unique groupId, returns rowId

updateRow(rowId, updates: Partial<ExerciseFields | HeaderFields>)
  → patches row fields (whole row edit in 1 call)
  → validates fields match row kind

deleteRow(rowId)
  → deletes single row, renumbers remaining

deleteGroup(headerRowId)
  → deletes header + all exercises with matching groupId

moveRow(rowId, fromOrder, toOrder)
  → validates fromOrder matches current (detects stale calls)
  → renumbers affected rows

groupExercise(exerciseRowId, groupId)
  → sets groupId on exercise row

ungroupExercise(exerciseRowId)
  → clears groupId on exercise row
```

### Day-level Tools
```typescript
addDay(programId, dayLabel, rows?)
  → appends day to program
  → optionally bulk-inserts rows

updateDay(dayId, dayLabel)
  → patches day label

deleteDay(dayId)
  → cascades: deletes all programRows for day, then day

moveDay(dayId, fromOrder, toOrder)
  → validates fromOrder, renumbers days

duplicateDay(dayId)
  → copies day + all rows to same program (appended)

replaceDay(dayId, rows[])
  → bulk replace: deletes existing rows, inserts new
  → for AI rewrites
```

### Program-level Tools
```typescript
createProgram(name)
  → creates program for authenticated user

updateProgram(programId, name)
  → patches program name

deleteProgram(programId)
  → cascades: deletes all days + rows, then program

duplicateProgram(programId)
  → copies program + days + rows for same user

replaceProgram(programId, days[])
  → bulk replace: deletes existing days/rows, inserts new
```

## Execution Model

Trust mode is a **user setting** stored on the users table.

**High Trust Mode:**
- Tool calls mutate program directly
- User sees changes immediately

**Low Trust Mode:**
- Tool calls create entries in pendingChanges (scoped to program)
- UI shows review panel for pending changes
- User accepts/denies before changes apply
- Agent sees both current state + pending changes in chat context, enabling iteration

## Design Decisions

### Normalized Tables
**Decision:** Fully normalized schema - programs, days, and programRows as separate tables.

**Rationale:**
- **Mutation simplicity**: `db.patch(rowId, {weight: "135"})` vs array splice logic
- **Concurrent editing**: Two edits to different rows don't conflict
- **Stable references**: Convex `_id` provides stable row identity for React keys and tool calls
- **Convex reactivity**: Query reruns either way (embedded or normalized), so pick for ergonomics

**Trade-off:** Extra queries to load full program, but cleaner mutation model.

### Discriminated Union for Row Types
**Decision:** `programRows` table uses discriminated union for exercise vs header rows.

**Rationale:**
- **Single table**: One query for all rows in a day, ordered correctly
- **Type safety**: Each row kind has its required fields
- **Grid rendering**: Flat array maps directly to grid rows

### Integer Ordering with Renumber
**Decision:** Use integer `order` field, renumber all on reorder.

**Rationale:**
- **Simplicity**: No fractional precision issues or compaction needed
- **Scale**: 10-15 exercises per day → O(n) renumber is ~15 writes max
- **Predictable**: Easy to debug and reason about

**Alternative rejected:** Fractional ordering (over-engineered for small N).

### Trust Mode as User Setting
**Decision:** Trust mode stored on users table, not per-chat.

**Rationale:**
- **Simplicity**: User preference applies globally
- **No chat sessions table needed**: Agent component handles chat storage

### Exercise Library with FK Reference
**Decision:** Separate `exerciseLibrary` table, exercises reference via `libraryExerciseId`.

**Rationale:**
- **Dropdown support**: Query library for select cell options
- **Global + user exercises**: `userId: null` for defaults, set for user-specific
- **Future extensibility**: Add muscle groups, equipment metadata later

## Reactivity & Syncing

- Convex tracks dependencies at document + index range level
- Query reruns when any document in its read set changes
- Normalized tables = cleaner mutations, same reactivity story
- Convex auto-syncs back to client (no manual refetch needed)
- Data-grid virtualization minimizes re-render overhead

## Implementation Details

### File Organization (✅ Implemented)
```
convex/
  schema.ts              # ✅ Convex schema
  auth.ts                # ✅ existing better-auth setup
  chat.ts                # ✅ createNewThread (passes userId), sendMessage, listMessages

  # Mutations (public - used by UI)
  programs.ts            # ✅ createProgram, updateProgram, deleteProgram, duplicateProgram, replaceProgram + queries
  days.ts                # ✅ addDay, updateDay, deleteDay, moveDay, duplicateDay, replaceDay
  programRows.ts         # ✅ addExercise, addHeader, updateExercise, updateHeader, deleteRow, deleteGroup, moveRow, groupExercise, ungroupExercise
  exerciseLibrary.ts     # ✅ listExercises, searchExercises, addExercise, deleteExercise, getExercise

  # Internal mutations (agent-only - accept userId as parameter)
  programs.ts            # ✅ internalCreateProgram, internalUpdateProgram, internalDeleteProgram, internalDuplicateProgram, internalReplaceProgram, internalGetProgram, internalListUserPrograms
  days.ts                # ✅ internalAddDay, internalUpdateDay, internalDeleteDay, internalMoveDay, internalDuplicateDay, internalReplaceDay
  programRows.ts         # ✅ internalAddExercise, internalAddHeader, internalUpdateExercise, internalUpdateHeader, internalDeleteRow, internalDeleteGroup, internalMoveRow, internalGroupExercise, internalUngroupExercise
  exerciseLibrary.ts     # ✅ internalListExercises, internalSearchExercises, internalAddExercise, internalDeleteExercise

  # Agent
  agent.ts               # ✅ workoutAgent with all tools registered
  tools.ts               # ✅ 25 createTool wrappers using internal mutations with ctx.userId

  # Helpers (internal)
  helpers/
    auth.ts              # ✅ getCurrentUserId, verifyProgramOwnership, verifyDayOwnership, verifyRowOwnership
    ordering.ts          # ✅ getNextRowOrder, renumberRows, getNextDayOrder, renumberDays, deleteRowsForDay, deleteDaysForProgram
    validators.ts        # ✅ exerciseRowInput, headerRowInput, rowInput, dayInput, exerciseFieldUpdates, headerFieldUpdates
```

### Implementation Decisions Made

**1. Split updateRow into updateExercise and updateHeader**
- Cleaner type validation for discriminated union
- Agent tools can still provide unified `updateRow` experience by checking row kind first

**2. Auth pattern uses better-auth `_id` field**
- `authComponent.getAuthUser(ctx)` returns better-auth user with `_id`
- Look up our users table via `authId` index to get internal user ID
- All ownership verification traces: row → day → program → userId

**3. Bulk validators defined in helpers/validators.ts**
- `rowInput` - union of exercise and header row shapes (without dayId/order)
- `dayInput` - day label + array of rowInput
- Used by replaceDay and replaceProgram for bulk operations

**4. Tools use explicit return type annotations**
- Required to avoid TypeScript circular inference issues with createTool
- Handler functions annotated with `Promise<{ success: boolean; ... }>`

**5. ID casting in tools**
- Zod schemas use `z.string()` for IDs (agent sends strings)
- Handler casts to `Id<"tableName">` when calling mutations

**6. Agent authentication via thread context (not session auth)**
- Agent tools run in action context where `authComponent.getAuthUser(ctx)` returns null
- Solution: Pass userId when creating thread, access via `ctx.userId` in tools
- Pattern:
  - `createNewThread` in chat.ts calls `getCurrentUserId(ctx)` and passes to `createThread(ctx, components.agent, { userId })`
  - All tools check `if (!ctx.userId) throw new Error("User not authenticated")`
  - Tools call internal mutations with `userId: ctx.userId as Id<"users">`
  - Internal mutations accept `userId` as first arg and call `verify*Ownership(ctx, id, args.userId)`
- Why two sets of mutations:
  - Public mutations: Used by UI, get userId from auth session via `getCurrentUserId(ctx)`
  - Internal mutations: Used by agent tools, accept userId as parameter (no auth session in action context)

### Agent Tools Summary (25 total)

| Category | Tools |
|----------|-------|
| Row-level | addExercise, addHeader, updateExercise, updateHeader, deleteRow, deleteGroup, moveRow, groupExercise, ungroupExercise |
| Day-level | addDay, updateDay, deleteDay, moveDay, duplicateDay, replaceDay |
| Program-level | createProgram, updateProgram, deleteProgram, duplicateProgram, replaceProgram |
| Queries | getProgram, listPrograms, searchExercises, listExercises |

### Agent Configuration
```typescript
// convex/agent.ts
export const workoutAgent = new Agent(components.agent, {
  name: "Workout Program Assistant",
  languageModel: openai.chat("gpt-4o"),
  instructions: `You are a workout program assistant...`,
  tools: workoutProgramTools,
  maxSteps: 10,
});
```

### Queries Implemented
```typescript
// programs.ts
getProgram(programId)           // ✅ returns program + days + rows (denormalized for UI)
listUserPrograms()              // ✅ returns user's programs with dayCount

// exerciseLibrary.ts
searchExercises(query)          // ✅ full-text search, returns global + user exercises
listExercises()                 // ✅ all exercises for user (global + own)
getExercise(exerciseId)         // ✅ single exercise lookup
```

## Implementation Plan

### Phase 1: Data Layer & Mutations ✅
- [x] Define Convex schema for program structure
- [x] Create helper functions (auth, ordering, validators)
- [x] Write programRows mutations (addExercise, addHeader, updateExercise, updateHeader, deleteRow, deleteGroup, moveRow, groupExercise, ungroupExercise)
- [x] Write days mutations (addDay, updateDay, deleteDay, moveDay, duplicateDay, replaceDay)
- [x] Write programs mutations (create, update, delete, duplicate, replace) + queries
- [x] Write exerciseLibrary queries/mutations
- [ ] Seed exercise library with global defaults (assumed pre-seeded)

### Phase 2: Agent Tools ✅
- [x] Define tools wrapping each mutation (25 tools)
- [x] Register tools with workoutAgent
- [x] Implement agent auth pattern (internal mutations + thread userId)
- [ ] Test tool execution end-to-end

### Phase 3: UI Components
- [x] Add debug UI for testing program CRUD (src/routes/demo/auth.tsx - ProgramsDebug component)
- [ ] Build grid wrapper component around Dice UI for single day
- [ ] Create scrollable day list layout
- [ ] Implement day navigation

### Phase 4: Manual Editing
- [ ] Wire grid interactions to mutations
- [ ] Handle optimistic updates
- [ ] Test reactivity/re-rendering

### Phase 5: Agent Integration
- [ ] Build chat panel component
- [ ] Implement context passing (current program state)

### Phase 6: Trust Mode & Pending Changes (TODO - defer)
- [ ] Create pendingChanges tables
- [ ] Build review panel for pending changes
- [ ] Implement trust mode toggle (high/low)
- [ ] Route tool calls through trust mode execution layer
- [ ] Add accept/deny flow for pending changes

## Future Features
- Preferred weight unit (lbs or kg)
- Supersets (group exercises together)
- Version history / undo
- Concurrent editing support

