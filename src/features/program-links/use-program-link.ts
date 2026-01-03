import { useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'

/**
 * Hook to create a public program link for sharing with clients.
 */
export function useProgramLink() {
  return useMutation(api.programLinks.createProgramLink)
}

/**
 * Generate the public link URL for a program link ID.
 */
export function getProgramLinkUrl(linkId: Id<'programLinks'>): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/links/${linkId}`
}
