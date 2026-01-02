import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/home/programs')({
  component: ProgramsPage,
})

function ProgramsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Programs</h1>
        <p className="text-muted-foreground">
          Manage your training programs here.
        </p>
        {/* TODO: Implement program management */}
      </div>
    </div>
  )
}
