import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Calendar, MoreHorizontal, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AssignProgramDialog } from './assign-program-dialog'

interface ClientProgramsListProps {
  clientId: Id<'users'>
  clientName: string
}

export function ClientProgramsList({
  clientId,
  clientName,
}: ClientProgramsListProps) {
  const programs = useQuery(api.programs.getClientPrograms, { clientId })
  const deleteProgram = useMutation(api.programs.deleteProgram)

  const handleDelete = async (programId: Id<'programs'>) => {
    await deleteProgram({ programId })
  }

  if (programs === undefined) {
    return (
      <div className="space-y-2">
        <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {programs.length} {programs.length === 1 ? 'program' : 'programs'}
        </h3>
        <AssignProgramDialog clientId={clientId} clientName={clientName} />
      </div>

      {programs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No programs assigned yet. Assign a program to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => (
            <div
              key={program._id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Link
                to="/home/studio/$programId"
                params={{ programId: program._id }}
                className="flex-1 min-w-0"
              >
                <p className="font-medium truncate">{program.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {program.dayCount} {program.dayCount === 1 ? 'day' : 'days'}
                </p>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => handleDelete(program._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
