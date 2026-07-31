'use client'

/**
 * One card in the notification centre, and the day grouping above it (C2.5).
 *
 * Split out of `notification-bell.tsx` because the bell owns *when the club is
 * read* — the badge query, the panel query, the dismissable layer — and this file
 * owns *what a message looks like and what it can do*. The two used to be one
 * component; the moment a card grew buttons that write to the server, the read
 * model and the write model stopped fitting in one head.
 *
 * Three decisions:
 *
 *  1. **The row is no longer a button.** In C2.4 the whole row was one — marking
 *     a message read was its only action. A card with "Accept invite" inside it
 *     cannot be: a button inside a button is invalid HTML, and browsers resolve
 *     it by breaking the inner control. So the *card* is a plain element and the
 *     things that write have their own buttons. Read-on-open replaces
 *     read-on-click for actionable cards (see `useMarkVisibleRead` in the bell),
 *     which is also more honest — a message the player has looked at is read.
 *  2. **Grouping is derived from `createdAt`, never stored.** The server sends a
 *     flat newest-first list, exactly as before; "Today" is a fact about the
 *     reader's clock, not about the message, and a day boundary baked into the
 *     payload would be wrong for anyone reading it after midnight.
 *  3. **The answered state comes from the server.** A card renders its buttons
 *     only while `action.outcome === null`; afterwards it prints what was
 *     answered. There is no local "I clicked accept" flag, so closing and
 *     reopening the panel cannot resurrect a question that has been answered.
 */

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n/provider'
import { icons, type LucideIcon } from '@/lib/icons'
import { answerNotification } from '@/lib/mock/api'
import { isApiError } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import type { Notification, NotificationLevel } from '@/lib/types/notification'
import { cn } from '@/lib/utils'

/**
 * Level → the icon and the colour that carry it. A table keyed off the server's
 * closed type, like the HUD's `SOURCE_LABEL`: a new `NotificationLevel` stops the
 * build here instead of rendering an unstyled row nobody notices.
 */
const LEVEL: Record<NotificationLevel, { icon: LucideIcon; tone: string }> = {
  info: { icon: icons.info, tone: 'text-text-medium' },
  success: { icon: icons.success, tone: 'text-success' },
  warning: { icon: icons.warning, tone: 'text-warning' },
  critical: { icon: icons.error, tone: 'text-danger' },
}

/** How many stars a `rate-order` card offers. Five, like every other rating. */
const STARS = [1, 2, 3, 4, 5] as const

/* ------------------------------------------------------------------ *
 * Grouping
 * ------------------------------------------------------------------ */

export interface NotificationDay {
  /** Local calendar day, `YYYY-MM-DD` — the group key, not something displayed. */
  key: string
  /** Midnight of that day, handed to `formatFullDate` for older groups. */
  date: Date
  items: Notification[]
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/**
 * Split a newest-first list into newest-first day groups.
 *
 * Keyed on the *local* calendar day rather than on elapsed hours: a message from
 * 23:50 and one from 00:10 are twenty minutes apart and still belong under two
 * different headings, which is the whole reason a player scans by day.
 */
export function groupByDay(list: readonly Notification[]): NotificationDay[] {
  const groups: NotificationDay[] = []
  for (const item of list) {
    const date = new Date(item.createdAt)
    const key = dayKey(date)
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.items.push(item)
      continue
    }
    groups.push({
      key,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      items: [item],
    })
  }
  return groups
}

