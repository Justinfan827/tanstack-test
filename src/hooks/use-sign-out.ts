import { useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

export const useSignOut = () => {
  const [isPending, setIsPending] = useState(false)

  const handleSignOut = async () => {
    setIsPending(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // Reload page on sign out when using expectAuth: true
            location.reload()
          },
        },
      })
    } catch {
      toast.error('Something went wrong. Please try again later.')
    } finally {
      setIsPending(false)
    }
  }

  return {
    signOut: handleSignOut,
    isPending,
  }
}
