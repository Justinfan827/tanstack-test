import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { isLive } from '@/lib/utils'

const loginSchema = z.object({
  email: z.email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100),
})

export function LoginForm() {
  const router = useRouter()

  const form = useForm({
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })

      if (error) {
        toast.error(error.message || 'Sign in failed')
        return
      }

      // Trigger route re-evaluation (beforeLoad will redirect)
      router.invalidate()
    },
    defaultValues: {
      email: isLive() ? '' : 'justinfan827@gmail.com',
      password: isLive() ? '' : 'password123',
    },
  })

  return (
    <div className="w-[400px] space-y-10">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="font-secondary text-3xl">Massor</h1>
        <p className="text-center text-muted-foreground">
          Enter your email below to login to your account
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="email"
            children={(field) => {
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
                    placeholder="name@example.com"
                  />
                  <FieldDescription>Enter your email address</FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <form.Field
            name="password"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="••••••••••"
                  />
                  <FieldDescription>Enter your password</FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

          <Field orientation="horizontal">
            <Button
              className="w-full"
              type="submit"
              disabled={form.state.isSubmitting}
            >
              {form.state.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign in
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
