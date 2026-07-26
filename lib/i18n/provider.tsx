'use client'

/**
 * i18n runtime (F2.4, F2.5).
 *
 * One React context holds the active language; `useT()` exposes everything a
 * component needs: lookup, `{placeholder}` interpolation, plural forms and
 * locale-aware date/time formatting.
 *
 *   const { t, tp, lang, setLang, formatTime } = useT()
 *   t('auth.signIn')                       // "Sign in"
 *   t('auth.welcomeBackToast', { name })    // "Welcome back, Neo!"
 *   tp('common.minutes', 5)                 // "5 минут" in RU, "5 minutes" in EN
 *
 * Language resolution order (F2.5):
 *   1. language stored on the device (localStorage) — survives reloads;
 *   2. language from the signed-in member profile — wins on login;
 *   3. `DEFAULT_LANG` (English) for a fresh station.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { en } from '@/lib/i18n/dictionaries/en'
import {
  DICTIONARIES,
  interpolate,
  lookup,
  readStoredLang,
} from '@/lib/i18n/translate'
import {
  DEFAULT_LANG,
  isLang,
  type Lang,
  LANG_STORAGE_KEY,
  LOCALES,
  PLURAL_ORDER,
  type TKey,
  type TVars,
} from '@/lib/i18n/types'
import { useStore } from '@/lib/store'

interface I18nValue {
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
  /** Translate a dotted key, optionally interpolating `{placeholders}`. */
  t: (key: TKey, vars?: TVars) => string
  /** Translate a plural key; `{n}` is filled with `count` automatically. */
  tp: (key: TKey, count: number, vars?: TVars) => string
  /** Locale-aware date, e.g. "Sunday, 26 July". */
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
  /** 24-hour clock, e.g. "21:04". */
  formatTime: (date: Date) => string
  formatDateTime: (date: Date) => string
  /** Long weekday + month + day, used by the lock screen clock. */
  formatFullDate: (date: Date) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render always agree on DEFAULT_LANG; the stored
  // preference is applied after hydration to avoid a markup mismatch.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const user = useStore((s) => s.user)
  const appliedProfileFor = useRef<string | null>(null)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      // Private mode / disabled storage: language still applies for this session.
    }
  }, [])

  // 1. device preference — applied after hydration, never during render.
  useEffect(() => {
    const stored = readStoredLang()
    if (stored) setLangState(stored)
  }, [])

  // 2. member profile language wins right after sign-in
  useEffect(() => {
    if (!user) {
      appliedProfileFor.current = null
      return
    }
    if (appliedProfileFor.current === user.email) return
    appliedProfileFor.current = user.email
    if (isLang(user.lang)) setLang(user.lang)
  }, [user, setLang])

  // Keep <html lang> in sync for screen readers and hyphenation.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nValue>(() => {
    const dict = DICTIONARIES[lang]
    const locale = LOCALES[lang]
    const pluralRules = new Intl.PluralRules(locale)

    const resolve = (key: TKey): string => {
      const hit = lookup(dict, key) ?? lookup(en, key)
      if (hit === undefined && process.env.NODE_ENV !== 'production') {
        console.log('[v0] i18n: missing key', key, 'for lang', lang)
      }
      return hit ?? key
    }

    const t: I18nValue['t'] = (key, vars) => interpolate(resolve(key), vars)

    const tp: I18nValue['tp'] = (key, count, vars) => {
      const forms = resolve(key).split('|')
      const order = PLURAL_ORDER[lang]
      const category = pluralRules.select(count)
      const index = order.indexOf(category)
      const form = forms[index >= 0 ? index : forms.length - 1] ?? forms[0]
      return interpolate(form, { n: count, ...vars })
    }

    return {
      lang,
      locale,
      setLang,
      t,
      tp,
      formatDate: (date, options) => new Intl.DateTimeFormat(locale, options).format(date),
      formatTime: (date) =>
        new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date),
      formatDateTime: (date) =>
        new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date),
      formatFullDate: (date) =>
        new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(date),
      formatNumber: (n, options) => new Intl.NumberFormat(locale, options).format(n),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Access translations. Throws when used outside `I18nProvider` — a wiring bug. */
export function useT(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT() must be used inside <I18nProvider>')
  return ctx
}

/**
 * Same context, but `null` instead of a throw when the provider is missing.
 *
 * Only for code that runs on the failure path, where throwing would replace one
 * crash with another: the crash screen (F6.5) renders both inside the shell
 * (context available) and from `app/global-error.tsx`, which discards the root
 * layout — and therefore the provider — entirely. Product code must keep using
 * `useT()` so a missing provider stays a loud wiring bug.
 */
export function useMaybeT(): I18nValue | null {
  return useContext(I18nContext)
}
