import Fuse, { type IFuseOptions } from 'fuse.js'
import { useMemo, useState } from 'react'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import type { Exercise } from './types'

const FUSE_OPTIONS: IFuseOptions<Exercise> = {
  keys: ['name'],
  threshold: 0.3,
  includeScore: true,
}

const DEBOUNCE_MS = 100

export type UseExerciseSearchResult = {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredExercises: Exercise[]
  isSearching: boolean
}

/**
 * Hook for fuzzy searching exercises using Fuse.js.
 * Debounces the search input and returns filtered results.
 */
export function useExerciseSearch(
  exercises: Exercise[],
): UseExerciseSearchResult {
  const [searchQuery, setSearchQueryImmediate] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the search query
  const debouncedSetQuery = useDebouncedCallback((query: string) => {
    setDebouncedQuery(query)
  }, DEBOUNCE_MS)

  const setSearchQuery = (query: string) => {
    setSearchQueryImmediate(query)
    debouncedSetQuery(query)
  }

  // Create Fuse instance
  const fuse = useMemo(() => new Fuse(exercises, FUSE_OPTIONS), [exercises])

  // Filtered results
  const filteredExercises = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return exercises
    }

    const results = fuse.search(debouncedQuery)
    return results.map((result) => result.item)
  }, [fuse, debouncedQuery, exercises])

  const isSearching = searchQuery !== debouncedQuery

  return {
    searchQuery,
    setSearchQuery,
    filteredExercises,
    isSearching,
  }
}
