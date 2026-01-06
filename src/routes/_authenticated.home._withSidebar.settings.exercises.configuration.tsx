import { useQuery } from 'convex/react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryManager } from '@/features/categories'

export const Route = createFileRoute(
  '/_authenticated/home/_withSidebar/settings/exercises/configuration',
)({
  component: ExerciseConfigurationPage,
})

function ExerciseConfigurationPage() {
  const categories = useQuery(api.categories.getCategoriesWithValues)

  if (categories === undefined) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <CategoryManager initialCategories={categories} />
      </div>
    </div>
  )
}
