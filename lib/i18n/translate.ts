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
  type Dictionary,
  isLang,
  type Lang,
  LANG_STORAGE_KEY,
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
 * Device-level language choice (F2.5), or `null` when nothing is stored or
 * storage is unavailable (private mode throws on access).
 *
 * Callers must apply this in an effect, never during render: the server has no
 * localStorage and would disagree with the first client paint.
 */
export function readStoredLang(): Lang | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
    return isLang(stored) ? stored : null
  } catch {
    return null
  }
}
