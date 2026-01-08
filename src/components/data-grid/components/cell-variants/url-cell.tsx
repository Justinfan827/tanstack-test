import * as React from 'react'
import { toast } from 'sonner'
import { DataGridCellWrapper } from '@/components/data-grid/components/data-grid-cell-wrapper'
import type { DataGridCellProps } from '@/components/data-grid/types/data-grid'
import { cn } from '@/lib/utils'

function getUrlHref(urlString: string): string {
  if (!urlString || urlString.trim() === '') return ''

  const trimmed = urlString.trim()

  // Reject dangerous protocols (extra safety, though our http:// prefix would neutralize them)
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return ''
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  return `http://${trimmed}`
}

export function UrlCell<TData>({
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
  const [value, setValue] = React.useState(initialValue ?? '')
  const cellRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const prevInitialValueRef = React.useRef(initialValue)
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue
    setValue(initialValue ?? '')
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue ?? ''
    }
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
    const currentValue = cellRef.current?.textContent?.trim() ?? ''

    if (!readOnly && currentValue !== initialValue) {
      fireUpdate(currentValue || null)
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
          const currentValue = cellRef.current?.textContent?.trim() ?? ''
          if (!readOnly && currentValue !== initialValue) {
            fireUpdate(currentValue || null)
          }
          tableMeta?.onCellEditingStop?.({ moveToNextRow: true })
        } else if (event.key === 'Tab') {
          event.preventDefault()
          const currentValue = cellRef.current?.textContent?.trim() ?? ''
          if (!readOnly && currentValue !== initialValue) {
            fireUpdate(currentValue || null)
          }
          tableMeta?.onCellEditingStop?.({
            direction: event.shiftKey ? 'left' : 'right',
          })
        } else if (event.key === 'Escape') {
          event.preventDefault()
          setValue(initialValue ?? '')
          cellRef.current?.blur()
        }
      } else if (
        isFocused &&
        !readOnly &&
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
    [isEditing, isFocused, initialValue, tableMeta, readOnly, fireUpdate],
  )

  const onLinkClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isEditing) {
        event.preventDefault()
        return
      }

      // Check if URL was rejected due to dangerous protocol
      const href = getUrlHref(value)
      if (!href) {
        event.preventDefault()
        toast.error('Invalid URL', {
          description:
            'URL contains a dangerous protocol (javascript:, data:, vbscript:, or file:)',
        })
        return
      }

      // Stop propagation to prevent grid from interfering with link navigation
      event.stopPropagation()
    },
    [isEditing, value],
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
  const urlHref = displayValue ? getUrlHref(displayValue) : ''
  const isDangerousUrl = displayValue && !urlHref

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
      {!isEditing && displayValue ? (
        <div
          data-slot="grid-cell-content"
          className="size-full overflow-hidden"
        >
          <a
            data-focused={isFocused && !isDangerousUrl ? '' : undefined}
            data-invalid={isDangerousUrl ? '' : undefined}
            href={urlHref}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 data-invalid:cursor-not-allowed data-focused:text-foreground data-invalid:text-destructive data-focused:decoration-foreground/50 data-invalid:decoration-destructive/50 data-focused:hover:decoration-foreground/70 data-invalid:hover:decoration-destructive/70"
            onClick={onLinkClick}
          >
            {displayValue}
          </a>
        </div>
      ) : (
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
      )}
    </DataGridCellWrapper>
  )
}
