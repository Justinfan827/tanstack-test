import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

// Zod schema for validation
const clientFormSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email' }),
    age: z
      .number()
      .min(1, { message: 'Age must be at least 1' })
      .max(120, { message: 'Age must be at most 120' }),
    gender: z.enum(['male', 'female']),
    heightUnit: z.enum(['cm', 'in']),
    heightValue: z.number().optional(), // for cm
    heightFeet: z.number().optional(), // for in
    heightInches: z.number().optional(), // for in
    weightValue: z
      .number()
      .min(1, { message: 'Weight must be at least 1' })
      .max(1000, { message: 'Weight must be at most 1000' }),
    weightUnit: z.enum(['kg', 'lbs']),
  })
  .refine(
    (data) => {
      // Validate height based on unit
      if (data.heightUnit === 'cm') {
        return (
          data.heightValue !== undefined &&
          data.heightValue > 0 &&
          data.heightValue <= 300
        )
      }
      // For inches, validate feet and inches
      return (
        data.heightFeet !== undefined &&
        data.heightFeet >= 0 &&
        data.heightFeet <= 8 &&
        data.heightInches !== undefined &&
        data.heightInches >= 0 &&
        data.heightInches < 12
      )
    },
    {
      message: 'Please enter a valid height',
      path: ['heightValue'],
    },
  )

export type ClientFormData = z.infer<typeof clientFormSchema>

interface NewClientFormProps {
  onSubmit: (data: ClientFormData) => void | Promise<void>
  formId?: string
}

export function NewClientForm({
  onSubmit,
  formId = 'new-client-form',
}: NewClientFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      age: 25,
      gender: 'male',
      heightUnit: 'cm',
      heightValue: 170,
      heightFeet: 5,
      heightInches: 8,
      weightValue: 70,
      weightUnit: 'kg',
    },
    onSubmit: async ({ value }) => {
      // Manual validation with zod
      const result = clientFormSchema.safeParse(value)
      if (!result.success) {
        console.error('Form validation failed:', result.error)
        return
      }
      await onSubmit(result.data)
    },
  })

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        {/* Name Field */}
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="John Doe"
                />
                <FieldDescription>
                  Client's first and last name
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Email Field */}
        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="john@example.com"
                />
                <FieldDescription>Client's email address</FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Age Field */}
        <form.Field name="age">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Age</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min="1"
                  max="120"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                <FieldDescription>Client's age in years</FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Gender Field */}
        <form.Field name="gender">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel>Gender</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value || 'male')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>Client's gender</FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Height Fields - Conditional based on unit */}
        <div className="flex gap-4">
          <form.Field name="heightUnit">
            {(field) => (
              <Field className="w-32">
                <FieldLabel>Height Unit</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value || 'cm')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="in">ft/in</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>

          {form.state.values.heightUnit === 'cm' ? (
            <form.Field name="heightValue">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid} className="flex-1">
                    <FieldLabel htmlFor={field.name}>Height (cm)</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      placeholder="170"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          ) : (
            <>
              <form.Field name="heightFeet">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid} className="flex-1">
                      <FieldLabel htmlFor={field.name}>Feet</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min="0"
                        max="8"
                        value={field.state.value ?? ''}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        placeholder="5"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="heightInches">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid} className="flex-1">
                      <FieldLabel htmlFor={field.name}>Inches</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min="0"
                        max="11"
                        step="0.1"
                        value={field.state.value ?? ''}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                        placeholder="8"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </form.Field>
            </>
          )}
        </div>

        {/* Weight Fields */}
        <div className="flex gap-4">
          <form.Field name="weightValue">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid} className="flex-1">
                  <FieldLabel htmlFor={field.name}>Weight</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="1"
                    max="1000"
                    step="0.1"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    placeholder="70"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="weightUnit">
            {(field) => (
              <Field className="w-32">
                <FieldLabel>Weight Unit</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value || 'kg')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        </div>
      </FieldGroup>
    </form>
  )
}
