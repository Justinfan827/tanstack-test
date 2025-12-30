import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { DataGrid } from '@/components/data-grid/components/data-grid'
import { useDataGrid } from '@/components/data-grid/hooks/use-data-grid'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export type ExerciseRow = {
  _id: Id<'programRows'>
  clientId: string
  libraryExerciseId?: Id<'exerciseLibrary'>
  weight: string
  reps: string
  sets: string
  effort: string
  rest: string
  notes: string
}

export function ProgramGrid({ programId }: { programId: Id<'programs'> }) {
  const program = useQuery(api.programs.getProgram, { programId })
  const exercises = useQuery(api.exerciseLibrary.listExercises)

  // Transform program data into grid rows for each day
  const daysWithGridData = useMemo(() => {
    if (!program) return []

    return program.days.map((day) => {
      // Filter to exercise rows only and transform
      const exerciseRows: ExerciseRow[] = day.rows
        .filter(
          (row): row is Extract<typeof row, { kind: 'exercise' }> =>
            row.kind === 'exercise',
        )
        .map(
          (row) =>
            ({
              _id: row._id,
              clientId: row.clientId,
              libraryExerciseId: row.libraryExerciseId,
              weight: row.weight,
              reps: row.reps,
              sets: row.sets,
              effort: row.effort ?? '',
              rest: row.rest ?? '',
              notes: row.notes,
            }) satisfies ExerciseRow,
        )

      return {
        day,
        rows: exerciseRows,
      }
    })
  }, [program])

  const options = useMemo(() => {
    return exercises
      ? exercises.map((e) => ({ label: e.name, value: e._id }))
      : []
  }, [exercises])

  // Column definitions
  const columns = useMemo<ColumnDef<ExerciseRow>[]>(
    () => [
      {
        id: 'libraryExerciseId',
        accessorKey: 'libraryExerciseId',
        header: 'Exercise',
        meta: {
          cell: {
            variant: 'combobox',
            options,
          },
        },
        minSize: 240,
        enableResizing: false,
      },
      {
        id: 'weight',
        accessorKey: 'weight',
        header: 'Weight',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        enableResizing: false,
      },
      {
        id: 'reps',
        accessorKey: 'reps',
        header: 'Reps',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        enableResizing: false,
      },
      {
        id: 'sets',
        accessorKey: 'sets',
        header: 'Sets',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        enableResizing: false,
      },
      {
        id: 'effort',
        accessorKey: 'effort',
        header: 'RIR/RPE',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        enableResizing: false,
      },
      {
        id: 'rest',
        accessorKey: 'rest',
        header: 'Rest',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        enableResizing: false,
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        header: 'Notes',
        meta: {
          cell: {
            variant: 'long-text',
          },
        },
        minSize: 200,
        enableResizing: false,
      },
    ],
    [options],
  )

  if (program === undefined || exercises === undefined) {
    return (
      <div className="text-center text-muted-foreground mt-8">
        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
        Loading program...
      </div>
    )
  }

  if (program === null) {
    return (
      <div className="text-center text-muted-foreground mt-8">
        Program not found
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {daysWithGridData.map(({ day, rows }) => (
        <DayGrid
          key={day._id}
          dayId={day._id}
          programId={programId}
          dayLabel={day.dayLabel}
          rows={rows}
          columns={columns}
        />
      ))}
      {daysWithGridData.length === 0 && (
        <div className="text-center text-muted-foreground mt-8">
          No days in this program yet
        </div>
      )}
    </div>
  )
}

function DayGrid({
  dayId,
  programId,
  dayLabel,
  rows,
  columns,
}: {
  dayId: Id<'days'>
  programId: Id<'programs'>
  dayLabel: string
  rows: ExerciseRow[]
  columns: ColumnDef<ExerciseRow>[]
}) {
  const addEmptyRow = useMutation(
    api.programRows.addEmptyExerciseRow,
  ).withOptimisticUpdate((localStore, args) => {
    const program = localStore.getQuery(api.programs.getProgram, { programId })
    if (!program) return

    // Create a temporary ID for the new row
    const tempId = `temp_${Date.now()}` as Id<'programRows'>
    const newRow = {
      _id: tempId,
      _creationTime: Date.now(),
      clientId: args.clientId, // Use the same clientId from mutation args
      kind: 'exercise' as const,
      dayId: args.dayId,
      order: rows.length,
      libraryExerciseId: undefined,
      weight: '',
      reps: '',
      sets: '',
      effort: undefined,
      rest: undefined,
      notes: '',
      groupId: undefined,
    }

    const newProgram = {
      ...program,
      days: program.days.map((day) => {
        if (day._id !== dayId) return day
        return {
          ...day,
          rows: [...day.rows, newRow],
        }
      }),
    }

    localStore.setQuery(api.programs.getProgram, { programId }, newProgram)
  })

  const batchDeleteRows = useMutation(
    api.programRows.batchDeleteRows,
  ).withOptimisticUpdate((localStore, args) => {
    const program = localStore.getQuery(api.programs.getProgram, { programId })
    if (!program) return

    const rowIdsToDelete = new Set(args.rowIds)

    const newProgram = {
      ...program,
      days: program.days.map((day) => {
        if (day._id !== dayId) return day
        return {
          ...day,
          rows: day.rows.filter((row) => !rowIdsToDelete.has(row._id)),
        }
      }),
    }

    localStore.setQuery(api.programs.getProgram, { programId }, newProgram)
  })

  const batchUpdateRows = useMutation(
    api.programRows.batchUpdateRows,
  ).withOptimisticUpdate((localStore, args) => {
    // Get current program data
    const program = localStore.getQuery(api.programs.getProgram, { programId })
    if (!program) return

    // Build a map of updates by rowId
    const updatesMap = new Map(args.updates.map((u) => [u.rowId, u.fields]))

    // Create new program with updated rows
    const newProgram = {
      ...program,
      days: program.days.map((day) => {
        if (day._id !== dayId) return day
        return {
          ...day,
          rows: day.rows.map((row) => {
            const update = updatesMap.get(row._id)
            if (!update) return row
            // Merge updates into row (only for exercise rows)
            if (row.kind !== 'exercise') return row
            return {
              ...row,
              ...update, // Apply weight, reps, sets, notes updates
            }
          }),
        }
      }),
    }

    // Set optimistic value
    localStore.setQuery(api.programs.getProgram, { programId }, newProgram)
  })
  const prevDataRef = useRef<Map<Id<'programRows'>, ExerciseRow>>(new Map())

  // Keep prev data in sync with incoming rows
  useEffect(() => {
    const map = new Map<Id<'programRows'>, ExerciseRow>()
    for (const row of rows) {
      map.set(row._id, row)
    }
    prevDataRef.current = map
  }, [rows])

  const handleDataChange = useCallback(
    (newData: ExerciseRow[]) => {
      // We use a ref instead of comparing against `rows` prop because:
      // If the user makes rapid edits before the Convex query refreshes,
      // the ref tracks the "last known local state" rather than the
      // potentially-stale server state. See: https://stack.convex.dev/help-my-app-is-overreacting
      const oldDataMap = prevDataRef.current

      const updates: Array<{
        rowId: Id<'programRows'>
        fields: {
          libraryExerciseId?: Id<'exerciseLibrary'>
          weight?: string
          reps?: string
          sets?: string
          effort?: string
          rest?: string
          notes?: string
        }
      }> = []

      for (const newRow of newData) {
        const oldRow = oldDataMap.get(newRow._id)
        if (!oldRow) continue

        // Collect all changed fields for this row
        const fields: {
          libraryExerciseId?: Id<'exerciseLibrary'>
          weight?: string
          reps?: string
          sets?: string
          effort?: string
          rest?: string
          notes?: string
        } = {}
        if (newRow.libraryExerciseId !== oldRow.libraryExerciseId) {
          fields.libraryExerciseId = newRow.libraryExerciseId
        }
        if (newRow.weight !== oldRow.weight) {
          fields.weight = newRow.weight
        }
        if (newRow.reps !== oldRow.reps) {
          fields.reps = newRow.reps
        }
        if (newRow.sets !== oldRow.sets) {
          fields.sets = newRow.sets
        }
        if (newRow.effort !== oldRow.effort) {
          fields.effort = newRow.effort
        }
        if (newRow.rest !== oldRow.rest) {
          fields.rest = newRow.rest
        }
        if (newRow.notes !== oldRow.notes) {
          fields.notes = newRow.notes
        }

        // Only add update if there are changes
        if (Object.keys(fields).length > 0) {
          updates.push({ rowId: newRow._id, fields })
        }
      }

      // Batch all updates in a single mutation call
      // Optimistic update will immediately update UI via localStore.setQuery
      if (updates.length > 0) {
        console.log('batching updates', JSON.stringify(updates, null, 2))
        batchUpdateRows({ updates })
      }

      // Update prev data after processing changes
      const map = new Map<Id<'programRows'>, ExerciseRow>()
      for (const row of newData) {
        map.set(row._id, row)
      }
      prevDataRef.current = map
    },
    [batchUpdateRows],
  )

  const onRowAdd = useCallback(() => {
    // Fire-and-forget: don't await so focus happens immediately.
    // Optimistic update shows the row instantly; if mutation fails,
    // Convex rolls back automatically.
    const clientId = crypto.randomUUID()
    addEmptyRow({ clientId, dayId })
    return {
      rowIndex: rows.length,
      columnId: 'libraryExerciseId',
    }
  }, [addEmptyRow, dayId, rows.length])

  const onRowsDelete = useCallback(
    (rowsToDelete: ExerciseRow[]) => {
      // Fire-and-forget: don't await so grid can immediately
      // refocus to adjacent row. Optimistic update removes rows
      // instantly; Convex rolls back if mutation fails.
      const rowIds = rowsToDelete.map((row) => row._id)
      batchDeleteRows({ rowIds })
    },
    [batchDeleteRows],
  )

  const dataGrid = useDataGrid({
    data: rows,
    enableSorting: false,
    enableHiding: true,
    enablePinning: false,
    columns,
    onDataChange: handleDataChange,
    onRowAdd,
    onRowsDelete,
    getRowId: (row) => row.clientId,
  })

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{dayLabel}</h3>
      <DataGrid {...dataGrid} height={400} stretchColumns />
    </div>
  )
}
