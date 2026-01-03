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
import { useFormDebugRegistration } from '@/features/dev-tools/use-form-debug'

// Form validation schema - validates string inputs
const formValidationSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email' }),
    age: z.string().min(1, { message: 'Age is required' }),
    gender: z.enum(['male', 'female'], {
      message: 'Please select a gender',
    }),
    heightUnit: z.enum(['cm', 'in']),
    heightValue: z.string(),
    heightFeet: z.string(),
    heightInches: z.string(),
    weightValue: z.string().min(1, { message: 'Weight is required' }),
    weightUnit: z.enum(['kg', 'lbs']),
  })
  .refine(
    (data) => {
      const age = Number(data.age)
      return !Number.isNaN(age) && age >= 1 && age <= 120
    },
    {
      message: 'Age must be between 1 and 120',
      path: ['age'],
    },
  )
  .refine(
    (data) => {
      const weight = Number(data.weightValue)
      return !Number.isNaN(weight) && weight >= 1 && weight <= 1000
    },
    {
      message: 'Weight must be between 1 and 1000',
      path: ['weightValue'],
    },
  )
  .refine(
    (data) => {
      if (data.heightUnit === 'cm') {
        const height = Number(data.heightValue)
        return (
          data.heightValue !== '' &&
          !Number.isNaN(height) &&
          height > 0 &&
          height <= 300
        )
      }
      const feet = Number(data.heightFeet)
      const inches = Number(data.heightInches)
      return (
        data.heightFeet !== '' &&
        data.heightInches !== '' &&
        !Number.isNaN(feet) &&
        !Number.isNaN(inches) &&
        feet >= 0 &&
        feet <= 8 &&
        inches >= 0 &&
        inches < 12
      )
    },
    {
      message: 'Please enter a valid height',
      path: ['heightValue'],
    },
  )

// Output type for the parent component
export interface ClientFormData {
  name: string
  email: string
  age: number
  gender: 'male' | 'female'
  heightUnit: 'cm' | 'in'
  heightValue?: number
  heightFeet?: number
  heightInches?: number
  weightValue: number
  weightUnit: 'kg' | 'lbs'
}

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
      age: '',
      gender: '',
      heightUnit: 'cm',
      heightValue: '',
      heightFeet: '',
      heightInches: '',
      weightValue: '',
      weightUnit: 'kg',
    },
    validators: {
      onSubmit: formValidationSchema,
    },
    onSubmit: async ({ value }) => {
      // Transform strings to proper types
      const data: ClientFormData = {
        name: value.name,
        email: value.email,
        age: Number(value.age),
        gender: value.gender as 'male' | 'female',
        heightUnit: value.heightUnit as 'cm' | 'in',
        heightValue: value.heightValue ? Number(value.heightValue) : undefined,
        heightFeet: value.heightFeet ? Number(value.heightFeet) : undefined,
        heightInches: value.heightInches
          ? Number(value.heightInches)
          : undefined,
        weightValue: Number(value.weightValue),
        weightUnit: value.weightUnit as 'kg' | 'lbs',
      }
      await onSubmit(data)
    },
  })

  // Register form for dev tools debugging (no-op in production)
  const { saveToHistory } = useFormDebugRegistration(formId, {
    getValues: () => form.state.values,
    prefill: (values) => form.reset(values as typeof form.state.values),
    generateLabel: (v) => v.name || v.email || 'Unnamed',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveToHistory()
    form.handleSubmit()
  }

  return (
    <form id={formId} onSubmit={handleSubmit}>
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
                  aria-invalid={isInvalid}
                />
                <FieldDescription className="sr-only">
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
                  aria-invalid={isInvalid}
                />
                <FieldDescription className="sr-only">
                  Client's email address
                </FieldDescription>
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                <FieldDescription className="sr-only">
                  Client's age in years
                </FieldDescription>
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
                  value={field.state.value || null}
                  onValueChange={(value) => field.handleChange(value ?? '')}
                >
                  <SelectTrigger aria-invalid={isInvalid}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription className="sr-only">
                  Client's gender
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Height Fields - Conditional based on unit */}
        <div className="flex gap-4">
          {form.state.values.heightUnit === 'cm' ? (
            <form.Field name="heightValue">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid} className="flex-1">
                    <FieldLabel htmlFor={field.name}>Height</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
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
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
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
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
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

          <form.Field name="heightUnit">
            {(field) => (
              <Field className="w-24">
                <FieldLabel>Unit</FieldLabel>
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
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="weightUnit">
            {(field) => (
              <Field className="w-24">
                <FieldLabel>Unit</FieldLabel>
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
