import { useQuery } from 'convex/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)

  if (seconds < 60) return 'Now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return `${weeks}w`
}

export function ThreadHistory({
  programId,
  currentThreadId,
  onSelectThread,
}: {
  programId: Id<'programs'>
  currentThreadId: string | null
  onSelectThread: (threadId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const threads = useQuery(api.chat.listProgramThreads, { programId })

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>History</span>
        {threads && threads.length > 0 && (
          <span className="text-muted-foreground/60">({threads.length})</span>
        )}
      </button>
      {isOpen && (
        <ScrollArea className="mt-1 max-h-[100px]">
          <div className="space-y-px">
            {threads === undefined ? (
              <p className="text-muted-foreground/70 text-[10px] px-1">
                Loading...
              </p>
            ) : threads.length === 0 ? (
              <p className="text-muted-foreground/70 text-[10px] px-1">
                No conversations yet
              </p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.threadId}
                  type="button"
                  onClick={() => onSelectThread(thread.threadId)}
                  className={cn(
                    'w-full text-left text-[11px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-1',
                    currentThreadId === thread.threadId
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="truncate flex-1">
                    {thread.title ||
                      new Date(thread._creationTime).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {formatRelativeTime(thread.lastMessageTime)}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
