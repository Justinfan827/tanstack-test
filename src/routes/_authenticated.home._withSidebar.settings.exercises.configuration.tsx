import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/settings/exercises/configuration',
)({
  component: ExerciseConfigurationPage,
})

function ExerciseConfigurationPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Exercise Configuration</h1>
        <p className="text-muted-foreground">
          Configure exercise settings and defaults.
        </p>
        {/* TODO: Implement exercise configuration */}
      </div>
    </div>
  )
}
