import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouteContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import { ConvexProvider } from 'convex/react'
import type * as React from 'react'
import { DevToolsPanel } from '@/features/dev-tools/dev-tools-panel'
import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth-client'
import { getToken } from '@/lib/auth-server'
import appCss from '../styles.css?url'

/** Routes matching these patterns use public (unauthenticated) Convex client */
const PUBLIC_ROUTE_PATTERNS = ['/links/']

// Get auth information for SSR using available cookies
const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  return await getToken()
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
  publicConvexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  beforeLoad: async (ctx) => {
    // Check if this is a public route (no auth required)
    const isPublicRoute = PUBLIC_ROUTE_PATTERNS.some((pattern) =>
      ctx.location.pathname.startsWith(pattern),
    )

    if (isPublicRoute) {
      return {
        isAuthenticated: false,
        isPublicRoute: true,
        token: null,
      }
    }

    const token = await getAuth()

    // all queries, mutations and actions through TanStack Query will be
    // authenticated during SSR if we have a valid token
    if (token) {
      // During SSR only (the only time serverHttpClient exists),
      // set the auth token to make HTTP queries with.
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    }

    return {
      isAuthenticated: !!token,
      isPublicRoute: false,
      token,
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })

  // Public routes use plain ConvexProvider with public client (no auth waiting)
  if (context.isPublicRoute) {
    return (
      <ConvexProvider client={context.publicConvexQueryClient.convexClient}>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </ConvexProvider>
    )
  }

  // Authenticated routes use ConvexBetterAuthProvider
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ConvexBetterAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-neutral-950 text-neutral-50">
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
            openHotkey: [], // Disable Shift+A hotkey
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
        <Toaster />
        {import.meta.env.DEV && (
          <ClientOnly fallback={null}>
            <DevToolsPanel />
          </ClientOnly>
        )}
      </body>
    </html>
  )
}
