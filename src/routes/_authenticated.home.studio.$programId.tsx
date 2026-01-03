import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { ProgramGrid } from '@/features/programstudio/program-grid'

export const Route = createFileRoute('/_authenticated/home/studio/$programId')({
  component: StudioPage,
})

function StudioPage() {
  const { programId } = Route.useParams()
  const program = useQuery(api.programs.getProgram, {
    programId: programId as Id<'programs'>,
  })

  return (
    <SidebarProvider
      className="isolate flex flex-col"
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 120)',
          '--header-height': 'calc(var(--spacing) * 16)',
        } as React.CSSProperties
      }
    >
      <StudioHeader programName={program?.name} />
      <div className="@container/main flex flex-1 flex-row-reverse">
        {/* Right sidebar for chat */}
        <Sidebar
          className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
          collapsible="offExamples"
          side="right"
          variant="inset"
        >
          <SidebarContent>
            <PlaceholderChat programId={programId} />
          </SidebarContent>
        </Sidebar>

        {/* Main content area for grid */}
        <SidebarInset className="overflow-auto transition-all duration-300 ease-in-out peer-data-[variant=inset]:peer-data-[state=collapsed]:m-0! peer-data-[variant=inset]:peer-data-[state=expanded]:ml-2! peer-data-[variant=inset]:peer-data-[state=collapsed]:rounded-none!">
          <div className="p-4">
            <ProgramGrid programId={programId as Id<'programs'>} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function StudioHeader({ programName }: { programName?: string }) {
  return (
    <header className="flex h-(--header-height) w-full flex-shrink-0 items-center border-b bg-background px-4">
      <div className="flex w-full items-center gap-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 leading-none text-sm">
          <a
            className="text-muted-foreground hover:text-primary"
            href="/home/programs"
          >
            Programs
          </a>
          <svg
            aria-label="Chevron right"
            className="size-3 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <title>Chevron right</title>
            <path
              d="M9 18l6-6-6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{programName ?? 'Loading...'}</span>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => toast.info('Save functionality not implemented yet')}
            size="sm"
            variant="default"
          >
            Save Program
          </Button>
        </div>
      </div>
    </header>
  )
}

function PlaceholderChat({ programId }: { programId: string }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 text-center">
        <h3 className="font-semibold text-sm">AI Chat</h3>
        <p className="mt-1 text-muted-foreground text-xs">
          Program ID: {programId}
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 p-4">
        <p className="text-muted-foreground text-sm">Chat panel will go here</p>
      </div>
    </div>
  )
}
