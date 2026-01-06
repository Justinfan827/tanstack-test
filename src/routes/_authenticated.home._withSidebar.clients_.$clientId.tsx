import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { User, Scale, Ruler, ChevronRight } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ClientProgramsList } from '@/components/client-programs-list'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/clients_/$clientId',
)({
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { clientId } = Route.useParams()
  const client = useQuery(api.users.getClientById, {
    clientId: clientId as any,
  })

  if (client === undefined) {
    return <ClientDetailSkeleton />
  }

  if (client === null) {
    return <ClientNotFound />
  }

  const displayName =
    client.firstName && client.lastName
      ? `${client.firstName} ${client.lastName}`
      : client.name || 'Unnamed Client'

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/home/clients"
            className="hover:text-foreground transition-colors"
          >
            Clients
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{displayName}</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground mt-1">{client.email}</p>
        </div>

        {/* Basic Info Card */}
        {(client.age ||
          client.gender ||
          client.heightValue ||
          client.weightValue) && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                {client.age && client.gender && (
                  <>
                    <StatItem
                      icon={<User className="h-4 w-4" />}
                      label={client.gender === 'male' ? 'Male' : 'Female'}
                      value={`${client.age} years`}
                    />
                    <Separator orientation="vertical" className="h-12" />
                  </>
                )}

                {client.weightValue && client.weightUnit && (
                  <>
                    <StatItem
                      icon={<Scale className="h-4 w-4" />}
                      label="Weight"
                      value={formatWeight(
                        client.weightValue,
                        client.weightUnit,
                      )}
                    />
                    <Separator orientation="vertical" className="h-12" />
                  </>
                )}

                {client.heightValue && client.heightUnit && (
                  <StatItem
                    icon={<Ruler className="h-4 w-4" />}
                    label="Height"
                    value={formatHeight(client.heightValue, client.heightUnit)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Programs */}
        <Card>
          <CardHeader>
            <CardTitle>Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientProgramsList
              clientId={clientId as Id<'users'>}
              clientName={displayName}
            />
          </CardContent>
        </Card>

        {/* Placeholder: Trainer Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Trainer Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Notes feature coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function formatWeight(value: number, unit: 'kg' | 'lbs') {
  return `${value} ${unit}`
}

function formatHeight(value: number, unit: 'cm' | 'in') {
  if (unit === 'in') {
    const feet = Math.floor(value / 12)
    const inches = (value % 12).toFixed(1)
    return `${feet}' ${inches}"`
  }
  return `${value} cm`
}

function ClientDetailSkeleton() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

function ClientNotFound() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Client not found</h2>
            <p className="text-muted-foreground mb-4">
              This client doesn't exist or you don't have access to view them.
            </p>
            <Link to="/home/clients">
              <Button>Back to Clients</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
