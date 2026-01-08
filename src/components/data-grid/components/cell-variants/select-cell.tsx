import * as React from 'react'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SelectCell<TData>({
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
  const [value, setValue] = React.useState(initialValue)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const options = cellOpts?.variant === 'select' ? cellOpts.options : []

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(initialValue)
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

  const onValueChange = React.useCallback(
    (newValue: string) => {
      if (readOnly) return
      setValue(newValue)
      fireUpdate(newValue)
      tableMeta?.onCellEditingStop?.()
    },
    [tableMeta, readOnly, fireUpdate],
  )

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (open && !readOnly) {
        tableMeta?.onCellEditingStart?.(rowIndex, columnId)
      } else {
        tableMeta?.onCellEditingStop?.()
      }
    },
    [tableMeta, rowIndex, columnId, readOnly],
  )

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing && event.key === 'Escape') {
        event.preventDefault()
        setValue(initialValue)
        tableMeta?.onCellEditingStop?.()
      } else if (!isEditing && isFocused && event.key === 'Tab') {
        event.preventDefault()
        tableMeta?.onCellEditingStop?.({
          direction: event.shiftKey ? 'left' : 'right',
        })
      }
    },
    [isEditing, isFocused, initialValue, tableMeta],
  )

  const displayLabel =
    options.find((opt) => opt.value === value)?.label ?? value

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
        <Select
          value={value}
          onValueChange={(v) => onValueChange(v ?? '')} // TODO: maybe an issue?
          open={isEditing}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger
            size="sm"
            className="size-full items-start border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden"
          >
            {displayLabel ? (
              <Badge
                variant="secondary"
                className="whitespace-pre-wrap px-1.5 py-px"
              >
                <SelectValue />
              </Badge>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent
            data-grid-cell-editor=""
            // compensate for the wrapper padding
            align="start"
            alignOffset={-8}
            sideOffset={-8}
            className="min-w-[calc(var(--radix-select-trigger-width)+16px)]"
          >
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : displayLabel ? (
        <Badge
          data-slot="grid-cell-content"
          variant="secondary"
          className="whitespace-pre-wrap px-1.5 py-px"
        >
          {displayLabel}
        </Badge>
      ) : null}
    </DataGridCellWrapper>
  )
}
