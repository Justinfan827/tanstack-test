import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Plus, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  NewClientForm,
  type ClientFormData,
} from '@/components/new-client-form'
import { api } from '../../convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'

export function NewClientButton() {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const createClient = useMutation(api.users.createClient)

  const handleSubmit = async (data: ClientFormData) => {
    setIsCreating(true)
    try {
      // Convert height to single value
      const heightValue =
        data.heightUnit === 'cm'
          ? data.heightValue!
          : data.heightFeet! * 12 + data.heightInches!

      // Create client
      const result = await createClient({
        name: data.name,
        email: data.email,
        age: data.age,
        gender: data.gender,
        heightValue,
        heightUnit: data.heightUnit,
        weightValue: data.weightValue,
        weightUnit: data.weightUnit,
      })

      // Show temporary password to trainer
      setTempPassword(result.temporaryPassword)
      toast.success('Client created successfully')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create client',
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyPassword = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword)
      setPasswordCopied(true)
      toast.success('Password copied to clipboard')
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset state after dialog close animation
    setTimeout(() => {
      setTempPassword(null)
      setPasswordCopied(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>
                Add a new client to your roster. They'll receive login
                credentials to access their program.
              </DialogDescription>
            </DialogHeader>

            <NewClientForm onSubmit={handleSubmit} formId="new-client-form" />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="new-client-form"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Client Created Successfully!</DialogTitle>
              <DialogDescription>
                Share this temporary password with your client. They should
                change it after first login.
              </DialogDescription>
            </DialogHeader>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Temporary Password:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted px-4 py-3 rounded-md font-mono text-lg">
                        {tempPassword}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyPassword}
                      >
                        {passwordCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Make sure to save this password - it won't be shown again.
                  </p>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
