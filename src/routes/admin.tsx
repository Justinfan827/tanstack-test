import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { MessageSquarePlus, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { SignOutButton } from '@/components/sign-out-button'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProgramGrid } from '@/features/programstudio/program-grid'
import { authClient } from '@/lib/auth-client'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

const adminSearchSchema = z.object({
  threadId: z.string().optional(),
  programId: z.string().optional(),
})

export const Route = createFileRoute('/admin')({
  validateSearch: adminSearchSchema,
  component: RouteComponent,
})

const loginFormSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

function RouteComponent() {
  const form = useForm({
    validators: {
      onSubmit: loginFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })
      if (error) {
        toast('Failed to sign in', {
          description: (
            <pre>
              {error.code} {error.statusText}
            </pre>
          ),
        })
        return
      }
      toast('You submitted the following values:', {
        description: (
          <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
        position: 'bottom-right',
      })
    },
    defaultValues: {
      email: 'justinfan827@gmail.com',
      password: 'justinfan827@gmail.com',
    },
  })
  return (
    <div className="p-4">
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Login</FieldLegend>
                <FieldDescription>
                  Provide your email and password to login.
                </FieldDescription>
                <FieldGroup>
                  <form.Field
                    name="email"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter your email address"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />
                  <form.Field
                    name="password"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter your password"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />
                </FieldGroup>
              </FieldSet>
              <Field orientation="horizontal">
                <Button type="submit">Login</Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </Unauthenticated>
      <AuthenticatedPage />
      <AuthLoading>Loading...</AuthLoading>
    </div>
  )
}

const AuthenticatedPage = () => {
  const user = useQuery(api.users.getCurrentUser)
  const navigate = useNavigate({ from: '/admin' })
  const threadId = Route.useSearch({
    select: (search) => search.threadId ?? null,
  })

  const setThreadId = (id: string | null) => {
    navigate({
      search: (prev) => ({
        ...prev,
        threadId: id ?? undefined,
      }),
    })
  }

  return (
    <Authenticated>
      <div className="flex flex-col gap-4">
        {/* Chat Section */}
        <div className="flex rounded-lg border">
          {/* Sidebar panel */}
          <div className="w-[25%] flex flex-col p-4 border-r">
            <ThreadSelector threadId={threadId} setThreadId={setThreadId} />
            <div className="mt-auto pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Logged in as: {user?.name || ''}
              </p>
              <SignOutButton>Sign Out</SignOutButton>
            </div>
          </div>

          {/* Chat panel */}
          <div className="w-[75%]">
            <ChatPanel threadId={threadId} setThreadId={setThreadId} />
          </div>
        </div>

        {/* Programs Section */}
        <ProgramsSection />
      </div>
    </Authenticated>
  )
}

function ProgramsSection() {
  const navigate = useNavigate({ from: '/admin' })
  const selectedProgramId = Route.useSearch({
    select: (search) =>
      (search.programId as Id<'programs'> | undefined) ?? null,
  })

  const setSelectedProgramId = (id: Id<'programs'> | null) => {
    navigate({
      search: (prev) => ({
        ...prev,
        programId: id ?? undefined,
      }),
    })
  }

  return (
    <div className="flex rounded-lg border">
      {/* Programs Sidebar */}
      <div className="w-[25%] flex flex-col p-4 border-r">
        <ProgramsSidebar
          selectedProgramId={selectedProgramId}
          setSelectedProgramId={setSelectedProgramId}
        />
      </div>

      {/* Grid Area */}
      <div className="w-[75%] flex flex-col p-4">
        {selectedProgramId ? (
          <ProgramGrid programId={selectedProgramId} />
        ) : (
          <div className="text-center text-muted-foreground mt-8">
            Select a program to view its grid
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramsSidebar({
  selectedProgramId,
  setSelectedProgramId,
}: {
  selectedProgramId: Id<'programs'> | null
  setSelectedProgramId: (id: Id<'programs'> | null) => void
}) {
  const [programName, setProgramName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const programs = useQuery(api.programs.listUserPrograms)
  const createProgram = useMutation(api.programs.createProgram)
  const deleteProgram = useMutation(api.programs.deleteProgram)

  const handleCreate = async () => {
    if (!programName.trim()) {
      toast.error('Program name is required')
      return
    }
    try {
      const programId = await createProgram({ name: programName })
      toast.success(`Created program: ${programId}`)
      setProgramName('')
      setSelectedProgramId(programId)
    } catch (error) {
      toast.error(`Failed to create program: ${error}`)
      console.error('Failed to create program:', error)
    }
  }

  const handleDelete = async (
    e: React.MouseEvent,
    programId: Id<'programs'>,
  ) => {
    e.stopPropagation()
    if (
      !confirm(
        `Are you sure you want to delete "${programs?.find((p) => p._id === programId)?.name}"?`,
      )
    ) {
      return
    }
    try {
      await deleteProgram({ programId })
      toast.success('Program deleted successfully')
      if (selectedProgramId === programId) {
        setSelectedProgramId(null)
      }
    } catch (error) {
      toast.error(`Failed to delete program: ${error}`)
      console.error('Failed to delete program:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Programs</h2>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => inputRef.current?.focus()}
          title="New program"
          className="h-7 w-7"
        >
          <Plus size={16} />
        </Button>
      </div>

      {/* Create Program */}
      <div className="flex gap-2 mb-4">
        <Input
          ref={inputRef}
          placeholder="Program name"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button onClick={handleCreate} size="sm">
          Create
        </Button>
      </div>

      {/* List Programs */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {programs === undefined ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No programs yet</p>
          ) : (
            programs.map(
              (program: {
                _id: Id<'programs'>
                name: string
                dayCount: number
              }) => (
                <div
                  key={program._id}
                  className={`group flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    selectedProgramId === program._id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProgramId(program._id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="font-medium truncate">{program.name}</div>
                    <div className="text-xs opacity-80">
                      {program.dayCount}{' '}
                      {program.dayCount === 1 ? 'day' : 'days'}
                    </div>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDelete(e, program._id)}
                    className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                      selectedProgramId === program._id
                        ? 'hover:bg-primary-foreground/20'
                        : ''
                    }`}
                    title="Delete program"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ),
            )
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function ThreadSelector({
  threadId,
  setThreadId,
}: {
  threadId: string | null
  setThreadId: (id: string | null) => void
}) {
  const threads = useQuery(api.chat.listUserThreads)
  const createThread = useMutation(api.chat.createNewThread)

  const handleNewThread = async () => {
    const newThreadId = await createThread()
    setThreadId(newThreadId)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Threads</h2>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleNewThread}
          title="New thread"
          className="h-7 w-7"
        >
          <MessageSquarePlus size={16} />
        </Button>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="space-y-1 pr-2">
          <button
            type="button"
            onClick={() => setThreadId(null)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
              threadId === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            + New conversation
          </button>
          {threads?.map((thread: { _id: string; title?: string | null }) => (
            <button
              type="button"
              key={thread._id}
              onClick={() => setThreadId(thread._id)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors truncate ${
                threadId === thread._id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {thread.title || `Thread ${thread._id.slice(-6)}`}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
