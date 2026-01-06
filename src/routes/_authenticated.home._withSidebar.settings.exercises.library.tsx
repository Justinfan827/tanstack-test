import { useMutation, useQuery } from 'convex/react'
import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteExerciseDialog } from '@/features/exercise-library/delete-exercise-dialog'
import { ExerciseDetailsSheet } from '@/features/exercise-library/exercise-details-sheet'
import { ExerciseTable } from '@/features/exercise-library/exercise-table'
import type { Exercise } from '@/features/exercise-library/types'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/settings/exercises/library',
)({
  component: ExerciseLibraryPage,
})

function ExerciseLibraryPage() {
  const exercises = useQuery(api.exerciseLibrary.listExercises)
  const categories = useQuery(api.categories.getCategoriesWithValues)
  const deleteExerciseMutation = useMutation(api.exerciseLibrary.deleteExercise)

  // Sheet state - store only the ID, fetch full data in sheet
  const [selectedExerciseId, setSelectedExerciseId] =
    useState<Id<'exerciseLibrary'> | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Delete dialog state
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null,
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  // Local state for optimistic updates
  const [localExercises, setLocalExercises] = useState<Exercise[] | null>(null)

  // Use local state if available, otherwise use query result
  const displayExercises = localExercises ?? exercises ?? []

  const handleViewExercise = useCallback((exercise: Exercise) => {
    setSelectedExerciseId(exercise._id)
    setIsSheetOpen(true)
  }, [])

  const handleDeleteExercise = useCallback((exercise: Exercise) => {
    setExerciseToDelete(exercise)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!exerciseToDelete) return

    startDeleteTransition(async () => {
      try {
        await deleteExerciseMutation({ exerciseId: exerciseToDelete._id })

        // Optimistic update
        setLocalExercises((prev) => {
          const current = prev ?? exercises ?? []
          return current.filter((e) => e._id !== exerciseToDelete._id)
        })

        toast.success('Exercise deleted successfully')
        setIsDeleteDialogOpen(false)
        setExerciseToDelete(null)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete exercise',
        )
      }
    })
  }, [exerciseToDelete, deleteExerciseMutation, exercises])

  const handleExerciseUpdated = useCallback(
    (updatedExercise: Exercise) => {
      setLocalExercises((prev) => {
        const current = prev ?? exercises ?? []
        return current.map((e) =>
          e._id === updatedExercise._id ? updatedExercise : e,
        )
      })
    },
    [exercises],
  )

  // Loading state
  if (exercises === undefined) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <p className="text-muted-foreground">
            Browse and manage your exercise library.
          </p>
        </div>

        <ExerciseTable
          exercises={displayExercises}
          onViewExercise={handleViewExercise}
          onDeleteExercise={handleDeleteExercise}
        />

        <ExerciseDetailsSheet
          exerciseId={selectedExerciseId}
          categories={categories ?? []}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onExerciseUpdated={handleExerciseUpdated}
        />

        <DeleteExerciseDialog
          exercise={exerciseToDelete}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
        />
      </div>
    </div>
  )
}
