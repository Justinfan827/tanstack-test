# Bug: Focus Loss on Optimistic Update Confirmation

**Status:** Investigated, not yet fixed  
**Severity:** High (UX regression)  
**Component:** DataGrid + Convex optimistic updates

## Summary

When adding a row with Convex optimistic updates, focus correctly moves to the new row's first cell. However, when the server confirms the mutation (~50-200ms later), focus jumps to the grid container instead of staying on the cell.

## Root Cause

**Row identity instability between optimistic and confirmed states.**

### The Problem

Convex generates IDs server-side. Optimistic updates must use temporary client-side IDs:

```typescript
// Optimistic update creates temp ID
const tempId = `temp_${Date.now()}` as Id<'programRows'>

// Server returns real ID
const realId = "j57abc..." // Different from tempId
```

React uses `key` (derived from `getRowId(row) → row._id`) for reconciliation:

| Render | Row Key | React's Action |
|--------|---------|----------------|
| 1 (optimistic) | `temp_1735432800000` | Mount new row |
| 2 (confirmed) | `j57abc...` | Unmount old, mount new |

Because the key changes, React treats it as a **different element** and remounts the entire row, causing:
1. Old cell unmounts → `focusout` event fires
2. `focusout` handler tries to restore focus
3. Old cell element no longer in DOM
4. Falls back to focusing container

### Contrast with Stable IDs

When client and server use the same ID:

| Render | Row Key | React's Action |
|--------|---------|----------------|
| 1 (optimistic) | `3` | Mount new row |
| 2 (confirmed) | `3` | Patch existing row |

Same key → React patches in place → DOM element preserved → focus stays.

## Reproduction

### Confirmed reproduction in `/demo/simple-table`

Modified to simulate Convex pattern:
- Client creates `temp_xxx` ID
- Server returns `server_xxx` ID (different)
- 3 second delay to observe behavior

Steps:
1. Navigate to `/demo/simple-table`
2. Enable FocusDebugger (bottom-left corner)
3. Click "Add Row"
4. Observe: focus goes to Category cell
5. Wait 3 seconds
6. Observe: focus jumps to container

### Working version (stable IDs)

When client ID = server ID, focus is preserved correctly.

## Affected Code Paths

| File | Lines | Description |
|------|-------|-------------|
| `convex/programRows.ts` | - | Mutation returns server-generated ID |
| `program-grid.tsx` | 201-237 | `withOptimisticUpdate` creates temp ID |
| `program-grid.tsx` | 386-395 | `onRowAdd` returns focus target |
| `use-data-grid.ts` | 3083-3127 | `focusout` handler falls back to container |

## Potential Solutions

### 1. Deferred Focus Application (Recommended)

Don't focus immediately in `onRowAdd`. Store pending focus target, apply after data stabilizes.

```typescript
// In useDataGrid
const pendingFocus = useRef<{rowIndex: number, columnId: string} | null>(null)

// In onRowAdd handler
pendingFocus.current = { rowIndex, columnId }

// In useEffect watching data changes
useEffect(() => {
  if (pendingFocus.current && !isTransitioning) {
    focusCellByIndex(pendingFocus.current.rowIndex, pendingFocus.current.columnId)
    pendingFocus.current = null
  }
}, [data, isTransitioning])
```

**Pros:** Clean, explicit, works with any backend  
**Cons:** Slight delay before focus appears

### 2. Index-Based Focus Restoration

Track focus by `{rowIndex, columnId}` instead of `{rowId, columnId}`. After any data change, restore focus by index.

```typescript
// Store focus position, not element reference
const focusPosition = useRef<{rowIndex: number, columnId: string} | null>(null)

// On focusout during data transition, restore by index
```

**Pros:** Simple concept  
**Cons:** Breaks if rows reorder during update

### 3. Temp-to-Real ID Mapping

Track mapping from temp IDs to real IDs. When server confirms, update internal focus state.

```typescript
const tempToRealId = useRef(new Map<string, string>())

// After server confirms
tempToRealId.current.set(tempId, realId)

// Update focusedCell state to use real ID
```

**Pros:** Robust  
**Cons:** Complex, needs coordination between grid and data layer

### 4. Suppress Focusout During Transitions

Detect when data is "settling" and skip the fallback-to-container behavior in `focusout` handler.

```typescript
// In focusout handler
if (isDataTransitioning.current) {
  // Don't fall back to container, let the new render handle focus
  return
}
```

**Pros:** Non-invasive  
**Cons:** Timing-dependent, may be fragile

### 5. Client-Generated UUIDs

Generate stable UUIDs on client, send to server.

```typescript
import { v4 as uuid } from 'uuid'
const id = uuid() // Same ID used client & server
```

**Pros:** Simplest solution  
**Cons:** Convex doesn't support client-provided IDs for `_id` field

## Recommendation

Implement **Option 1 (Deferred Focus)** with **Option 4 (Suppress Focusout)** as a safety net:

1. `onRowAdd` returns `{rowIndex, columnId}` and stores as pending focus
2. Focus is applied after transition completes and data stabilizes
3. `focusout` handler checks for pending focus and doesn't fall back to container

This approach:
- Works with Convex's server-generated IDs
- Is explicit about focus timing
- Doesn't require changes to data layer
- Is testable with the simple-table demo

## Test Cases

1. Add row → focus should land on first cell of new row
2. Add row → edit cell → server confirms → focus should stay on cell
3. Add row → tab to next cell → server confirms → focus should stay on current cell
4. Rapid add multiple rows → focus should track correctly
5. Add row while scrolled → focus + scroll should work together

## Related Files

- `src/components/data-grid/hooks/use-data-grid.ts`
- `src/features/programstudio/program-grid.tsx`
- `src/routes/demo/simple-table.tsx` (reproduction test)
- `src/components/debug/FocusDebugger.tsx` (debugging tool)
