/**
 * i18n contract (F2.1).
 *
 * The English dictionary is the reference shape. `Dictionary` widens its literal
 * values to `string`, so `ru.ts` / `lt.ts` can be typed as `Dictionary` and the
 * compiler enforces **key completeness in every language**: a missing namespace,
 * a missing key or a typo is a build error, never a runtime English fallback.
 */
import { en } from '@/lib/i18n/dictionaries/en'

export type Lang = 'en' | 'ru' | 'lt'

/** Namespaces the product is split into (F2.2). */
export type Namespace = keyof typeof en

/** Same structure as `en`, but values are plain strings. */
export type Dictionary = {
  [N in keyof typeof en]: { [K in keyof (typeof en)[N]]: string }
}

/** Dotted key of every leaf in the dictionary: `'auth.signIn' | 'common.cancel' | ...` */
export type TKey = {
  [N in keyof Dictionary & string]: `${N}.${keyof Dictionary[N] & string}`
}[keyof Dictionary & string]

/** Values allowed in `{placeholder}` interpolation. */
export type TVars = Record<string, string | number>

export interface LangOption {
  code: Lang
  /** Short label for switchers: EN / RU / LT. */
  label: string
  /** Language name in its own language, for settings lists. */
  nativeName: string
  /** BCP-47 locale used by `Intl` for dates, numbers and plural rules. */
  locale: string
}

/** Default language of the shell — English (F2.5). */
export const DEFAULT_LANG: Lang = 'en'

export const LANGS: LangOption[] = [
  { code: 'en', label: 'EN', nativeName: 'English', locale: 'en-GB' },
  { code: 'ru', label: 'RU', nativeName: 'Русский', locale: 'ru-RU' },
  { code: 'lt', label: 'LT', nativeName: 'Lietuvių', locale: 'lt-LT' },
]

export const LOCALES: Record<Lang, string> = {
  en: 'en-GB',
  ru: 'ru-RU',
  lt: 'lt-LT',
}

/**
 * Order of plural forms inside a `|`-separated dictionary string, per language.
 * Matches the CLDR categories `Intl.PluralRules` returns for integers.
 */
export const PLURAL_ORDER: Record<Lang, Intl.LDMLPluralRule[]> = {
  en: ['one', 'other'],
  ru: ['one', 'few', 'many'],
  lt: ['one', 'few', 'other'],
}

export const isLang = (value: unknown): value is Lang =>
  typeof value === 'string' && LANGS.some((l) => l.code === value)
