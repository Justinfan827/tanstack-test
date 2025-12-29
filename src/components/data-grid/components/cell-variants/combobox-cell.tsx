import { Combobox as BaseUICombobox } from '@base-ui/react/combobox'
import * as React from 'react'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'

export function ComboboxCell<TData>({
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
}: DataGridCellProps<TData>) {
  const initialValue = (cell.getValue() as string) ?? ''
  const [value, setValue] = React.useState(initialValue)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const cellOpts = cell.column.columnDef.meta?.cell
  const options = cellOpts?.variant === 'combobox' ? cellOpts.options : []

  // Create items array (values) and label map
  const items = React.useMemo(() => options.map((opt) => opt.value), [options])
  const labelMap = React.useMemo(
    () => new Map(options.map((opt) => [opt.value, opt.label])),
    [options],
  )

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(initialValue)
  }

  const onValueChange = React.useCallback(
    (newValue: string | null) => {
      if (readOnly || !newValue) return
      setValue(newValue)
      tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: newValue })
      tableMeta?.onCellEditingStop?.()
    },
    [tableMeta, rowIndex, columnId, readOnly],
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

  const displayLabel = labelMap.get(value) ?? value
  const triggerRef = React.useRef<HTMLInputElement | null>(null)

  // Focus the input when entering edit mode
  React.useEffect(() => {
    if (isEditing && triggerRef.current) {
      triggerRef.current.focus()
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
        <Combobox
          items={items}
          value={value}
          onValueChange={onValueChange}
          open={isEditing}
          onOpenChange={onOpenChange}
          itemToStringLabel={(optionValue: string) =>
            labelMap.get(optionValue) ?? optionValue
          }
        >
          <BaseUICombobox.Input
            data-grid-cell-editor=""
            className="overflow-hidden outline-none whitespace-nowrap"
            ref={triggerRef}
          />
          <ComboboxContent
            data-grid-cell-editor=""
            anchor={triggerRef}
            className="w-[230px]"
            sideOffset={8}
            align="start"
            alignOffset={-8}
          >
            <ComboboxEmpty>No exercises found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => {
                const label = labelMap.get(item) ?? item
                return (
                  <ComboboxItem key={item} value={item}>
                    {label}
                  </ComboboxItem>
                )
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      ) : (
        <div
          data-slot="grid-cell-content"
          className="size-full overflow-hidden outline-none whitespace-nowrap"
        >
          {displayLabel}
        </div>
      )}
    </DataGridCellWrapper>
  )
}
