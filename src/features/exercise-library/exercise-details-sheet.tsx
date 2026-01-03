import { useForm } from '@tanstack/react-form'
import { useMutation } from 'convex/react'
import { Info } from 'lucide-react'
import { useId, useTransition } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
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
import type { Exercise } from './types'

// Form validation schema
const exerciseFormSchema = z.object({
  name: z.string().min(1, { message: 'Exercise name is required' }),
  videoUrl: z.union([
    z.string().url({ message: 'Please enter a valid URL' }),
    z.literal(''),
  ]),
  notes: z.string(),
})

type ExerciseDetailsSheetProps = {
  exercise: Exercise | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExerciseUpdated: (exercise: Exercise) => void
}

export function ExerciseDetailsSheet({
  exercise,
  open,
  onOpenChange,
  onExerciseUpdated,
}: ExerciseDetailsSheetProps) {
  const formId = useId()
  const [isPending, startTransition] = useTransition()
  const updateExerciseMutation = useMutation(api.exerciseLibrary.updateExercise)

  const isGlobal = exercise?.isGlobal ?? false
  const isEditable = !isGlobal

  const form = useForm({
    defaultValues: {
      name: exercise?.name ?? '',
      videoUrl: exercise?.videoUrl ?? '',
      notes: exercise?.notes ?? '',
    },
    validators: {
      onSubmit: exerciseFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!exercise || isGlobal) return

      startTransition(async () => {
        try {
          await updateExerciseMutation({
            exerciseId: exercise._id,
            name: value.name,
            videoUrl: value.videoUrl || undefined,
            notes: value.notes || undefined,
          })

          // Update local state
          onExerciseUpdated({
            ...exercise,
            name: value.name,
            videoUrl: value.videoUrl || undefined,
            notes: value.notes || undefined,
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

  // Reset form when exercise changes
  if (exercise && form.state.values.name !== exercise.name) {
    form.reset({
      name: exercise.name,
      videoUrl: exercise.videoUrl ?? '',
      notes: exercise.notes ?? '',
    })
  }

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
              {(field) => (
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Exercise name"
                  className="text-lg font-semibold h-auto py-1 px-2 -mx-2 max-w-[calc(100%-2rem)]"
                />
              )}
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
