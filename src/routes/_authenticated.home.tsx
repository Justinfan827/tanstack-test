import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/home')({
  beforeLoad: ({ location }) => {
    // Only redirect if at /home exactly, not child routes
    if (location.pathname === '/home') {
      throw redirect({
        to: '/home/clients',
      })
    }
  },
  component: HomeLayout,
})

function HomeLayout() {
  return <Outlet />
}
