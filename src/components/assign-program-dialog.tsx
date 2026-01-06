import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface AssignProgramDialogProps {
  clientId: Id<'users'>
  clientName: string
}

export function AssignProgramDialog({
  clientId,
  clientName,
}: AssignProgramDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedProgramId, setSelectedProgramId] =
    useState<Id<'programs'> | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  const programs = useQuery(api.programs.listUserPrograms)
  const assignProgram = useMutation(api.programs.assignProgramToClient)

  const handleAssign = async () => {
    if (!selectedProgramId) return

    setIsAssigning(true)
    try {
      await assignProgram({
        programId: selectedProgramId,
        clientId,
      })
      setOpen(false)
      setSelectedProgramId(null)
    } finally {
      setIsAssigning(false)
    }
  }

  const hasPrograms = programs && programs.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" />
        Assign Program
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Program to {clientName}</DialogTitle>
          <DialogDescription>
            Choose a program template to assign. A copy will be created for{' '}
            {clientName} that you can customize.
          </DialogDescription>
        </DialogHeader>

        {!hasPrograms ? (
          <p className="text-sm text-muted-foreground py-4">
            No programs available. Create a program first.
          </p>
        ) : (
          <Select
            value={selectedProgramId ?? null}
            onValueChange={(value) =>
              setSelectedProgramId(value as Id<'programs'>)
            }
          >
            <SelectTrigger className="w-full">
              {selectedProgramId ? (
                (() => {
                  const selected = programs.find(
                    (p) => p._id === selectedProgramId,
                  )
                  return selected
                    ? `${selected.name} (${selected.dayCount} ${selected.dayCount === 1 ? 'day' : 'days'})`
                    : 'Select a program...'
                })()
              ) : (
                <span className="text-muted-foreground">
                  Select a program...
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program._id} value={program._id}>
                  {program.name} ({program.dayCount}{' '}
                  {program.dayCount === 1 ? 'day' : 'days'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter showCloseButton>
          <Button
            onClick={handleAssign}
            disabled={!selectedProgramId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
