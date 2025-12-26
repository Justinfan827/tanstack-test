# Data Grid Component Documentation

## Cell Editors and Keyboard Event Handling

### The Problem: Grid Keyboard Handling vs Cell Editors

The data grid attaches a native `keydown` event listener to handle keyboard navigation:

```ts
// use-data-grid.ts
dataGridElement.addEventListener('keydown', onDataGridKeyDown)
```

This listener handles Enter, Escape, Tab, and arrow keys for cell navigation. However, cell editors like comboboxes also need to handle these keys for their own interactions (e.g., Enter to select an item).

### Why Native Listeners Intercept React Events

When a user presses Enter on a combobox input inside the grid:

1. **Event bubbles up the DOM**: `input → cell → row → grid`
2. **Grid's native `addEventListener` fires during bubbling**
3. **Grid calls `event.preventDefault()`** to prevent default behavior
4. **React's delegated handlers run after**, but the event is already prevented

React uses event delegation - it doesn't attach listeners to individual elements. Instead, it attaches one listener at the root. This means native listeners on parent elements fire *before* React's synthetic event handlers.

```
Timeline:
1. Enter pressed on input
2. Event bubbles: input → cell → grid
3. Grid's native addEventListener fires, calls preventDefault()
4. React's delegated handler runs, but event is already prevented
5. Base UI (or other library) sees prevented event, doesn't work properly
```

### The Solution: `data-grid-cell-editor` Attribute

Cell editors opt-in to bypass grid keyboard handling by adding the `data-grid-cell-editor` attribute:

```tsx
// ComboboxCell in cell-variants/combobox-cell.tsx
<BaseUICombobox.Input
  data-grid-cell-editor=""
  className="..."
  ref={triggerRef}
/>
<ComboboxContent
  data-grid-cell-editor=""
  ...
>
```

The grid's keydown handler checks for this attribute and skips processing:

```ts
// use-data-grid.ts
if (currentState.editingCell) {
  // Skip grid keyboard handling if event originated from a cell editor
  // (e.g. combobox input/popup). This allows editors like Base UI's Combobox
  // to handle Enter/Escape/Arrow keys for item selection without the grid
  // intercepting and moving focus to the next row.
  // Elements opt-in by adding the `data-grid-cell-editor` attribute.
  const target = event.target as HTMLElement
  if (target?.closest('[data-grid-cell-editor]')) {
    return
  }
  
  // Normal grid keyboard handling (Enter moves to next row, etc.)
  if (key === 'Enter' && !shiftKey && !altKey) {
    event.preventDefault()
    onCellEditingStop({ moveToNextRow: true })
    return
  }
  // ...
}
```

### When to Use `data-grid-cell-editor`

Add this attribute to any element inside a cell that:

1. **Needs to handle keyboard events itself** (Enter, Escape, Arrow keys)
2. **Shouldn't trigger grid navigation** when those keys are pressed

Common examples:
- Combobox/autocomplete inputs
- Dropdown menus and popups
- Custom modal editors
- Any Base UI or Radix primitive that handles keyboard internally

### Implementation Checklist for New Cell Editors

1. Add `data-grid-cell-editor=""` to the focusable input element
2. Add `data-grid-cell-editor=""` to any portal/popup content
3. Let the component library (Base UI, Radix, etc.) handle keyboard events normally
4. The grid will automatically skip its keyboard handling for these elements
