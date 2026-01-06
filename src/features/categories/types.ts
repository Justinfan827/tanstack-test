import type { Id } from '../../../convex/_generated/dataModel'

/**
 * UI representation of a category (for form state).
 * Uses string IDs that can be either real Convex IDs or temporary UUIDs for new items.
 */
export type UICategory = {
  id: string
  name: string
  description: string
  values: UICategoryValue[]
}

/**
 * UI representation of a category value (for form state).
 */
export type UICategoryValue = {
  id: string
  name: string
  description: string
}

/**
 * Operations to perform on categories when saving.
 */
export type CategoryOperation =
  | {
      type: 'create'
      tempId: string
      name: string
      description?: string
      values: ValueOperation[]
    }
  | {
      type: 'update'
      id: Id<'categories'>
      name: string
      description?: string
      values: ValueOperation[]
    }
  | {
      type: 'delete'
      id: Id<'categories'>
    }

/**
 * Operations to perform on category values when saving.
 */
export type ValueOperation =
  | {
      type: 'create'
      tempId: string
      name: string
      description?: string
    }
  | {
      type: 'update'
      id: Id<'categoryValues'>
      name: string
      description?: string
    }
  | {
      type: 'delete'
      id: Id<'categoryValues'>
    }

/**
 * Form state for the category manager.
 */
export type CategoryFormState = {
  categories: UICategory[]
}