/** "Today" / "Yesterday" as words, anything older as a locale-formatted date. */
export function useDayLabel() {
  const { t, formatFullDate } = useT()
  const today = dayKey(new Date())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = dayKey(yesterdayDate)

  return (group: NotificationDay) => {
    if (group.key === today) return t('inbox.today')
    if (group.key === yesterday) return t('inbox.yesterday')
    return formatFullDate(group.date)
  }
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

export function NotificationCard({
  notification,
  onAnswered,
}: {
  notification: Notification
  /** Revalidates the list and the badge — the card holds no server state. */
  onAnswered: () => void
}) {
  const { t, formatTime } = useT()
  const toast = useStore((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const level = LEVEL[notification.level]
  const isUnread = notification.readAt === null
  const action = notification.action

  async function answer(outcome: 'accepted' | 'declined' | 'rated', rating?: number) {
    if (busy) return
    setBusy(true)
    try {
      await answerNotification(notification.id, outcome, rating ?? null)
      toast(
        'success',
        outcome === 'accepted'
          ? t('inbox.joinedToast')
          : outcome === 'declined'
            ? t('inbox.declinedToast')
            : t('inbox.ratedToast'),
      )
    } catch (error) {
      // `conflict` means somebody already answered this card — a panel left open
      // in another window, most likely. That is not a failure to retry, so it
      // gets its own line and the revalidation below shows the real answer.
      toast(
        'error',
        isApiError(error) && error.code === 'conflict'
          ? t('inbox.actionStale')
          : t('inbox.actionFailed'),
      )
    } finally {
      setBusy(false)
      onAnswered()
    }
  }

  return (
    <article
      className={cn(
        'flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
        isUnread ? 'bg-white/[0.04]' : 'opacity-70',
      )}
    >
      <span aria-hidden className={cn('mt-0.5 shrink-0', level.tone)}>
        <level.icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-sm font-bold text-text-high">
            {notification.title}
          </h3>
          {isUnread && (
            // Spoken, not coloured: the dot is `aria-hidden`, so "Unread" is what
            // reaches a reader — the state is never carried by colour alone.
            <>
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="sr-only">{t('inbox.unread')}</span>
            </>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-text-low">{notification.body}</p>
        {/* Time only: the day is already the heading above this card, and
            repeating the date on every row spent a line saying what the group
            just said. */}
        <p className="label-mono mt-1 text-[9px] text-text-low">
          {formatTime(new Date(notification.createdAt))}
        </p>

        {action && action.outcome === null && (
          <div className="mt-2">
            {action.kind === 'party-invite' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  onClick={() => void answer('accepted')}
                >
                  {t('inbox.acceptInvite')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void answer('declined')}
                >
                  {t('inbox.declineInvite')}
                </Button>
              </div>
            ) : (
              <StarRating busy={busy} onRate={(n) => void answer('rated', n)} />
            )}
          </div>
        )}

        {action && action.outcome !== null && (
          // The answer, printed where the buttons were. `role="status"` is
          // deliberately absent: this renders from fresh server data on every
          // open, so announcing it again on reopen would be noise.
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-text-medium">
            <span aria-hidden className={action.outcome === 'declined' ? 'text-text-low' : 'text-success'}>
              <icons.check size={14} />
            </span>
            {action.outcome === 'accepted'
              ? t('inbox.inviteAccepted')
              : action.outcome === 'declined'
                ? t('inbox.inviteDeclined')
                : t('inbox.rated', { n: String(action.rating ?? 0) })}
          </p>
        )}
      </div>
    </article>
  )
}

/**
 * The five stars of a `rate-order` card.
 *
 * A `radiogroup` and not five loose buttons: the five are one answer with five
 * values, so arrow keys move between them and one tab stop covers the set — five
 * separate tab stops inside a popover that already has a list in it is a keyboard
 * trap by volume. Each star's name is the number as words (`{n} stars`), because
 * a row of identical glyphs tells a screen reader nothing about which is which.
 *
 * Hover/focus fills every star up to the pointer, which is the only affordance
 * that says "this is a scale, not five toggles".
 */
function StarRating({ busy, onRate }: { busy: boolean; onRate: (n: number) => void }) {
  const { t, tp } = useT()
  const [preview, setPreview] = useState(0)
  const labelId = useId()

  return (
    <div className="flex flex-col gap-1">
      <p id={labelId} className="text-[10px] font-semibold uppercase tracking-wide text-text-low">
        {t('inbox.rateOrder')}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex items-center gap-0.5"
        onMouseLeave={() => setPreview(0)}
      >
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={false}
            aria-label={tp('inbox.rateStar', n)}
            disabled={busy}
            // `tabIndex` keeps the group to a single stop: the first star is the
            // entry point, the rest are reached with the arrow keys the role
            // already implies.
            tabIndex={n === 1 ? 0 : -1}
            onFocus={() => setPreview(n)}
            onMouseEnter={() => setPreview(n)}
            onKeyDown={(event) => {
              const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
              if (delta === 0) return
              event.preventDefault()
              const next = Math.min(5, Math.max(1, (preview || n) + delta))
              setPreview(next)
              const target = event.currentTarget.parentElement?.children[next - 1]
              if (target instanceof HTMLElement) target.focus()
            }}
            onClick={() => onRate(n)}
            className="rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
          >
            <span aria-hidden className={n <= preview ? 'text-warning' : 'text-text-low'}>
              <icons.rating size={16} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
