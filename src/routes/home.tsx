import { createFileRoute } from '@tanstack/react-router'
import { SignOutButton } from '@/components/sign-out-button'

export const Route = createFileRoute('/home')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Welcome Home</h1>
        <p className="text-muted-foreground mb-8">
          You are successfully logged in.
        </p>
        <SignOutButton>Sign Out</SignOutButton>
      </div>
    </div>
  )
}
