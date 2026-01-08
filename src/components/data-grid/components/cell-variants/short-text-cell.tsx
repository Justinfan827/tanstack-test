import * as React from 'react'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'
import { cn } from '@/lib/utils'

export function ShortTextCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  rowHeight,
  isEditing,
  isFocused,
  isSelected,
  isSearchMatch,
  isActiveSearchMatch,
  readOnly,
  cellOpts,
}: DataGridCellProps<TData>) {
  const initialValue = cell.getValue() as string
  const [value, setValue] = React.useState(initialValue)
  const cellRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(initialValue)
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue
    }
  }

  const fireUpdate = React.useCallback(
    (value: unknown) => {
      const update = { rowIndex, columnId, value }
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

  const onBlur = React.useCallback(() => {
    // Read the current value directly from the DOM to avoid stale state
    const currentValue = cellRef.current?.textContent ?? ''
    if (!readOnly && currentValue !== initialValue) {
      fireUpdate(currentValue)
    }
    tableMeta?.onCellEditingStop?.()
  }, [tableMeta, initialValue, readOnly, fireUpdate])

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? ''
      setValue(currentValue)
    },
    [],
  )

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === 'Enter') {
          event.preventDefault()
          const currentValue = cellRef.current?.textContent ?? ''
          if (currentValue !== initialValue) {
            fireUpdate(currentValue)
          }
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true })
        } else if (event.key === 'Tab') {
          event.preventDefault()
          const currentValue = cellRef.current?.textContent ?? ''
          if (currentValue !== initialValue) {
            fireUpdate(currentValue)
          }
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? 'left' : 'right',
          })
        } else if (event.key === 'Escape') {
          event.preventDefault()
          setValue(initialValue)
          cellRef.current?.blur()
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        // Handle typing to pre-fill the value when editing starts
        setValue(event.key)

        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === 'true') {
            cellRef.current.textContent = event.key
            const range = document.createRange()
            const selection = window.getSelection()
            range.selectNodeContents(cellRef.current)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
          }
        })
      }
    },
    [isEditing, isFocused, initialValue, tableMeta, fireUpdate],
  )

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus()

      if (!cellRef.current.textContent && value) {
        cellRef.current.textContent = value
      }

      if (cellRef.current.textContent) {
        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(cellRef.current)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }, [isEditing, value])

  const displayValue = !isEditing ? (value ?? '') : ''

  return (
    <DataGridCellWrapper<TData>
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
      onKeyDown={onWrapperKeyDown}
    >
      <div
        role="textbox"
        data-slot="grid-cell-content"
        contentEditable={isEditing}
        tabIndex={-1}
        ref={cellRef}
        onBlur={onBlur}
        onInput={onInput}
        suppressContentEditableWarning
        className={cn('size-full overflow-hidden outline-none', {
          'whitespace-nowrap **:inline **:whitespace-nowrap [&_br]:hidden':
            isEditing,
        })}
      >
        {displayValue}
      </div>
    </DataGridCellWrapper>
  )
}
