import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isLive() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.PROD === true
  }
  return process.env.NODE_ENV === 'production'
}
