import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/home/settings/exercises/library',
)({
  component: ExerciseLibraryPage,
})

function ExerciseLibraryPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Exercise Library</h1>
        <p className="text-muted-foreground">
          Browse and manage your exercise library.
        </p>
        {/* TODO: Implement exercise library */}
      </div>
    </div>
  )
}
