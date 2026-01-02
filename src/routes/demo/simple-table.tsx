import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { ColumnDef } from '@tanstack/react-table'
import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react'
import { DataGrid } from '@/components/data-grid/components/data-grid'
import { useDataGrid } from '@/components/data-grid/hooks/use-data-grid'

export const Route = createFileRoute('/demo/simple-table')({
  component: SimpleTableDemo,
  loader: () => getRows(),
})

interface Row {
  id: string
  category: string
  name: string
  value: string
}

const CATEGORY_OPTIONS = [
  { label: 'Electronics', value: 'electronics' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Food', value: 'food' },
  { label: 'Books', value: 'books' },
  { label: 'Sports', value: 'sports' },
]

// Server-side state (simulates database)
let serverRows: Row[] = [
  { id: '1', category: 'electronics', name: 'Laptop', value: '1200' },
  { id: '2', category: 'clothing', name: 'T-Shirt', value: '25' },
]

// Server function to get rows
const getRows = createServerFn({ method: 'GET' }).handler(async () => {
  return serverRows
})

// Counter for server-generated IDs
let serverIdCounter = 100

// Server function to add a row (with 3s delay)
// Simulates Convex behavior: ignores client temp ID, generates real server ID
const addRowOnServer = createServerFn({ method: 'POST' })
  .inputValidator((data: { tempId: string }) => data)
  .handler(async ({ data: _data }) => {
    // Simulate slow database write
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Server generates its OWN ID (like Convex does)
    const realId = `server_${serverIdCounter++}`
    const newRow: Row = { id: realId, category: '', name: '', value: '' }
    serverRows = [...serverRows, newRow]
    return serverRows
  })

// Server function to update rows
const updateRowsOnServer = createServerFn({ method: 'POST' })
  .inputValidator((data: { rows: Row[] }) => data)
  .handler(async ({ data }) => {
    serverRows = data.rows
    return serverRows
  })

// Server function to delete rows
const deleteRowsOnServer = createServerFn({ method: 'POST' })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const idsToDelete = new Set(data.ids)
    serverRows = serverRows.filter((r) => !idsToDelete.has(r.id))
    return serverRows
  })

function SimpleTableDemo() {
  const initialRows = Route.useLoaderData()
  const [isPending, startTransition] = useTransition()

  // "Client" state that reflects server
  const [clientRows, setClientRows] = useState(initialRows)

  // Optimistic state
  const [optimisticRows, setOptimisticRows] = useOptimistic(
    clientRows,
    (_state, newRows: Row[]) => newRows,
  )

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        meta: {
          cell: {
            variant: 'combobox',
            options: CATEGORY_OPTIONS,
          },
        },
        minSize: 180,
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: {
          cell: { variant: 'short-text' },
        },
      },
      {
        id: 'value',
        accessorKey: 'value',
        header: 'Value',
        meta: {
          cell: { variant: 'short-text' },
        },
      },
    ],
    [],
  )

  const onDataChange = useCallback(
    (newData: Row[]) => {
      startTransition(async () => {
        setOptimisticRows(newData)
        const result = await updateRowsOnServer({ data: { rows: newData } })
        setClientRows(result)
      })
    },
    [setOptimisticRows],
  )

  const onRowAdd = useCallback(() => {
    // Client generates TEMP ID (like Convex optimistic update)
    const tempId = `temp_${Date.now()}`
    const optimisticRow: Row = {
      id: tempId,
      category: '',
      name: '',
      value: '',
    }
    const newRows = [...optimisticRows, optimisticRow]

    startTransition(async () => {
      // Optimistic update with temp ID
      setOptimisticRows(newRows)

      // Server call (3s delay) - server will return DIFFERENT ID
      const result = await addRowOnServer({ data: { tempId } })
      // This replaces temp_xxx row with server_xxx row - ID CHANGES!
      setClientRows(result)
    })

    return {
      rowIndex: optimisticRows.length,
      columnId: 'category',
    }
  }, [optimisticRows, setOptimisticRows])

  const onRowsDelete = useCallback(
    (rowsToDelete: Row[]) => {
      const idsToDelete = new Set(rowsToDelete.map((r) => r.id))
      const newRows = optimisticRows.filter((r) => !idsToDelete.has(r.id))

      startTransition(async () => {
        setOptimisticRows(newRows)
        const result = await deleteRowsOnServer({
          data: { ids: rowsToDelete.map((r) => r.id) },
        })
        setClientRows(result)
      })
    },
    [optimisticRows, setOptimisticRows],
  )

  const dataGrid = useDataGrid({
    data: optimisticRows,
    columns,
    onDataChange,
    onRowAdd,
    onRowsDelete,
    getRowId: (row) => row.id,
  })

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>
        Server-Side State DataGrid
      </h1>
      <p style={{ marginBottom: 16, color: '#888', fontSize: 14 }}>
        Uses TanStack server functions. Add row has 3s server delay.
        {isPending && (
          <span style={{ color: '#f59e0b', marginLeft: 8 }}>(syncing...)</span>
        )}
      </p>
      <DataGrid {...dataGrid} height={400} />
    </div>
  )
}
