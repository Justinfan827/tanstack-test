import { createFileRoute, redirect } from '@tanstack/react-router'
import { UnauthHeader } from '@/components/header'
import { LoginForm } from '@/components/login-form'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // If user is already authenticated, redirect to home
    if (context.isAuthenticated) {
      throw redirect({
        to: '/home',
      })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="h-dvh">
      <UnauthHeader />
      <div className="my-auto flex h-[calc(100dvh-8rem)] items-center justify-center">
        <LoginForm />
      </div>
    </div>
  )
}
