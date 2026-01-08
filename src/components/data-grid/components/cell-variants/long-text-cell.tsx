import * as React from 'react'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'

export function LongTextCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  rowHeight,
  isFocused,
  isEditing,
  isSelected,
  isSearchMatch,
  isActiveSearchMatch,
  readOnly,
  cellOpts,
}: DataGridCellProps<TData>) {
  const initialValue = cell.getValue() as string
  const [value, setValue] = React.useState(initialValue ?? '')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const sideOffset = -(containerRef.current?.clientHeight ?? 0)

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(initialValue ?? '')
  }

  const fireUpdate = React.useCallback(
    (val: unknown) => {
      const update = { rowIndex, columnId, value: val }
      if (cellOpts?.onDataUpdate) {
        const updates = cellOpts.onDataUpdate(
          update,
          cell.row.original,
          cell.getContext()
            .table as unknown as import('@tanstack/react-table').Table<unknown>,
        )
        if (updates.length) tableMeta?.onDataUpdate?.(updates)
      } else {
        tableMeta?.onDataUpdate?.(update)
      }
    },
    [tableMeta, rowIndex, columnId, cellOpts, cell],
  )

  const debouncedSave = useDebouncedCallback((newValue: string) => {
    if (!readOnly) {
      fireUpdate(newValue)
    }
  }, 300)

  const onSave = React.useCallback(() => {
    // Immediately save any pending changes and close the popover
    if (!readOnly && value !== initialValue) {
      fireUpdate(value)
    }
    tableMeta?.onCellEditingStop?.()
  }, [tableMeta, value, initialValue, readOnly, fireUpdate])

  const onCancel = React.useCallback(() => {
    // Restore the original value
    setValue(initialValue ?? '')
    if (!readOnly) {
      fireUpdate(initialValue)
    }
    tableMeta?.onCellEditingStop?.()
  }, [tableMeta, initialValue, readOnly, fireUpdate])

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (open && !readOnly) {
        tableMeta?.onCellEditingStart?.(rowIndex, columnId)
      } else {
        // Immediately save any pending changes when closing
        if (!readOnly && value !== initialValue) {
          fireUpdate(value)
        }
        tableMeta?.onCellEditingStop?.()
      }
    },
    [tableMeta, value, initialValue, rowIndex, columnId, readOnly, fireUpdate],
  )

  // TODO: base ui does not have this prop.
  //
  // const onOpenAutoFocus: NonNullable<
  //   React.ComponentProps<typeof PopoverContent>["onOpenAutoFocus"]
  // > = React.useCallback((event) => {
  //   event.preventDefault();
  //   if (textareaRef.current) {
  //     textareaRef.current.focus();
  //     const length = textareaRef.current.value.length;
  //     textareaRef.current.setSelectionRange(length, length);
  //   }
  // }, []);

  const onBlur = React.useCallback(() => {
    // Immediately save any pending changes on blur
    if (!readOnly && value !== initialValue) {
      fireUpdate(value)
    }
    tableMeta?.onCellEditingStop?.()
  }, [tableMeta, value, initialValue, readOnly, fireUpdate])

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value
      setValue(newValue)
      debouncedSave(newValue)
    },
    [debouncedSave],
  )

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        onSave()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        // Save any pending changes
        if (value !== initialValue) {
          fireUpdate(value)
        }
        tableMeta?.onCellEditingStop?.({
          direction: event.shiftKey ? 'left' : 'right',
        })
        return
      }
      // Stop propagation to prevent grid navigation
      event.stopPropagation()
    },
    [onSave, onCancel, value, initialValue, tableMeta, fireUpdate],
  )

  return (
    <Popover open={isEditing} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <DataGridCellWrapper
            ref={containerRef}
            cell={cell}
            tableMeta={tableMeta}
            rowIndex={rowIndex}
            columnId={columnId}
            rowHeight={rowHeight}
            isEditing={isEditing}
            isFocused={isFocused}
            isSelected={isSelected}
            isSearchMatch={isSearchMatch}
            isActiveSearchMatch={isActiveSearchMatch}
            readOnly={readOnly}
          />
        }
      >
        <span data-slot="grid-cell-content">{value}</span>
      </PopoverTrigger>
      <PopoverContent
        data-grid-cell-editor=""
        align="start"
        side="bottom"
        sideOffset={sideOffset}
        className="w-[400px] rounded-none p-0"
        // onOpenAutoFocus={onOpenAutoFocus}
      >
        <Textarea
          placeholder="Enter text..."
          className="max-h-[300px] min-h-[150px] resize-none overflow-y-auto rounded-none border-0 shadow-none focus-visible:ring-0"
          ref={textareaRef}
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </PopoverContent>
    </Popover>
  )
}
