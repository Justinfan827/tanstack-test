import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { MoreVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewClientButton } from '@/components/new-client-button'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/clients',
)({
  component: ClientsPage,
})

function ClientsPage() {
  const clients = useQuery(api.users.getAllClients)
  const removeClient = useMutation(api.users.removeClient)

  const handleRemoveClient = async (clientId: string) => {
    try {
      await removeClient({ clientId: clientId as any })
      toast.success('Client removed successfully')
    } catch (error) {
      toast.error('Failed to remove client')
    }
  }

  if (clients === undefined) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">Clients</h1>
          <NewClientButton />
        </div>

        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Create your first client to start tracking their fitness journey."
          >
            <NewClientButton />
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              // Use firstName/lastName from enriched data
              const displayName =
                client.firstName && client.lastName
                  ? `${client.firstName} ${client.lastName}`
                  : client.name || 'Unnamed Client'

              // Generate initials
              const initials =
                client.firstName && client.lastName
                  ? `${client.firstName[0]}${client.lastName[0]}`.toUpperCase()
                  : client.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() ||
                    client.email?.[0]?.toUpperCase() ||
                    '?'

              const date = new Date(client._creationTime).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              )

              return (
                <Link
                  key={client._id}
                  to="/home/clients/$clientId"
                  params={{ clientId: client._id }}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar>
                          <AvatarImage src={client.image} alt={displayName} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {displayName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {client.email} • Added {date}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="h-8 w-8 rounded-md hover:bg-muted inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()} // Prevent navigation when clicking menu
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault() // Prevent navigation
                              handleRemoveClient(client._id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
