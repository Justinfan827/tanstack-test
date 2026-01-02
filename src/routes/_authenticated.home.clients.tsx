import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/home/clients')({
  component: ClientsPage,
})

function ClientsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Clients</h1>
        <p className="text-muted-foreground">Manage your clients here.</p>
        {/* TODO: Implement client management */}
      </div>
    </div>
  )
}
