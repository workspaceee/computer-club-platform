/**
 * Pure translation core (F2.4) — no React, no context, no side effects.
 *
 * `provider.tsx` is the normal way to read copy. This module exists because the
 * crash screen (F6.5) must render **after** something in the tree has already
 * thrown: at that point `<I18nProvider>` may be the very component that failed,
 * or may sit *below* the boundary (`app/global-error.tsx` replaces the root
 * layout entirely). A fallback that calls `useT()` there would throw inside the
 * error path and hand the guest the white Next.js screen we are trying to avoid.
 *
 * So the lookup semantics live here once and are shared:
 *   - `provider.tsx` builds its context value on top of them;
 *   - `crash-screen.tsx` calls `translate()` directly when there is no context.
 *
 * Anything stateful (device preference, profile language) stays in the provider.
 */
import { en } from '@/lib/i18n/dictionaries/en'
import { lt } from '@/lib/i18n/dictionaries/lt'
import { ru } from '@/lib/i18n/dictionaries/ru'
import {
  DEFAULT_LANG,
  type Dictionary,
  type Lang,
  type TKey,
  type TVars,
} from '@/lib/i18n/types'

export const DICTIONARIES: Record<Lang, Dictionary> = { en, ru, lt }

/** Read `namespace.key` out of a dictionary. */
export function lookup(dict: Dictionary, key: string): string | undefined {
  const [ns, leaf] = key.split('.') as [keyof Dictionary, string]
  const namespace = dict[ns] as Record<string, string> | undefined
  return namespace?.[leaf]
}

/** Fill `{placeholders}`; unknown names are left visible instead of blanked. */
export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/**
 * One-shot translation outside React. Falls back to English, then to the key
 * itself — a missing string must never blank out a screen.
 */
export function translate(lang: Lang, key: TKey, vars?: TVars): string {
  const hit = lookup(DICTIONARIES[lang], key) ?? lookup(en, key)
  return interpolate(hit ?? key, vars)
}

/**
 * The language the current session is running in, mirrored out of the provider.
 *
 * Deliberately in-memory and NOT persisted to localStorage. A club station is a
 * shared machine: whatever the previous guest picked must not greet the next one
 * — the station always boots English (`DEFAULT_LANG`) and returns to English on
 * logout. Persisting the choice is what made a Russian launcher outlive the
 * guest who chose it.
 *
 * The only reader is the crash screen (F6.5), which renders outside the
 * provider and would otherwise have to fall back to English mid-session.
 */
let sessionLang: Lang = DEFAULT_LANG

/** Called by `I18nProvider` whenever the active language changes. */
export function setSessionLang(lang: Lang): void {
  sessionLang = lang
}

/** The active language for non-React callers on the failure path. */
export function readSessionLang(): Lang {
  return sessionLang
}
