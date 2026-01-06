import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from 'convex/react'
import { Info } from 'lucide-react'
import { useEffect, useId, useTransition } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/ui/youtube-embed'
import type { CategoryWithValues, Exercise } from './types'

// Form validation schema
const exerciseFormSchema = z.object({
  name: z.string().min(1, { message: 'Exercise name is required' }),
  videoUrl: z.union([
    z.string().url({ message: 'Please enter a valid URL' }),
    z.literal(''),
  ]),
  notes: z.string(),
  categoryAssignments: z.record(z.string(), z.array(z.string())),
})

type ExerciseDetailsSheetProps = {
  exerciseId: Id<'exerciseLibrary'> | null
  categories: CategoryWithValues[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onExerciseUpdated: (exercise: Exercise) => void
}

/**
 * Parse existing category assignments from exercise data.
 */
function parseExistingAssignments(
  exercise: Exercise | null | undefined,
  categories: CategoryWithValues[],
): Record<string, string[]> {
  const assignments: Record<string, string[]> = {}

  // Initialize all categories with empty arrays
  for (const category of categories) {
    assignments[category._id] = []
  }

  // Populate from exercise's existing assignments
  if (exercise?.categoryAssignments) {
    for (const assignment of exercise.categoryAssignments) {
      if (assignments[assignment.categoryId]) {
        assignments[assignment.categoryId].push(assignment.categoryValueId)
      }
    }
  }

  return assignments
}

export function ExerciseDetailsSheet({
  exerciseId,
  categories,
  open,
  onOpenChange,
  onExerciseUpdated,
}: ExerciseDetailsSheetProps) {
  const formId = useId()
  const [isPending, startTransition] = useTransition()
  const updateExerciseMutation = useMutation(api.exerciseLibrary.updateExercise)

  // Fetch exercise with category assignments
  const exercise = useQuery(
    api.exerciseLibrary.getExercise,
    exerciseId ? { exerciseId } : 'skip',
  )

  const isGlobal = exercise?.isGlobal ?? false
  const isEditable = !isGlobal

  const form = useForm({
    defaultValues: {
      name: exercise?.name ?? '',
      videoUrl: exercise?.videoUrl ?? '',
      notes: exercise?.notes ?? '',
      categoryAssignments: parseExistingAssignments(exercise, categories),
    },
    validators: {
      onSubmit: exerciseFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!exercise || isGlobal) return

      startTransition(async () => {
        try {
          // Flatten category value IDs
          const categoryValueIds: Id<'categoryValues'>[] = []
          for (const valueIds of Object.values(value.categoryAssignments)) {
            for (const valueId of valueIds) {
              categoryValueIds.push(valueId as Id<'categoryValues'>)
            }
          }

          await updateExerciseMutation({
            exerciseId: exercise._id,
            name: value.name,
            videoUrl: value.videoUrl || undefined,
            notes: value.notes || undefined,
            categoryValueIds,
          })

          // Build updated category assignments for local state
          const updatedAssignments = categoryValueIds.map((valueId) => {
            const category = categories.find((c) =>
              c.values.some((v) => v._id === valueId),
            )
            const categoryValue = category?.values.find(
              (v) => v._id === valueId,
            )
            return {
              categoryId: category?._id ?? ('' as Id<'categories'>),
              categoryName: category?.name ?? '',
              categoryValueId: valueId,
              categoryValueName: categoryValue?.name ?? '',
            }
          })

          // Update local state
          onExerciseUpdated({
            ...exercise,
            name: value.name,
            videoUrl: value.videoUrl || undefined,
            notes: value.notes || undefined,
            categoryAssignments: updatedAssignments,
          })

          toast.success('Exercise updated successfully')
          onOpenChange(false)
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to update exercise',
          )
        }
      })
    },
  })

  // Reset form when exercise data loads or changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when exercise data is available
  useEffect(() => {
    if (exercise) {
      form.reset({
        name: exercise.name,
        videoUrl: exercise.videoUrl ?? '',
        notes: exercise.notes ?? '',
        categoryAssignments: parseExistingAssignments(exercise, categories),
      })
    }
  }, [exercise])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.handleSubmit()
  }

  const videoUrl = form.state.values.videoUrl
  const showVideoPreview = videoUrl && isValidYouTubeUrl(videoUrl)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex min-w-[400px] flex-col gap-0 sm:min-w-[450px]">
        <SheetHeader className="shrink-0 gap-2">
          {isEditable ? (
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid} className="gap-1">
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Exercise name"
                      className="text-lg font-semibold h-auto py-1 px-2 -mx-2 max-w-[calc(100%-2rem)]"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          ) : (
            <SheetTitle>{exercise?.name}</SheetTitle>
          )}
          {isGlobal && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="size-4 shrink-0" />
              <SheetDescription className="m-0">
                This is a global exercise and cannot be edited.
              </SheetDescription>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isEditable ? (
            <form id={formId} onSubmit={handleSubmit}>
              <FieldGroup>
                {/* Video URL Field */}
                <form.Field name="videoUrl">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Video URL</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="url"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                {/* YouTube Preview */}
                {showVideoPreview && (
                  <YouTubeEmbed
                    url={videoUrl}
                    title={form.state.values.name}
                    className="max-w-sm"
                  />
                )}

                {/* Notes Field */}
                <form.Field name="notes">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                        <Textarea
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Add instructions, tips, or notes..."
                          rows={4}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>

                {/* Category Assignments */}
                {categories.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium">Categories</h3>
                    <form.Field name="categoryAssignments">
                      {(field) =>
                        categories.map((category) => (
                          <CategoryMultiSelect
                            key={category._id}
                            category={category}
                            selectedValues={
                              field.state.value[category._id] ?? []
                            }
                            onSelectionChange={(valueIds) =>
                              field.handleChange({
                                ...field.state.value,
                                [category._id]: valueIds,
                              })
                            }
                          />
                        ))
                      }
                    </form.Field>
                  </div>
                )}
              </FieldGroup>
            </form>
          ) : (
            // Read-only view for global exercises
            <div className="space-y-4">
              {exercise?.videoUrl && isValidYouTubeUrl(exercise.videoUrl) && (
                <div>
                  <p className="mb-2 text-sm font-medium">Video</p>
                  <YouTubeEmbed
                    url={exercise.videoUrl}
                    title={exercise.name}
                    className="max-w-sm"
                  />
                </div>
              )}
              {exercise?.notes && (
                <div>
                  <p className="mb-2 text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {exercise.notes}
                  </p>
                </div>
              )}
              {!exercise?.videoUrl && !exercise?.notes && (
                <p className="text-sm text-muted-foreground">
                  No additional details for this exercise.
                </p>
              )}
            </div>
          )}
        </div>

        {isEditable && (
          <SheetFooter className="shrink-0 gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

type CategoryMultiSelectProps = {
  category: CategoryWithValues
  selectedValues: string[]
  onSelectionChange: (valueIds: string[]) => void
}

function CategoryMultiSelect({
  category,
  selectedValues,
  onSelectionChange,
}: CategoryMultiSelectProps) {
  const anchor = useComboboxAnchor()

  // Use string IDs as items (simpler pattern that works with multiple)
  const items = category.values.map((v) => v._id as string)
  const getValueName = (id: string) =>
    category.values.find((v) => v._id === id)?.name ?? id

  return (
    <div className="space-y-2">
      <FieldLabel>{category.name}</FieldLabel>
      {category.description && (
        <p className="text-xs text-muted-foreground">{category.description}</p>
      )}

      <Combobox
        multiple
        autoHighlight
        items={items}
        value={selectedValues}
        onValueChange={onSelectionChange}
        itemToStringLabel={getValueName}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values: string[]) => (
              <>
                {values.map((valueId) => (
                  <ComboboxChip key={valueId}>
                    {getValueName(valueId)}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={
                    selectedValues.length === 0
                      ? `Select ${category.name.toLowerCase()}...`
                      : ''
                  }
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No values found.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {getValueName(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
