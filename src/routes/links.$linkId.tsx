import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '@/../convex/_generated/api'
import { ProgramLinkDisplay } from '@/features/program-links/program-link-display'
import type { Id } from '@/../convex/_generated/dataModel'

export const Route = createFileRoute('/links/$linkId')({
  component: ProgramLinkPage,
  errorComponent: () => <div className="p-8">Link not found or has expired.</div>,
})

function ProgramLinkPage() {
  const { linkId } = Route.useParams()

  const data = useQuery(api.programLinks.getProgramLinkWithDetails, {
    linkId: linkId as Id<'programLinks'>,
  })

  // undefined = loading, null = not found
  if (data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (data === null) {
    return <div className="p-8 text-neutral-400">Link not found.</div>
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <ProgramLinkDisplay link={data} />
    </div>
  )
}
