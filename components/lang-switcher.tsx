'use client'

import { icons } from '@/lib/icons'
import { useCallback } from 'react'
import { Segmented } from '@/components/ui/segmented'
import { useT } from '@/lib/i18n/provider'
import { translate } from '@/lib/i18n/translate'
import { type Lang, LANGS } from '@/lib/i18n/types'
import { updateLocale } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface LangSwitcherProps {
  /** `compact` = EN/RU/LT pills (lock screen). `rows` = native names (settings). */
  variant?: 'compact' | 'rows'
  /** Show the globe + "Language" caption next to the control. */
  showLabel?: boolean
  /** Announce the save with a toast. Settings does; the lock screen does not. */
  announce?: boolean
  className?: string
}

/**
 * The single language control of the shell (F2.4, F2.5).
 *
 * Both variants go through one `choose`, so switching on the lock screen and
 * switching in Settings are the same action rather than two parallel states.
 * What differs is only who is signed in:
 *
 *   nobody (lock screen) → the pick lasts for this session and nothing is
 *     saved; a shared station must not remember the last walk-in's language.
 *   a member (Settings)  → the pick is written to *their* preferences, so it
 *     comes back on their next sign-in on any station, and the profile in the
 *     store is updated to match so the shell does not re-read a stale value.
 *
 * A failed save never silently reverts the UI: the language already changed, so
 * the toast says the session is fine and only the profile write failed.
 */
export function LangSwitcher({
  variant = 'compact',
  showLabel = false,
  announce = false,
  className,
}: LangSwitcherProps) {
  const { lang, setLang, t } = useT()
  const user = useStore((s) => s.user)
  const setUserLang = useStore((s) => s.setUserLang)
  const toast = useStore((s) => s.toast)

  const choose = useCallback(
    (next: Lang) => {
      if (next === lang) return
      setLang(next)
      // Guests have no profile, so there is nothing to persist to — the switch
      // is honest session state and the hint under the control says so.
      if (!user) return
      setUserLang(next)
      // Translated against `next`, not the hook's `t`: the closure still holds
      // the *previous* language, so using `t` here would confirm a switch to
      // Lietuvių in Russian.
      updateLocale(next)
        .then(() => {
          if (announce) toast('success', translate(next, 'settings.languageSaved'))
        })
        .catch(() => {
          toast('error', translate(next, 'settings.languageSaveFailed'))
        })
    },
    [announce, lang, setLang, setUserLang, toast, user],
  )

  if (variant === 'rows') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {showLabel && (
          <p className="flex items-center gap-1.5 text-sm text-text-high">
            <icons.language size={14} className="text-primary" />
            {t('settings.language')}
          </p>
        )}
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={t('settings.language')}>
          {LANGS.map((l) => {
            const active = l.code === lang
            return (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(l.code)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active
                    ? 'border-primary/50 bg-primary/10 text-text-high'
                    : 'border-border bg-surface text-text-medium hover:text-text-high',
                )}
              >
                <span className="text-sm">{l.nativeName}</span>
                <span
                  className={cn(
                    'label-mono text-[10px]',
                    active ? 'text-primary' : 'text-text-low',
                  )}
                >
                  {l.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* The promise under the control has to match who is signed in: telling a
            walk-in their language is "saved to your profile" would be a lie. */}
        <p className="text-xs leading-relaxed text-text-low">
          {t(user ? 'settings.languageHint' : 'settings.languageHintGuest')}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="hidden items-center gap-1.5 text-text-low sm:flex">
          <icons.language size={13} className="text-primary" />
          <span className="label-mono text-[9px]">{t('common.language')}</span>
        </span>
      )}
      <Segmented<Lang>
        options={LANGS.map((l) => ({ value: l.code, label: l.label }))}
        value={lang}
        onChange={choose}
        variant="pill"
        size="sm"
        round
        fill={false}
        label={t('common.language')}
        className="bg-[#0a0b10]/80 backdrop-blur-xl"
      />
    </div>
  )
}
