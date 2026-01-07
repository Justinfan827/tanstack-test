'use client'

import * as React from 'react'

import { CheckboxCell } from '@/components/data-grid/components/cell-variants/checkbox-cell'
import { ComboboxCell } from '@/components/data-grid/components/cell-variants/combobox-cell'
import { DateCell } from '@/components/data-grid/components/cell-variants/date-cell'
import { FileCell } from '@/components/data-grid/components/cell-variants/file-cell'
import { LongTextCell } from '@/components/data-grid/components/cell-variants/long-text-cell'
import { MultiSelectCell } from '@/components/data-grid/components/cell-variants/multi-select-cell'
import { NumberCell } from '@/components/data-grid/components/cell-variants/number-cell'
import { SelectCell } from '@/components/data-grid/components/cell-variants/select-cell'
import { ShortTextCell } from '@/components/data-grid/components/cell-variants/short-text-cell'
import { UrlCell } from '@/components/data-grid/components/cell-variants/url-cell'
import type {
  CellOpts,
  DataGridCellProps,
} from '@/components/data-grid/types/data-grid'

export const DataGridCell = React.memo(DataGridCellImpl, (prev, next) => {
  // Fast path: check stable primitive props first
  if (prev.isFocused !== next.isFocused) return false
  if (prev.isEditing !== next.isEditing) return false
  if (prev.isSelected !== next.isSelected) return false
  if (prev.isSearchMatch !== next.isSearchMatch) return false
  if (prev.isActiveSearchMatch !== next.isActiveSearchMatch) return false
  if (prev.readOnly !== next.readOnly) return false
  if (prev.rowIndex !== next.rowIndex) return false
  if (prev.columnId !== next.columnId) return false
  if (prev.rowHeight !== next.rowHeight) return false

  // Check cell value using row.original instead of getValue() for stability
  // getValue() is unstable and recreates on every render, breaking memoization
  const prevValue = (prev.cell.row.original as Record<string, unknown>)[
    prev.columnId
  ]
  const nextValue = (next.cell.row.original as Record<string, unknown>)[
    next.columnId
  ]
  if (prevValue !== nextValue) {
    return false
  }

  // Check cell/row identity
  if (prev.cell.row.id !== next.cell.row.id) return false

  return true
}) as typeof DataGridCellImpl

function DataGridCellImpl<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  isSearchMatch,
  isActiveSearchMatch,
  readOnly,
  rowHeight,
}: DataGridCellProps<TData>) {
  const rowData = cell.row.original

  // Resolve cell options, handling polymorphic variant
  let cellOpts: CellOpts | undefined = cell.column.columnDef.meta?.cell
  if (cellOpts?.variant === 'polymorphic') {
    const key = cellOpts.discriminatorKey ?? 'kind'
    const discriminator = (rowData as Record<string, unknown>)[key] as string
    cellOpts = cellOpts.variants[discriminator]
  }

  const variant = cellOpts?.variant ?? 'short-text'

  // Compute effective readOnly: grid-level OR cell-level
  const cellReadOnly =
    typeof cellOpts?.readOnly === 'function'
      ? cellOpts.readOnly(rowData)
      : (cellOpts?.readOnly ?? false)
  const isReadOnly = readOnly || cellReadOnly

  let Comp: React.ComponentType<DataGridCellProps<TData>>

  switch (variant) {
    case 'short-text':
      Comp = ShortTextCell
      break
    case 'long-text':
      Comp = LongTextCell
      break
    case 'number':
      Comp = NumberCell
      break
    case 'url':
      Comp = UrlCell
      break
    case 'checkbox':
      Comp = CheckboxCell
      break
    case 'select':
      Comp = SelectCell
      break
    case 'combobox':
      Comp = ComboboxCell
      break
    case 'multi-select':
      Comp = MultiSelectCell
      break
    case 'date':
      Comp = DateCell
      break
    case 'file':
      Comp = FileCell
      break

    default:
      Comp = ShortTextCell
      break
  }

  return (
    <Comp
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
      readOnly={isReadOnly}
      cellOpts={cellOpts}
    />
  )
}
