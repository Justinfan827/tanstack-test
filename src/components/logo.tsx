import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const logoTextVariants = cva('font-secondary', {
  variants: {
    size: {
      sm: 'text-base font-medium tracking-wide',
      md: 'text-2xl font-semibold',
      lg: 'text-3xl font-semibold',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

type LogoTextProps = {
  className?: string
} & VariantProps<typeof logoTextVariants>

export function LogoText({ className, size }: LogoTextProps) {
  return (
    <span className={cn(logoTextVariants({ size }), className)}>Massor</span>
  )
}
