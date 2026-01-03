import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { MoreVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/programs',
)({
  component: ProgramsPage,
})

function ProgramsPage() {
  const navigate = useNavigate()
  const programs = useQuery(api.programs.listUserPrograms)
  const createProgram = useMutation(api.programs.createProgram)
  const deleteProgram = useMutation(api.programs.deleteProgram)

  const handleCreateProgram = async () => {
    try {
      const programId = await createProgram({ name: 'Untitled Program' })
      navigate({ to: '/home/studio/$programId', params: { programId } })
    } catch (error) {
      toast.error('Failed to create program')
    }
  }

  const handleDeleteProgram = async (programId: Id<'programs'>) => {
    try {
      await deleteProgram({ programId })
      toast.success('Program deleted')
    } catch (error) {
      toast.error('Failed to delete program')
    }
  }

  if (programs === undefined) {
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
          <h1 className="text-4xl font-bold">Programs</h1>
          <Button onClick={handleCreateProgram}>
            <Plus className="mr-2 h-4 w-4" />
            New Program
          </Button>
        </div>

        {programs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No programs yet</EmptyTitle>
              <EmptyDescription>
                Create your first training program to get started.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={handleCreateProgram}>
              <Plus className="mr-2 h-4 w-4" />
              New Program
            </Button>
          </Empty>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => {
              const date = new Date(program._creationTime).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              )

              return (
                <Link
                  key={program._id}
                  to="/home/studio/$programId"
                  params={{ programId: program._id }}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold">
                          {program.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {program.dayCount}{' '}
                          {program.dayCount === 1 ? 'day' : 'days'} • {date}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="h-8 w-8 rounded-md hover:bg-muted inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              handleDeleteProgram(program._id)
                            }}
                            variant="destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
