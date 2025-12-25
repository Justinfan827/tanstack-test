import {
  type UIMessage,
  useSmoothText,
  useUIMessages,
} from '@convex-dev/agent/react'
import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from 'convex/react'
import { Loader2, MessageSquarePlus, Plus, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Streamdown } from 'streamdown'
import { z } from 'zod'
import { SignOutButton } from '@/components/SignOutButton'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { authClient } from '@/lib/auth-client'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import type { ColumnDef } from '@tanstack/react-table'
import { DataGrid } from '@/features/data-grid/components/data-grid'
import { useDataGrid } from '@/features/data-grid/hooks/use-data-grid'

export const Route = createFileRoute('/demo/auth')({
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
  const [threadId, setThreadId] = useState<string | null>(null)

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

type ExerciseRow = {
  _id: Id<'programRows'>
  exerciseName: string
  weight: string
  reps: string
  sets: string
  notes: string
}

function ProgramGrid({ programId }: { programId: Id<'programs'> }) {
  const program = useQuery(api.programs.getProgram, { programId })
  const exercises = useQuery(api.exerciseLibrary.listExercises)

  // Create exercise name map
  const exerciseMap = useMemo(() => {
    if (!exercises) return new Map<Id<'exerciseLibrary'>, string>()
    return new Map(exercises.map((e) => [e._id, e.name]))
  }, [exercises])

  // Transform program data into grid rows for each day
  const daysWithGridData = useMemo(() => {
    if (!program || !exerciseMap.size) return []

    return program.days.map((day) => {
      // Filter to exercise rows only and transform
      const exerciseRows: ExerciseRow[] = day.rows
        .filter((row): row is Extract<typeof row, { kind: 'exercise' }> => row.kind === 'exercise')
        .map((row) => ({
          _id: row._id,
          exerciseName: exerciseMap.get(row.libraryExerciseId) || 'Unknown',
          weight: row.weight,
          reps: row.reps,
          sets: row.sets,
          notes: row.notes,
        }))

      return {
        day,
        rows: exerciseRows,
      }
    })
  }, [program, exerciseMap])

  // Column definitions
  const columns = useMemo<ColumnDef<ExerciseRow>[]>(
    () => [
      {
        id: 'exercise',
        accessorKey: 'exerciseName',
        header: 'Exercise',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        minSize: 180,
      },
      {
        id: 'weight',
        accessorKey: 'weight',
        header: 'Weight',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        minSize: 100,
      },
      {
        id: 'reps',
        accessorKey: 'reps',
        header: 'Reps',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        minSize: 100,
      },
      {
        id: 'sets',
        accessorKey: 'sets',
        header: 'Sets',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
        minSize: 100,
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        header: 'Notes',
        meta: {
          cell: {
            variant: 'long-text',
          },
        },
        minSize: 200,
      },
    ],
    [],
  )


  if (program === undefined || exercises === undefined) {
    return (
      <div className="text-center text-muted-foreground mt-8">
        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
        Loading program...
      </div>
    )
  }

  if (program === null) {
    return (
      <div className="text-center text-muted-foreground mt-8">
        Program not found
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {daysWithGridData.map(({ day, rows }) => (
        <DayGrid
          key={day._id}
          dayId={day._id}
          programId={programId}
          dayLabel={day.dayLabel}
          rows={rows}
          columns={columns}
        />
      ))}
      {daysWithGridData.length === 0 && (
        <div className="text-center text-muted-foreground mt-8">
          No days in this program yet
        </div>
      )}
    </div>
  )
}

function DayGrid({
  dayId,
  programId,
  dayLabel,
  rows,
  columns,
}: {
  dayId: Id<'days'>
  programId: Id<'programs'>
  dayLabel: string
  rows: ExerciseRow[]
  columns: ColumnDef<ExerciseRow>[]
}) {
  const batchUpdateRows = useMutation(
    api.programRows.batchUpdateRows
  ).withOptimisticUpdate((localStore, args) => {
    // Get current program data
    const program = localStore.getQuery(api.programs.getProgram, { programId })
    if (!program) return

    // Build a map of updates by rowId
    const updatesMap = new Map(
      args.updates.map((u) => [u.rowId, u.fields])
    )

    // Create new program with updated rows
    const newProgram = {
      ...program,
      days: program.days.map((day) => {
        if (day._id !== dayId) return day
        return {
          ...day,
          rows: day.rows.map((row) => {
            const update = updatesMap.get(row._id)
            if (!update) return row
            // Merge updates into row (only for exercise rows)
            if (row.kind !== 'exercise') return row
            return {
              ...row,
              ...update, // Apply weight, reps, sets, notes updates
            }
          }),
        }
      }),
    }

    // Set optimistic value
    localStore.setQuery(api.programs.getProgram, { programId }, newProgram)
  })
  const prevDataRef = useRef<Map<Id<'programRows'>, ExerciseRow>>(new Map())

  // Keep prev data in sync with incoming rows
  useEffect(() => {
    const map = new Map<Id<'programRows'>, ExerciseRow>()
    for (const row of rows) {
      map.set(row._id, row)
    }
    prevDataRef.current = map
  }, [rows])

  const handleDataChange = useCallback(
    (newData: ExerciseRow[]) => {
      // We use a ref instead of comparing against `rows` prop because:
      // If the user makes rapid edits before the Convex query refreshes,
      // the ref tracks the "last known local state" rather than the
      // potentially-stale server state. See: https://stack.convex.dev/help-my-app-is-overreacting
      const oldDataMap = prevDataRef.current

      const updates: Array<{
        rowId: Id<'programRows'>
        fields: { weight?: string; reps?: string; sets?: string; notes?: string }
      }> = []

      for (const newRow of newData) {
        const oldRow = oldDataMap.get(newRow._id)
        if (!oldRow) continue

        // Collect all changed fields for this row
        const fields: Record<string, string> = {}
        if (newRow.weight !== oldRow.weight) {
          fields.weight = newRow.weight
        }
        if (newRow.reps !== oldRow.reps) {
          fields.reps = newRow.reps
        }
        if (newRow.sets !== oldRow.sets) {
          fields.sets = newRow.sets
        }
        if (newRow.notes !== oldRow.notes) {
          fields.notes = newRow.notes
        }

        // Only add update if there are changes (exerciseName is read-only, so skip it)
        if (Object.keys(fields).length > 0) {
          updates.push({ rowId: newRow._id, fields })
        }
      }

      // Batch all updates in a single mutation call
      // Optimistic update will immediately update UI via localStore.setQuery
      if (updates.length > 0) {
        console.log("batching updates", JSON.stringify(updates, null, 2))
        batchUpdateRows({ updates })
      }

      // Update prev data after processing changes
      const map = new Map<Id<'programRows'>, ExerciseRow>()
      for (const row of newData) {
        map.set(row._id, row)
      }
      prevDataRef.current = map
    },
    [batchUpdateRows],
  )

  const dataGrid = useDataGrid({
    data: rows,
    columns,
    onDataChange: handleDataChange,
  })

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{dayLabel}</h3>
      <DataGrid {...dataGrid} height={400} />
    </div>
  )
}

function ProgramsSection() {
  const [selectedProgramId, setSelectedProgramId] = useState<Id<'programs'> | null>(null)

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
            programs.map((program) => (
              <button
                type="button"
                key={program._id}
                onClick={() => setSelectedProgramId(program._id)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors truncate ${
                  selectedProgramId === program._id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium truncate">{program.name}</div>
                <div className="text-xs opacity-80">
                  {program.dayCount} {program.dayCount === 1 ? 'day' : 'days'}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function MessageContent({
  text,
  isStreaming,
}: {
  text: string
  isStreaming: boolean
}) {
  const [visibleText] = useSmoothText(text, {
    startStreaming: isStreaming,
  })
  return <Streamdown className="px-4">{visibleText}</Streamdown>
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
          {threads?.map((thread) => (
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

function ChatPanel({
  threadId,
  setThreadId,
}: {
  threadId: string | null
  setThreadId: (id: string | null) => void
}) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const createThread = useMutation(api.chat.createNewThread)
  const sendMessage = useMutation(api.chat.sendMessage)

  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 50, stream: true },
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasStreamingMessage = messages?.some(
    (m: UIMessage) => m.status === 'streaming',
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setIsLoading(true)
    setInput('')

    try {
      let currentThreadId = threadId
      if (!currentThreadId) {
        currentThreadId = await createThread()
        setThreadId(currentThreadId)
      }

      await sendMessage({ threadId: currentThreadId, prompt: text })
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <ScrollArea className="h-[650px] p-4">
        <div className="space-y-4 pb-4">
          {!messages || messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              Ask me anything to get started!
            </div>
          ) : (
            messages.map((message: UIMessage) => (
              <div
                key={message.key}
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary/10 ml-8'
                    : 'bg-secondary/20 mr-8'
                }`}
              >
                <p className="text-sm font-semibold mb-1">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </p>
                <MessageContent
                  text={message.text ?? ''}
                  isStreaming={message.status === 'streaming'}
                />
              </div>
            ))
          )}
          {isLoading && !hasStreamingMessage && (
            <div className="p-3 rounded-lg bg-secondary/20 mr-8">
              <p className="text-sm font-semibold mb-1">AI Assistant</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-4 border-t"
      >
        <Input
          name="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          autoComplete="off"
          autoFocus
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </Button>
      </form>
    </div>
  )
}
