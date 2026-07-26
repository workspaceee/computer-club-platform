'use client'

import { Globe } from 'lucide-react'
import { Segmented } from '@/components/ui/segmented'
import { useT } from '@/lib/i18n/provider'
import { type Lang, LANGS } from '@/lib/i18n/types'
import { cn } from '@/lib/utils'

interface LangSwitcherProps {
  /** `compact` = EN/RU/LT pills (lock screen). `rows` = native names (settings). */
  variant?: 'compact' | 'rows'
  /** Show the globe + "Language" caption next to the control. */
  showLabel?: boolean
  className?: string
}

/**
 * The single language control of the shell (F2.4).
 *
 * Both variants write through `useT().setLang`, which persists the choice on the
 * device — so switching on the lock screen and switching in Settings are the
 * same action, not two parallel states.
 */
export function LangSwitcher({
  variant = 'compact',
  showLabel = false,
  className,
}: LangSwitcherProps) {
  const { lang, setLang, t } = useT()

  if (variant === 'rows') {
    return (
      <div className={cn('flex flex-col gap-1.5', className)} role="radiogroup" aria-label={t('settings.language')}>
        {LANGS.map((l) => {
          const active = l.code === lang
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLang(l.code)}
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
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="hidden items-center gap-1.5 text-text-low sm:flex">
          <Globe size={13} className="text-primary" />
          <span className="label-mono text-[9px]">{t('common.language')}</span>
        </span>
      )}
      <Segmented<Lang>
        options={LANGS.map((l) => ({ value: l.code, label: l.label }))}
        value={lang}
        onChange={setLang}
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
