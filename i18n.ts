import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['de', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'de'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value
  const locale = (locales.includes(localeCookie as Locale) ? localeCookie : defaultLocale) as Locale

  // Use static imports so the bundler can resolve them at build time
  const messages =
    locale === 'en'
      ? (await import('./messages/en.json')).default
      : (await import('./messages/de.json')).default

  return {
    locale,
    messages,
  }
})
