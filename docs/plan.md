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

Single tool set - trust mode controls execution semantics.

### Row-level Tools
```
addExercise(dayId, libraryExerciseId, weight, reps, sets, notes, groupId?)
addHeader(dayId, name, sets?)
updateRow(rowId, field, value)
deleteRow(rowId)
deleteGroup(headerRowId)      // deletes header + all grouped exercises
moveRow(rowId, newOrder)
groupExercise(exerciseRowId, groupId)
ungroupExercise(exerciseRowId)
```

### Day-level Tools
```
addDay(programId, dayLabel, rows?)
updateDay(dayId, dayLabel)
deleteDay(dayId)              // cascades to all rows
moveDay(dayId, newOrder)
duplicateDay(dayId)
replaceDay(dayId, rows[])     // bulk replace for AI rewrites
```

### Program-level Tools
```
createProgram(name)
updateProgram(programId, name)
deleteProgram(programId)      // cascades to days and rows
duplicateProgram(programId)
replaceProgram(programId, days[])
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

## Implementation Plan

### Phase 1: Data Layer & Schema
- [ ] Define Convex schema for program structure
- [ ] Create pendingChanges table for low trust mode
- [ ] Write Convex mutations for each tool (granular, day-level, program-level)

### Phase 2: UI Components
- [ ] Build grid wrapper component around Dice UI for single day
- [ ] Create scrollable day list layout
- [ ] Implement day navigation

### Phase 3: Manual Editing
- [ ] Wire grid interactions to mutations
- [ ] Handle optimistic updates
- [ ] Test reactivity/re-rendering

### Phase 4: Agent Integration
- [ ] Hook agent tools to mutations
- [ ] Build chat panel component
- [ ] Implement context passing (current program state + pending changes)

### Phase 5: Trust Mode & Pending Changes
- [ ] Build review panel for pending changes
- [ ] Implement trust mode toggle (high/low)
- [ ] Route tool calls through trust mode execution layer
- [ ] Add accept/deny flow for pending changes

### Phase 6: Polish
- [ ] Test agent iteration with pending changes
- [ ] Optimize re-renders
- [ ] Handle edge cases

## Future Features
- Preferred weight unit (lbs or kg)
- Supersets (group exercises together)
- Version history / undo
- Concurrent editing support

