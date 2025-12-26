import type { BaseUIEvent } from 'node_modules/@base-ui/react/esm/utils/types'
import * as React from 'react'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'
import { Checkbox } from '@/components/ui/checkbox'

export function CheckboxCell<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  rowHeight,
  isFocused,
  isSelected,
  isSearchMatch,
  isActiveSearchMatch,
  readOnly,
}: Omit<DataGridCellProps<TData>, 'isEditing'>) {
  const initialValue = cell.getValue() as boolean
  const [value, setValue] = React.useState(Boolean(initialValue))
  const containerRef = React.useRef<HTMLDivElement>(null)

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(Boolean(initialValue))
  }

  const onCheckedChange = React.useCallback(
    (checked: boolean) => {
      if (readOnly) return
      setValue(checked)
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: checked })
    },
    [tableMeta, rowIndex, columnId, readOnly],
  )

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        isFocused &&
        !readOnly &&
        (event.key === ' ' || event.key === 'Enter')
      ) {
        event.preventDefault()
        event.stopPropagation()
        onCheckedChange(!value)
      } else if (isFocused && event.key === 'Tab') {
        event.preventDefault()
        tableMeta?.onCellEditingStop?.({
          direction: event.shiftKey ? 'left' : 'right',
        })
      }
    },
    [isFocused, value, onCheckedChange, tableMeta, readOnly],
  )

  const onWrapperClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (isFocused && !readOnly) {
        event.preventDefault()
        event.stopPropagation()
        onCheckedChange(!value)
      }
    },
    [isFocused, value, onCheckedChange, readOnly],
  )

  const onCheckboxClick = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
  }, [])

  const onCheckboxMouseDown = React.useCallback(
    (event: BaseUIEvent<React.MouseEvent<HTMLSpanElement, MouseEvent>>) => {
      event.stopPropagation()
    },
    [],
  )

  const onCheckboxDoubleClick = React.useCallback(
    (event: BaseUIEvent<React.MouseEvent<HTMLSpanElement, MouseEvent>>) => {
      event.stopPropagation()
    },
    [],
  )

  return (
    <DataGridCellWrapper<TData>
      ref={containerRef}
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      rowHeight={rowHeight}
      isEditing={false}
      isFocused={isFocused}
      isSelected={isSelected}
      isSearchMatch={isSearchMatch}
      isActiveSearchMatch={isActiveSearchMatch}
      readOnly={readOnly}
      className="flex size-full justify-center"
      onClick={onWrapperClick}
      onKeyDown={onWrapperKeyDown}
    >
      <Checkbox
        checked={value}
        onCheckedChange={onCheckedChange}
        disabled={readOnly}
        className="border-primary"
        onClick={onCheckboxClick}
        onMouseDown={onCheckboxMouseDown}
        onDoubleClick={onCheckboxDoubleClick}
      />
    </DataGridCellWrapper>
  )
}
