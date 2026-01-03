import { useEffect } from 'react'
import {
  registerForm,
  unregisterForm,
  saveToHistory,
} from '@/features/dev-tools/store'

type FormDebugOptions<T> = {
  getValues: () => T
  prefill: (values: T) => void
  generateLabel?: (values: T) => string
}

type FormDebugReturn = {
  saveToHistory: () => void
}

function useFormDebugRegistrationImpl<T>(
  formId: string,
  options: FormDebugOptions<T>,
): FormDebugReturn {
  useEffect(() => {
    registerForm(formId, {
      getValues: options.getValues,
      prefill: options.prefill as (values: unknown) => void,
      generateLabel: options.generateLabel as
        | ((values: unknown) => string)
        | undefined,
    })
    return () => unregisterForm(formId)
  }, [formId, options.getValues, options.prefill, options.generateLabel])

  return {
    saveToHistory: () => saveToHistory(formId),
  }
}

function useFormDebugRegistrationNoop<T>(
  _formId: string,
  _options: FormDebugOptions<T>,
): FormDebugReturn {
  return {
    saveToHistory: () => {},
  }
}

// Export the appropriate implementation based on environment
// In production, the no-op version will be tree-shaken
export const useFormDebugRegistration = import.meta.env.DEV
  ? useFormDebugRegistrationImpl
  : useFormDebugRegistrationNoop
