import { useMemo } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import type {
  CategoryOperation,
  UICategory,
  ValueOperation,
} from './types'

/**
 * Compute the diff between original and current category state.
 * Returns a list of operations to perform.
 */
export function computeCategoryDiff(
  original: UICategory[],
  current: UICategory[],
): CategoryOperation[] {
  const operations: CategoryOperation[] = []

  // Find deleted categories
  for (const orig of original) {
    const exists = current.some((c) => c.id === orig.id)
    if (!exists) {
      operations.push({
        type: 'delete',
        id: orig.id as Id<'categories'>,
      })
    }
  }

  // Find created and updated categories
  for (const curr of current) {
    const orig = original.find((c) => c.id === curr.id)

    if (!orig) {
      // New category
      operations.push({
        type: 'create',
        tempId: curr.id,
        name: curr.name,
        description: curr.description || undefined,
        values: curr.values.map((v) => ({
          type: 'create' as const,
          tempId: v.id,
          name: v.name,
          description: v.description || undefined,
        })),
      })
    } else {
      // Existing category - check for changes
      const categoryChanged =
        curr.name !== orig.name || curr.description !== orig.description

      const valueOperations = computeValueDiff(orig.values, curr.values)

      if (categoryChanged || valueOperations.length > 0) {
        operations.push({
          type: 'update',
          id: curr.id as Id<'categories'>,
          name: curr.name,
          description: curr.description || undefined,
          values: valueOperations,
        })
      }
    }
  }

  return operations
}

/**
 * Compute the diff between original and current category values.
 */
function computeValueDiff(
  original: UICategory['values'],
  current: UICategory['values'],
): ValueOperation[] {
  const operations: ValueOperation[] = []

  // Find deleted values
  for (const orig of original) {
    const exists = current.some((v) => v.id === orig.id)
    if (!exists) {
      operations.push({
        type: 'delete',
        id: orig.id as Id<'categoryValues'>,
      })
    }
  }

  // Find created and updated values
  for (const curr of current) {
    const orig = original.find((v) => v.id === curr.id)

    if (!orig) {
      // New value
      operations.push({
        type: 'create',
        tempId: curr.id,
        name: curr.name,
        description: curr.description || undefined,
      })
    } else {
      // Existing value - check for changes
      const valueChanged =
        curr.name !== orig.name || curr.description !== orig.description

      if (valueChanged) {
        operations.push({
          type: 'update',
          id: curr.id as Id<'categoryValues'>,
          name: curr.name,
          description: curr.description || undefined,
        })
      }
    }
  }

  return operations
}

/**
 * Hook to compute category diff with memoization.
 */
export function useCategoryDiff(
  original: UICategory[],
  current: UICategory[],
): CategoryOperation[] {
  return useMemo(
    () => computeCategoryDiff(original, current),
    [original, current],
  )
}
