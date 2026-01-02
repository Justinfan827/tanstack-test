import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/programs',
)({
  component: ProgramsPage,
})

function ProgramsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 font-bold text-4xl">Programs</h1>
        <p className="text-muted-foreground">
          Manage your training programs here.
        </p>
        {/* TODO: Implement program management */}

        <div className="mt-8">
          <h2 className="mb-4 font-semibold text-xl">Test Program Studio</h2>
          <Link to="/home/studio/$programId" params={{ programId: 'test-123' }}>
            <Button>Open Test Program in Studio</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
