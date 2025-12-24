import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from 'convex/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { SignOutButton } from '@/components/SignOutButton'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/demo/auth')({
  component: RouteComponent,
})

const loginFormSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

function RouteComponent() {
  const form = useForm({
    validators: {
      onSubmit: loginFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })
      if (error) {
        toast('Failed to sign in', {
          description: (
            <pre>
              {error.code} {error.statusText}
            </pre>
          ),
        })
        return
      }
      toast('You submitted the following values:', {
        description: (
          <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
        position: 'bottom-right',
      })
    },
    defaultValues: {
      email: 'justinfan827@gmail.com',
      password: 'justinfan827@gmail.com',
    },
  })
  return (
    <div className="p-4">
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Login</FieldLegend>
                <FieldDescription>
                  Provide your email and password to login.
                </FieldDescription>
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
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter your email address"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
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
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter your password"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />
                </FieldGroup>
              </FieldSet>
              <Field orientation="horizontal">
                <Button type="submit">Login</Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </Unauthenticated>
      <AuthenticatedPage />
      <AuthLoading>Loading...</AuthLoading>
    </div>
  )
}

const AuthenticatedPage = () => {
  const user = useQuery(api.users.getCurrentUser)
  return (
    <Authenticated>
      <div className="max-w-md mx-auto mt-4 gap-2 flex flex-col">
        <p>Logged in as: {user?.name || ''}</p>
        <SignOutButton>Sign Out</SignOutButton>
      </div>
    </Authenticated>
  )
}
