import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExerciseActionDropdown } from './exercise-action-dropdown'
import type { Exercise } from './types'

export type ColumnsProps = {
  onDeleteExercise: (exercise: Exercise) => void
}

export function getColumns({
  onDeleteExercise,
}: ColumnsProps): ColumnDef<Exercise>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const exercise = row.original
        return (
          <div className="flex items-center gap-2">
            <span>{exercise.name}</span>
            {!exercise.isGlobal && (
              <Badge variant="outline" className="text-xs">
                Custom
              </Badge>
            )}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const exercise = row.original
        return (
          <div className="text-right">
            <ExerciseActionDropdown
              exercise={exercise}
              onDelete={() => onDeleteExercise(exercise)}
            />
          </div>
        )
      },
    },
  ]
}
