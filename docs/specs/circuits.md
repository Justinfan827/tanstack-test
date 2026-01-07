# Circuits

Support circuits (supersets/giant sets) in the program grid.

## Overview

Users can add rows that are either:

- Standalone exercises
- Circuits (header + grouped exercises)

The agent can also create circuits via tools.

---

## Decisions

| Topic                            | Decision                                              |
| -------------------------------- | ----------------------------------------------------- |
| Header row kind                  | `circuitHeader` (renamed from `header`)               |
| Circuit exercise model           | Reuse `exercise` with `groupId` (not a separate kind) |
| Delete circuit exercise          | Remove entirely (ungroup = fast follow)               |
| Drag exercise out of circuit     | Not supported (future)                                |
| Auto-delete empty circuit header | No (fast follow)                                      |
| Promote standalone → circuit     | Future                                                |

### Why reuse `exercise` with `groupId`?

- Schema already supports this pattern
- DRY - circuit exercises have identical fields to standalone
- Simpler mutations - `addExercise` works for both
- Enables future promotion without migration
- Circuit membership is a relationship, not a different entity

Helper for type narrowing:

```typescript
const isCircuitExercise = (row: ProgramRow) =>
  row.kind === "exercise" && row.groupId != null;
```

---

## Data Model

### Row Types

```typescript
// Circuit header
{
  kind: "circuitHeader",
  groupId: string,      // required - links exercises
  name: string,         // circuit name
  sets?: string,        // optional group-level sets
  // ... common fields (clientId, dayId, order)
}

// Standalone exercise
{
  kind: "exercise",
  groupId: undefined,   // no circuit
  // ... exercise fields
}

// Circuit exercise
{
  kind: "exercise",
  groupId: "abc123",    // links to circuitHeader.groupId
  // ... exercise fields
}
```

### Ordering

- All rows (headers + exercises) share the same `order` sequence
- Circuit header comes before its exercises
- `groupId` determines membership, not position

---

## Grid Behavior

### Row Rendering

| Row Type                | Exercise Name Column               | Other Columns         |
| ----------------------- | ---------------------------------- | --------------------- |
| `circuitHeader`         | `short-text-cell` (circuit name)   | See editability below |
| `exercise` (standalone) | `combobox-cell` (exercise library) | Normal                |
| `exercise` (in circuit) | `combobox-cell` (exercise library) | Sets read-only        |

Visual differentiation for circuit exercises: indent or background color (TBD).

### Column Editability

**Circuit header rows:**
| Column | Editable | Notes |
|--------|----------|-------|
| Name (circuit name) | ✅ | `short-text-cell` |
| Sets | ✅ | Updates propagate to all circuit exercises |
| Rest | ✅ | |
| Notes | ✅ | |
| Weight | ❌ | Read-only |
| Reps | ❌ | Read-only |
| Effort | ❌ | Read-only |

**Circuit exercise rows:**
| Column | Editable | Notes |
|--------|----------|-------|
| Sets | ❌ | Controlled by circuit header |
| All others | ✅ | Normal behavior |

### Sets Propagation

When `sets` is updated on a circuit header:

1. Update the header's `sets` field
2. Update `sets` on all exercises where `groupId` matches

This should be a single mutation (`updateCircuitSets`) or handled within `updateField` with propagation logic.

### Add Row Button

Dropdown with options:

- Add Exercise
- Add Circuit

### Keyboard: Shift+Enter (Add Row)

| Context                        | Behavior                                       |
| ------------------------------ | ---------------------------------------------- |
| On circuit header              | Insert exercise at position 0 in circuit       |
| On circuit exercise (not last) | Insert exercise after current row              |
| On circuit exercise (last)     | Dropdown: add to circuit vs. add after circuit |
| On standalone exercise         | Current behavior (add exercise below)          |

"Last circuit exercise" = next row has different/no `groupId`.

### Keyboard: CMD+Backspace (Delete)

| Context                | Behavior                                 |
| ---------------------- | ---------------------------------------- |
| On circuit header      | Delete header + all exercises in circuit |
| On circuit exercise    | Delete exercise (remove from circuit)    |
| On standalone exercise | Current behavior                         |

---

## Mutations

### New/Modified

| Mutation               | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `addCircuit`           | Create header + optional first exercise                 |
| `addExerciseToCircuit` | Add exercise with `groupId`, after specified order      |
| `deleteRow` (header)   | Cascade delete all exercises with matching `groupId`    |
| `updateCircuitSets`    | Update header sets + propagate to all circuit exercises |

### Existing (unchanged)

- `addExercise` - works for standalone (no `groupId`)
- `updateField`, `batchUpdateRows` - work for all row types (with editability checks)
- `moveRow` - works but drag UX not exposed yet

### Editability Enforcement

Options:

1. **Frontend only** - disable cell editing in UI, mutations accept any field
2. **Backend validation** - mutations reject invalid field updates per row type

Recommend: Frontend enforcement initially, backend validation as fast follow.

---

## Phases

### Phase 1: Data Model & Backend

**Goal**: Schema and mutations ready

- [ ] Rename `header` → `circuitHeader` in schema
- [ ] Add `addCircuit` mutation
- [ ] Add `addExerciseToCircuit` mutation
- [ ] Update `deleteRow` to cascade for headers
- [ ] Migrate existing data (if any headers exist)

### Phase 2: Grid Row Rendering

**Goal**: Display headers inline

- [ ] Include `circuitHeader` rows in grid data
- [ ] Polymorphic row renderer (switch on `kind`)
- [ ] `CircuitHeaderRow` component
- [ ] Visual styling for grouped exercises

### Phase 3: Cell Polymorphism & Editability

**Goal**: Exercise name column varies by row type, enforce editability rules

- [ ] Conditional cell renderer for exercise name column
- [ ] Header: `short-text-cell`
- [ ] Exercise: `combobox-cell`
- [ ] Circuit header: disable editing on weight/reps/effort columns
- [ ] Circuit exercise: disable editing on sets column
- [ ] `updateCircuitSets` mutation with propagation
- [ ] Wire sets cell on header to propagation mutation

### Phase 4: Add Row UX

**Goal**: Context-aware row insertion

- [ ] Add row dropdown (Exercise | Circuit)
- [ ] Shift+Enter context detection
- [ ] Dropdown on last circuit exercise
- [ ] Wire mutations

### Phase 5: Delete Operations

**Goal**: Correct deletion semantics

- [ ] CMD+Backspace on header → cascade delete
- [ ] CMD+Backspace on circuit exercise → delete row

### Phase 6: Agent Integration

**Goal**: AI can manage circuits

- [ ] `createCircuit` tool
- [ ] `addExerciseToCircuit` tool
- [ ] Update existing tools for circuit awareness

---

## Dependency Graph

```
Phase 1 (Backend)
    ├── Phase 2 (Rendering)
    │       └── Phase 3 (Cells)
    │               └── Phase 4 (Add UX)
    │                       └── Phase 5 (Delete)
    └── Phase 6 (Agent) [parallel]
```

---

## Fast Follows

- Ungroup exercise (remove from circuit without delete)
- Auto-delete empty circuit header
- Drag exercise out of circuit
- Promote standalone exercise → circuit
- Drag to reorder within/across circuits
- Backend validation for editability rules
