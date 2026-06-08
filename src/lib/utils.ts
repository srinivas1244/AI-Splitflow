import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name?: string | null) {
  if (!name) return 'U'

  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function formatCurrency(
  amount: number,
  currency = 'INR'
) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date) {
  const now = new Date()
  const target = new Date(date)

  const diff =
    now.getTime() - target.getTime()

  const days = Math.floor(
    diff / (1000 * 60 * 60 * 24)
  )

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return formatDate(target)
}

export function generateSplitId() {
  return (
    'SF-' +
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()
  )
}

export function calculatePercentage(
  value: number,
  total: number
) {
  if (!total) return 0

  return Math.round(
    (value / total) * 100
  )
}