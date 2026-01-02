import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2 } from 'lucide-react'
import type { Id } from '@/../../convex/_generated/dataModel'

interface ProgramListItemProps {
  id: Id<'programs'>
  name: string
  dayCount: number
  createdAt: number
  onDelete: () => void
}

export function ProgramListItem({
  name,
  dayCount,
  createdAt,
  onDelete,
}: ProgramListItemProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold">{name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {dayCount} {dayCount === 1 ? 'day' : 'days'} • {date}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 rounded-md hover:bg-muted inline-flex items-center justify-center">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
    </Card>
  )
}
