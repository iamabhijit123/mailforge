import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatPercent(num: number, denom: number): string {
  if (!denom) return '0%'
  return ((num / denom) * 100).toFixed(1) + '%'
}

export function truncate(str: string, len = 60): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '…'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

export function paginate<T>(items: T[], page: number, perPage = 25) {
  const total = items.length
  const pages = Math.ceil(total / perPage)
  const offset = (page - 1) * perPage
  return {
    data: items.slice(offset, offset + perPage),
    total,
    pages,
    page,
    perPage,
  }
}
