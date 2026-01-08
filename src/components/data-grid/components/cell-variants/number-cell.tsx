import * as React from 'react'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'

export function NumberCell<TData>({
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
  const initialValue = cell.getValue() as number
  const [value, setValue] = React.useState(String(initialValue ?? ''))
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const numberCellOpts = cellOpts?.variant === 'number' ? cellOpts : null
  const min = numberCellOpts?.min
  const max = numberCellOpts?.max
  const step = numberCellOpts?.step

  const prevIsEditingRef = React.useRef(isEditing)

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(String(initialValue ?? ''))
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

  const onBlur = React.useCallback(() => {
    const numValue = value === '' ? null : Number(value)
    if (!readOnly && numValue !== initialValue) {
      fireUpdate(numValue)
    }
    tableMeta?.onCellEditingStop?.()
  }, [tableMeta, initialValue, value, readOnly, fireUpdate])

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value)
    },
    [],
  )

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === 'Enter') {
          event.preventDefault()
          const numValue = value === '' ? null : Number(value)
          if (numValue !== initialValue) {
            fireUpdate(numValue)
          }
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true })
        } else if (event.key === 'Tab') {
          event.preventDefault()
          const numValue = value === '' ? null : Number(value)
          if (numValue !== initialValue) {
            fireUpdate(numValue)
          }
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? 'left' : 'right',
          })
        } else if (event.key === 'Escape') {
          event.preventDefault()
          setValue(String(initialValue ?? ''))
          inputRef.current?.blur()
        }
      } else if (isFocused) {
        // Handle Backspace to start editing with empty value
        if (event.key === 'Backspace') {
          setValue('')
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          // Handle typing to pre-fill the value when editing starts
          setValue(event.key)
        }
      }
    },
    [isEditing, isFocused, initialValue, tableMeta, value, fireUpdate],
  )

  React.useEffect(() => {
    const wasEditing = prevIsEditingRef.current
    prevIsEditingRef.current = isEditing

    // Only focus when we start editing (transition from false to true)
    if (isEditing && !wasEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

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
      {isEditing ? (
        <input
          type="number"
          ref={inputRef}
          value={value}
          min={min}
          max={max}
          step={step}
          className="w-full border-none bg-transparent p-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onBlur={onBlur}
          onChange={onChange}
        />
      ) : (
        <span data-slot="grid-cell-content">{value}</span>
      )}
    </DataGridCellWrapper>
  )
}
