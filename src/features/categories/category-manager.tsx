import { useMutation, useQuery } from 'convex/react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CategoryWithValues } from '@/features/exercise-library/types'
import type { UICategoryValue } from './types'

type CategoryManagerProps = {
  initialCategories: CategoryWithValues[]
}

type UICategory = {
  id: string
  name: string
  description: string
  values: UICategoryValue[]
  isNew?: boolean
}

function toUICategory(cat: CategoryWithValues): UICategory {
  return {
    id: cat._id,
    name: cat.name,
    description: cat.description ?? '',
    values: cat.values.map((v) => ({
      id: v._id,
      name: v.name,
      description: v.description ?? '',
    })),
  }
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  // Subscribe to live query for real-time sync
  const liveCategories = useQuery(api.categories.getCategoriesWithValues)

  // Track unsaved new categories separately
  const [newCategories, setNewCategories] = useState<UICategory[]>([])

  // Derive categories from query, appending any unsaved new ones
  const categories = useMemo(() => {
    const saved = (liveCategories ?? initialCategories).map(toUICategory)
    return [...saved, ...newCategories]
  }, [liveCategories, initialCategories, newCategories])

  // Delete confirmation dialog state
  const [categoryToDelete, setCategoryToDelete] = useState<UICategory | null>(
    null,
  )
  const [isDeleting, startDeleteTransition] = useTransition()

  const deleteCategoryMutation = useMutation(api.categories.deleteCategory)

  // Query for affected exercises when delete dialog is open
  const affectedExercises = useQuery(
    api.categories.getAffectedExercises,
    categoryToDelete && !categoryToDelete.isNew
      ? { categoryId: categoryToDelete.id as Id<'categories'> }
      : 'skip',
  )

  const handleAddCategory = () => {
    const tempId = crypto.randomUUID()
    const newCategory: UICategory = {
      id: tempId,
      name: '',
      description: '',
      values: [],
      isNew: true,
    }
    setNewCategories([...newCategories, newCategory])
  }

  const handleCategorySaved = (_savedCategory: UICategory, tempId?: string) => {
    // Remove from newCategories if it was a new category that got saved
    if (tempId) {
      setNewCategories(newCategories.filter((c) => c.id !== tempId))
    }
    // The live query will automatically pick up the saved category
  }

  const handleCategoryDeleted = (categoryId: string) => {
    // Remove from newCategories if unsaved
    setNewCategories(newCategories.filter((c) => c.id !== categoryId))
    // Saved categories will be removed via the live query update
  }

  const handleRequestDelete = (category: UICategory) => {
    if (category.isNew) {
      // New unsaved category - just remove from state
      handleCategoryDeleted(category.id)
      return
    }
    setCategoryToDelete(category)
  }

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return

    startDeleteTransition(async () => {
      try {
        await deleteCategoryMutation({
          categoryId: categoryToDelete.id as Id<'categories'>,
        })
        handleCategoryDeleted(categoryToDelete.id)
        toast.success('Category deleted successfully')
        setCategoryToDelete(null)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete category',
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Exercise Categories
          </h2>
          <p className="text-muted-foreground">
            Manage your custom exercise categories and their values
          </p>
        </div>
        {categories.length > 0 && (
          <Button onClick={handleAddCategory}>
            <Plus className="size-4" />
            Add Category
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onSaved={handleCategorySaved}
            onRequestDelete={handleRequestDelete}
          />
        ))}

        {categories.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No categories created yet</EmptyTitle>
              <EmptyDescription>
                Add your own custom categories to organize your exercises
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={handleAddCategory}>
              <Plus className="size-4" />
              Add Category
            </Button>
          </Empty>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {affectedExercises && affectedExercises.length > 0 && (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-sm font-medium mb-2">
                This will remove category assignments from{' '}
                {affectedExercises.length} exercise
                {affectedExercises.length === 1 ? '' : 's'}:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {affectedExercises.map((exercise) => (
                  <li key={exercise._id}>• {exercise.name}</li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type CategoryCardProps = {
  category: UICategory
  onSaved: (category: UICategory, tempId?: string) => void
  onRequestDelete: (category: UICategory) => void
}

function CategoryCard({ category, onSaved, onRequestDelete }: CategoryCardProps) {
  const [isEditing, setIsEditing] = useState(category.isNew ?? false)
  const [editState, setEditState] = useState<UICategory>(category)
  const [isPending, startTransition] = useTransition()

  const createCategoryMutation = useMutation(api.categories.createCategory)
  const updateCategoryMutation = useMutation(api.categories.updateCategory)
  const createCategoryValueMutation = useMutation(
    api.categories.createCategoryValue,
  )
  const updateCategoryValueMutation = useMutation(
    api.categories.updateCategoryValue,
  )
  const deleteCategoryValueMutation = useMutation(
    api.categories.deleteCategoryValue,
  )

  const handleEdit = () => {
    setEditState(category)
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (category.isNew) {
      onRequestDelete(category)
    } else {
      setEditState(category)
      setIsEditing(false)
    }
  }

  const handleNameChange = (value: string) => {
    setEditState({ ...editState, name: value })
  }

  const handleDescriptionChange = (value: string) => {
    setEditState({ ...editState, description: value })
  }

  const handleAddValue = () => {
    const tempId = crypto.randomUUID()
    const newValue: UICategoryValue = { id: tempId, name: '', description: '' }
    setEditState({ ...editState, values: [...editState.values, newValue] })
  }

  const handleValueChange = (valueId: string, name: string) => {
    setEditState({
      ...editState,
      values: editState.values.map((v) =>
        v.id === valueId ? { ...v, name } : v,
      ),
    })
  }

  const handleDeleteValue = (valueId: string) => {
    setEditState({
      ...editState,
      values: editState.values.filter((v) => v.id !== valueId),
    })
  }

  const handleSave = () => {
    if (!editState.name.trim()) {
      toast.error('Category name is required')
      return
    }

    startTransition(async () => {
      try {
        if (category.isNew) {
          // Create new category
          const categoryId = await createCategoryMutation({
            name: editState.name,
            description: editState.description || undefined,
          })

          // Create values
          for (const value of editState.values) {
            if (value.name.trim()) {
              await createCategoryValueMutation({
                categoryId,
                name: value.name,
                description: value.description || undefined,
              })
            }
          }

          // Pass temp ID so parent can remove from newCategories
          onSaved({ ...editState, id: categoryId, isNew: false }, category.id)
          toast.success('Category created successfully')
        } else {
          // Update existing category
          await updateCategoryMutation({
            categoryId: category.id as Id<'categories'>,
            name: editState.name,
            description: editState.description || undefined,
          })

          // Handle value changes
          const originalValueIds = new Set(category.values.map((v) => v.id))
          const currentValueIds = new Set(editState.values.map((v) => v.id))

          // Delete removed values
          for (const origValue of category.values) {
            if (!currentValueIds.has(origValue.id)) {
              await deleteCategoryValueMutation({
                categoryValueId: origValue.id as Id<'categoryValues'>,
              })
            }
          }

          // Create or update values
          for (const value of editState.values) {
            if (!value.name.trim()) continue

            if (!originalValueIds.has(value.id)) {
              // New value
              await createCategoryValueMutation({
                categoryId: category.id as Id<'categories'>,
                name: value.name,
                description: value.description || undefined,
              })
            } else {
              // Check if changed
              const origValue = category.values.find((v) => v.id === value.id)
              if (
                origValue &&
                (origValue.name !== value.name ||
                  origValue.description !== value.description)
              ) {
                await updateCategoryValueMutation({
                  categoryValueId: value.id as Id<'categoryValues'>,
                  name: value.name,
                  description: value.description || undefined,
                })
              }
            }
          }

          onSaved(editState)
          toast.success('Category updated successfully')
        }

        setIsEditing(false)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save category',
        )
      }
    })
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`category-${category.id}-name`}>
              Category Name
            </Label>
            <Input
              id={`category-${category.id}-name`}
              value={editState.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Category name"
              className="font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`category-${category.id}-desc`}>
              Description (Optional)
            </Label>
            <Input
              id={`category-${category.id}-desc`}
              value={editState.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div className="space-y-2">
            <Label>Values</Label>
            {editState.values.length === 0 ? (
              <Button variant="ghost" size="sm" onClick={handleAddValue}>
                <Plus className="size-3" />
                Add Value
              </Button>
            ) : (
              <div className="space-y-2">
                {editState.values.map((value) => (
                  <div key={value.id} className="flex items-center gap-2">
                    <Input
                      value={value.name}
                      onChange={(e) => handleValueChange(value.id, e.target.value)}
                      placeholder="Value name"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => handleDeleteValue(value.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={handleAddValue}>
                  <Plus className="size-3" />
                  Add Value
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t pt-4 justify-between">
          {!category.isNew ? (
            <Button
              variant="destructive"
              onClick={() => onRequestDelete(category)}
              disabled={isPending}
            >
              <Trash2 className="size-4" />
              Delete Category
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              <Save className="size-4" />
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{category.name}</CardTitle>
            {category.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {category.description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Edit2 className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Values</h4>
          <div className="flex flex-wrap gap-2">
            {category.values.map((value) => (
              <Badge key={value.id} variant="secondary">
                {value.name}
              </Badge>
            ))}
            {category.values.length === 0 && (
              <p className="text-sm text-muted-foreground">No values yet</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
