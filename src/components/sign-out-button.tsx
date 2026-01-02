import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

function SignOutButton({
  className,
  type,
  ...props
}: React.ComponentProps<'button'>) {
  const handleSignOut = async () => {
    const { error } = await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          location.reload()
        },
      },
    })
    if (error) {
      toast.error('Error', {
        description: `${error.statusText} ${error.message}`,
      })
      return
    }
    toast.success('Logged out successfully!')
  }
  return <Button onClick={handleSignOut} {...props} />
}

export { SignOutButton }
