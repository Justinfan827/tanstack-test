import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // Check if user is authenticated
    if (!context.isAuthenticated) {
      // Redirect to login with the current location as a redirect parameter
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // User is authenticated, continue
    return {}
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
