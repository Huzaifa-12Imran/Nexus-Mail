import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
