'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery } from 'convex/react'
import { DataGrid } from '@/components/data-grid/components/data-grid'
import { useDataGrid } from '@/components/data-grid/hooks/use-data-grid'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export type ExerciseRow = {
  _id: Id<'programRows'>
  exerciseName: string
  weight: string
  reps: string
  sets: string
  notes: string
}

export function ProgramGrid({ programId }: { programId: Id<'programs'> }) {
  const program = useQuery(api.programs.getProgram, { programId })
  const exercises = useQuery(api.exerciseLibrary.listExercises)

  // Create exercise name map
  const exerciseMap = useMemo(() => {
    if (!exercises) return new Map<Id<'exerciseLibrary'>, string>()
    return new Map(exercises.map((e) => [e._id, e.name]))
  }, [exercises])

  // Transform program data into grid rows for each day
  const daysWithGridData = useMemo(() => {
    if (!program || !exerciseMap.size) return []

    return program.days.map((day) => {
      // Filter to exercise rows only and transform
      const exerciseRows: ExerciseRow[] = day.rows
        .filter((row): row is Extract<typeof row, { kind: 'exercise' }> => row.kind === 'exercise')
        .map((row) => ({
          _id: row._id,
          exerciseName: exerciseMap.get(row.libraryExerciseId) || 'Unknown',
          weight: row.weight,
          reps: row.reps,
          sets: row.sets,
          notes: row.notes,
        }))

      return {
        day,
        rows: exerciseRows,
      }
    })
  }, [program, exerciseMap])

  const options = useMemo(() => {
    return exercises
      ? exercises.map((e) => ({ label: e.name, value: e._id }))
      : []
  }, [exercises])

  // Column definitions
  const columns = useMemo<ColumnDef<ExerciseRow>[]>(
    () => [
      {
        id: 'exercise',
        accessorKey: 'libraryExerciseId',
        header: 'Exercise',
        meta: {
          cell: {
            variant: 'combobox',
            options,
          },
        },
        minSize: 180,
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
        minSize: 100,
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
        minSize: 100,
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
        minSize: 100,
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
  const batchUpdateRows = useMutation(
    api.programRows.batchUpdateRows
  ).withOptimisticUpdate((localStore, args) => {
    // Get current program data
    const program = localStore.getQuery(api.programs.getProgram, { programId })
    if (!program) return

    // Build a map of updates by rowId
    const updatesMap = new Map(
      args.updates.map((u) => [u.rowId, u.fields])
    )

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
        fields: { weight?: string; reps?: string; sets?: string; notes?: string }
      }> = []

      for (const newRow of newData) {
        const oldRow = oldDataMap.get(newRow._id)
        if (!oldRow) continue

        // Collect all changed fields for this row
        const fields: Record<string, string> = {}
        if (newRow.weight !== oldRow.weight) {
          fields.weight = newRow.weight
        }
        if (newRow.reps !== oldRow.reps) {
          fields.reps = newRow.reps
        }
        if (newRow.sets !== oldRow.sets) {
          fields.sets = newRow.sets
        }
        if (newRow.notes !== oldRow.notes) {
          fields.notes = newRow.notes
        }

        // Only add update if there are changes (exerciseName is read-only, so skip it)
        if (Object.keys(fields).length > 0) {
          updates.push({ rowId: newRow._id, fields })
        }
      }

      // Batch all updates in a single mutation call
      // Optimistic update will immediately update UI via localStore.setQuery
      if (updates.length > 0) {
        console.log("batching updates", JSON.stringify(updates, null, 2))
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

  const dataGrid = useDataGrid({
    data: rows,
    columns,
    onDataChange: handleDataChange,
  })

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{dayLabel}</h3>
      <DataGrid {...dataGrid} height={400} />
    </div>
  )
}

