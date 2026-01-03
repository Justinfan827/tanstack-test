import type { Id } from '../../../convex/_generated/dataModel'

/**
 * Exercise as returned from Convex queries.
 */
export type Exercise = {
  _id: Id<'exerciseLibrary'>
  _creationTime: number
  name: string
  isGlobal: boolean
  videoUrl?: string
  imageUrl?: string
  notes?: string
}

/**
 * Category with nested values, as returned from Convex.
 */
export type CategoryWithValues = {
  _id: Id<'categories'>
  _creationTime: number
  name: string
  description?: string
  values: Array<{
    _id: Id<'categoryValues'>
    _creationTime: number
    name: string
    description?: string
  }>
}

/**
 * Category assignment for an exercise.
 */
export type ExerciseCategoryAssignment = {
  categoryId: Id<'categories'>
  categoryName: string
  categoryValueId: Id<'categoryValues'>
  categoryValueName: string
}
