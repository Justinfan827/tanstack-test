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
import { Loader2, MessageSquarePlus, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
      <div className="flex rounded-lg border">
        {/* Sidebar panel */}
        <div className="w-[25%] flex flex-col p-4 border-r">
          <ThreadSelector threadId={threadId} setThreadId={setThreadId} />
          <div className="my-4 border-t" />
          <ProgramsDebug />
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
    </Authenticated>
  )
}

function ProgramsDebug() {
  const [programName, setProgramName] = useState('')
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
    } catch (error) {
      toast.error(`Failed to create program: ${error}`)
      console.error('Failed to create program:', error)
    }
  }

  return (
    <div className="border rounded-lg p-4 mb-4 bg-muted/20">
      <h2 className="text-lg font-semibold mb-3">Programs Debug</h2>

      {/* Create Program */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Program name"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button onClick={handleCreate}>Create Program</Button>
      </div>

      {/* List Programs */}
      <div>
        <h3 className="text-sm font-medium mb-2">Your Programs ({programs?.length ?? 0})</h3>
        {programs === undefined ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : programs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No programs yet</p>
        ) : (
          <ul className="space-y-1">
            {programs.map((program) => (
              <li key={program._id} className="text-sm p-2 bg-background rounded border">
                <span className="font-medium">{program.name}</span>
                <span className="text-muted-foreground ml-2">({program.dayCount} days)</span>
                <span className="text-muted-foreground text-xs ml-2 font-mono">{program._id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
