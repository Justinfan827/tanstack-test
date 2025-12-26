import {
  type UIMessage,
  useSmoothText,
  useUIMessages,
} from '@convex-dev/agent/react'
import { useMutation } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Streamdown } from 'streamdown'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { api } from '../../../convex/_generated/api'
import { Conversation, ConversationContent } from '../Conversation'

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
  return <Streamdown>{visibleText}</Streamdown>
}

export function ChatPanel({
  threadId,
  setThreadId,
}: {
  threadId: string | null
  setThreadId: (id: string | null) => void
}) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createThread = useMutation(api.chat.createNewThread)
  const sendMessage = useMutation(api.chat.sendMessage)

  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 50, stream: true },
  )

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
      <div className=" size-full h-[600px]">
        <div className="flex flex-col h-full">
          <Conversation>
            <ConversationContent>
              <div className="space-y-5 pb-4">
                {!messages || messages.length === 0 ? (
                  <div className="text-center text-muted-foreground mt-8">
                    Ask me anything to get started!
                  </div>
                ) : (
                  messages.map((message: UIMessage) => (
                    <div
                      key={message.key}
                      className={cn(
                        'flex',
                        message.role === 'user' && 'justify-end',
                      )}
                    >
                      <div
                        className={cn(
                          'py-2 px-3 rounded-lg max-w-2/3',
                          message.role === 'user' && 'bg-primary/10',
                        )}
                      >
                        <MessageContent
                          text={message.text ?? ''}
                          isStreaming={message.status === 'streaming'}
                        />
                      </div>
                    </div>
                  ))
                )}
                {isLoading && !hasStreamingMessage && (
                  <p className="text-muted-foreground text-sm flex items-center gap-2 pl-3 animate-pulse">
                    <Loader2 className="size-4 animate-spin" />
                    Thinking...
                  </p>
                )}
              </div>
            </ConversationContent>
          </Conversation>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-4 border-t"
      >
        <Input
          name="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const form = e.currentTarget.form
              if (form) {
                form.requestSubmit()
              }
            }
          }}
          placeholder="Type your message..."
          className="flex-1"
          autoComplete="off"
          autoFocus
          disabled={isLoading}
        />
      </form>
    </div>
  )
}
