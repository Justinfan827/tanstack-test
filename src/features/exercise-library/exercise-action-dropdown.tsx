import { MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Exercise } from './types'

type ExerciseActionDropdownProps = {
  exercise: Exercise
  onDelete: () => void
}

export function ExerciseActionDropdown({
  exercise,
  onDelete,
}: ExerciseActionDropdownProps) {
  const canDelete = !exercise.isGlobal

  // Don't render dropdown if user can't delete (global exercises)
  if (!canDelete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-8" />}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="size-4" />
        <span className="sr-only">Open menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
