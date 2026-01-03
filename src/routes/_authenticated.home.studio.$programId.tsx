import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ThreadHistory } from '@/components/chat/ThreadHistory'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { ProgramGrid } from '@/features/programstudio/program-grid'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

const studioSearchSchema = z.object({
  chatId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/home/studio/$programId')({
  validateSearch: studioSearchSchema,
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
            <StudioChatSidebar programId={programId} />
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
            className="text-muted-foreground hover:text-foreground"
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

function StudioChatSidebar({ programId }: { programId: string }) {
  const typedProgramId = programId as Id<'programs'>
  const navigate = useNavigate({ from: Route.fullPath })

  // Get chatId from URL search params - defaults to null (new chat)
  const chatId = Route.useSearch({
    select: (search) => search.chatId ?? null,
  })

  const setThreadId = (id: string | null) => {
    navigate({
      search: (prev) => ({
        ...prev,
        chatId: id ?? undefined,
      }),
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread History */}
      <div className="px-3 py-2">
        <ThreadHistory
          programId={typedProgramId}
          currentThreadId={chatId}
          onSelectThread={setThreadId}
        />
      </div>

      {/* Chat Panel */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          threadId={chatId}
          setThreadId={setThreadId}
          programId={typedProgramId}
        />
      </div>
    </div>
  )
}
