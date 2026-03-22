import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { de, enUS } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting
export function formatDate(date: string | Date, locale: string = 'de'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateLocale = locale === 'de' ? de : enUS
  const formatStr = locale === 'de' ? 'dd.MM.yyyy' : 'MM/dd/yyyy'
  return format(d, formatStr, { locale: dateLocale })
}

export function formatDateTime(date: string | Date, locale: string = 'de'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateLocale = locale === 'de' ? de : enUS
  const formatStr = locale === 'de' ? 'dd.MM.yyyy HH:mm' : 'MM/dd/yyyy h:mm a'
  return format(d, formatStr, { locale: dateLocale })
}

export function formatRelative(date: string | Date, locale: string = 'de'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateLocale = locale === 'de' ? de : enUS
  return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale })
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return differenceInDays(d, new Date())
}

// Generate random token
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  // Works in both browser and Node.js (via globalThis.crypto in Node 19+)
  globalThis.crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

// Format file size
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Get greeting based on time
export function getGreeting(locale: string = 'de'): string {
  const hour = new Date().getHours()
  if (locale === 'de') {
    if (hour < 12) return 'Guten Morgen'
    if (hour < 17) return 'Guten Nachmittag'
    return 'Guten Abend'
  } else {
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ── Supabase Image Transform ─────────────────────────────────────────────────
// Converts a Supabase storage URL to an optimized render URL.
// width:   max pixel width (e.g. 400 for thumbnails, 1920 for hero)
// quality: JPEG/WebP quality 1–100 (75 = good balance, 85 = high quality)
// resize:  'contain' keeps aspect ratio | 'cover' crops to fill
export function getSupabaseImageUrl(
  url: string,
  width: number,
  quality = 75,
  resize: 'contain' | 'cover' | 'fill' = 'contain'
): string {
  if (!url) return url
  // Already a render URL or not a Supabase storage URL — return as-is
  if (url.includes('/render/image/') || !url.includes('/storage/v1/object/')) return url
  return (
    url.replace('/storage/v1/object/', '/storage/v1/render/image/') +
    `?width=${width}&quality=${quality}&resize=${resize}`
  )
}

// ── Universal photo URL helper ────────────────────────────────────────────────
// Handles both legacy Supabase Storage URLs and new Cloudflare R2 URLs.
//
// • Supabase URLs  → run through Supabase Image Transform (resize + quality)
// • R2 / r2.dev URLs → returned as-is (R2 CDN serves the original file directly)
//
// Usage:
//   getPhotoUrl(photo.thumbnail_url, 400, 75, 'cover')   // grid thumbnail
//   getPhotoUrl(photo.storage_url,  1600, 85, 'contain') // lightbox
export function getPhotoUrl(
  url: string,
  width: number,
  quality = 75,
  resize: 'contain' | 'cover' | 'fill' = 'contain'
): string {
  if (!url) return url
  // R2 public CDN URL — serve as-is, no server-side transform available
  if (url.includes('r2.dev') || url.includes('cloudflarestorage.com')) return url
  // Legacy Supabase URL — use Image Transform
  return getSupabaseImageUrl(url, width, quality, resize)
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
