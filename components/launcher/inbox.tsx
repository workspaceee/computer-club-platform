'use client'

/**
 * The bell in the top bar and the panel behind it (C2.4).
 *
 * What the club says to the player: a time warning, an order that is ready, a
 * tournament check-in, the happy hour. Separate from `help` on purpose — that is
 * the other direction of the same conversation (the player asking the club), and
 * it is a section with its own route rather than a popover in the chrome.
 *
 * Three decisions shape the file:
 *
 *  1. **The count is fetched, the list is not — until it is asked for.** The
 *     badge is the only part of the inbox that has to be true while the panel is
 *     shut, so `support/unread` is the one live key and `support/inbox` is keyed
 *     `null` until the popover opens. A station idling on the launcher all
 *     evening is not holding a list nobody is looking at, and a stale copy of the
 *     queue cannot outlive the popover that showed it (that is also why the UI
 *     slice keeps only the boolean).
 *  2. **Realtime arrives through the keys.** `useRealtimeRevalidation` already
 *     invalidates every `support/…` key on `message.received` and `broadcast`
 *     (`EVENT_INVALIDATES`), so a pushed message moves the badge without this
 *     component subscribing to anything by hand.
 *  3. **The count belongs in the accessible name.** A coloured chip on a bell is
 *     decoration by definition, so "3" reaches a screen reader through the
 *     trigger's own label (`inbox.openUnread`) or not at all.
 *
 * Grouping by day and per-card actions are C2.5. What is here is the list, the
 * unread mark and the one action that clears the badge.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useId, useState } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { DataBoundary } from '@/components/data-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import type { LauncherSurface } from '@/lib/launcher-nav'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  toApiError,
} from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import { formatDateTime } from '@/lib/time'
import type { Notification, NotificationLevel } from '@/lib/types/notification'
import { cn } from '@/lib/utils'

/**
 * Level → the glyph and the tone that already mean that in this product.
 *
 * A table keyed off the closed server type, so adding a `NotificationLevel`
 * stops the build here instead of rendering a card with no icon. `critical` takes
 * the danger tone rather than a fifth colour: the toaster's four tones are the
 * product's whole vocabulary for "how bad is this" (§1.3).
 */
const LEVEL: Record<NotificationLevel, { icon: keyof typeof icons; tone: string }> = {
  info: { icon: 'info', tone: 'text-info' },
  success: { icon: 'success', tone: 'text-success' },
  warning: { icon: 'warning', tone: 'text-warning' },
  critical: { icon: 'error', tone: 'text-danger' },
}

/** Two digits fit the chip; past that the badge says "9+" and the name says the number. */
const BADGE_MAX = 9

export function InboxBell({ surface }: { surface: LauncherSurface }) {
  const { t, tp } = useT()

  const open = useStore((s) => s.notificationsOpen)
  const setOpen = useStore((s) => s.setNotificationsOpen)
  const guest = useStore((s) => s.guest)
  const toast = useStore((s) => s.toast)

  const panelId = useId()
  const [marking, setMarking] = useState(false)

  /**
   * Who the inbox is addressed to.
   *
   * A walk-in has no member row, so passing the *default* id would show them the
   * last signed-in member's private messages — targeting is the one thing this
   * panel must not get wrong. A guest id matches no `target: 'user'` row, which
   * leaves exactly what is true for them: this seat, its zone, and broadcasts.
   */
  const audience = surface === 'guest' ? (guest?.guestId ?? 'guest') : undefined

  // The audience rides *in* the key, so a member signing in after a walk-in reads
  // their own inbox rather than the cached one. `?? 'member'` because `undefined`
  // inside an array key is not a value SWR can tell apart from a missing segment.
  const scope = audience ?? 'member'

  // The badge is chrome: it has to be true while the panel is shut, so this key
  // is live for the whole visit. `support/…` is the prefix realtime invalidates.
  const unread = useApi(['support/unread', scope], () => fetchUnreadCount(audience))

  // `null` while closed — opening the panel is what asks the club.
  const inbox = useApi(open ? ['support/inbox', scope] : null, () => fetchNotifications(audience))

  const count = unread.data ?? 0

  const layerRef = useDismissableLayer({
    open,
    onClose: () => setOpen(false),
    closeOnOutside: true,
    // Not a modal: the seat's clock and the lock button stay reachable behind an
    // open inbox, so nothing is trapped and nothing is locked. Tab leaving the
    // panel closes it through `closeOnOutside`, so focus never lands behind it.
    trapFocus: false,
    autoFocus: false,
    lockScroll: false,
  })

  // The panel is the layer *including* the trigger (same reason as the avatar
  // menu): if "outside" covered the bell, a pointer-down there would close the
  // panel and the click that follows would reopen it — the bell would never
  // toggle off.
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (open) panelEl?.focus({ preventScroll: true })
  }, [open, panelEl])

  const markAll = useCallback(async () => {
    setMarking(true)
    try {
      await markAllNotificationsRead(audience)
      // Both keys, in one pass: the list is what the player is looking at and the
      // badge is what they opened the panel to clear.
      await Promise.all([inbox.mutate(), unread.mutate()])
      toast('success', t('inbox.markedAllToast'))
    } catch (error) {
      toast('error', t(`errors.${toApiError(error).code}` as TKey))
    } finally {
      setMarking(false)
    }
  }, [audience, inbox, unread, t, toast])

  return (
    <div ref={layerRef} className="relative">
      <IconButton
        size="sm"
        variant="ghost"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        // The number is the whole reason to open the panel, so it rides in the
        // name. `openNone` keeps the bell from announcing a count of zero.
        label={count > 0 ? tp('inbox.openUnread', count) : t('inbox.openNone')}
        className="relative"
      >
        <icons.notifications aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 font-display text-[9px] font-bold leading-4 text-primary-foreground"
          >
            {count > BADGE_MAX ? t('inbox.overflow') : count}
          </span>
        )}
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={setPanelEl}
            id={panelId}
            role="dialog"
            aria-label={t('inbox.title')}
            // Focusable so opening the panel can move focus into it without
            // stealing the first control's turn — the heading is what a reader
            // should hear first, not "Mark all as read, button".
            tabIndex={-1}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="glass-strong absolute right-0 top-12 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg outline-none"
          >
            <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-text-high">
                {t('inbox.title')}
              </h2>
              <p
                // Announced rather than merely drawn: marking everything read
                // changes this line, and the player may still be on the button.
                role="status"
                className={cn(
                  'label-mono text-[9px]',
                  count > 0 ? 'text-primary' : 'text-text-low',
                )}
              >
                {count > 0 ? t('inbox.unreadCount', { n: count }) : t('inbox.allRead')}
              </p>
            </header>

            <div className="max-h-[min(26rem,60svh)] overflow-y-auto px-2 py-2">
              <DataBoundary
                state={inbox}
                loading={
                  <div className="flex flex-col gap-2 p-1">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                }
                isEmpty={(items) => items.length === 0}
                empty={
                  // `bare` and `sm`: the panel is already a card, and the absence
                  // of news must not be the tallest thing the bell can open.
                  <EmptyState
                    bare
                    size="sm"
                    icon={icons.empty}
                    title={t('inbox.empty')}
                    description={t('inbox.emptyBody')}
                    className="py-6"
                  />
                }
                errorSize="sm"
                errorBare
              >
                {(items) => (
                  <ul className="flex flex-col gap-1">
                    {items.map((item) => (
                      <NotificationRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </DataBoundary>
            </div>

            {count > 0 && (
              <footer className="border-t border-border px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  voice="plain"
                  loading={marking}
                  onClick={() => void markAll()}
                  iconLeft={<icons.check aria-hidden />}
                >
                  {t('inbox.markAllRead')}
                </Button>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * One thing the club said.
 *
 * A list item rather than a button: until C2.5 gives the cards their actions,
 * a clickable row would promise something to open. The unread state is a dot
 * *and* a word — colour alone would say nothing to a reader, and the dot is
 * `aria-hidden` for the same reason the badge is.
 */
function NotificationRow({ item }: { item: Notification }) {
  const { t, locale } = useT()
  const level = LEVEL[item.level]
  const Icon = icons[level.icon]
  const unread = item.readAt === null

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-md px-3 py-2.5',
        unread ? 'well-shallow' : 'opacity-70',
      )}
    >
      <Icon size={16} aria-hidden className={cn('mt-0.5 shrink-0', level.tone)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-pretty text-xs font-semibold leading-snug text-text-high">
            {item.title}
          </p>
          {unread && (
            <>
              <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="sr-only">{t('inbox.unread')}</span>
            </>
          )}
        </div>
        <p className="text-pretty text-[11px] leading-relaxed text-text-medium">{item.body}</p>
        <p className="text-[10px] tabular-nums text-text-low">
          {formatDateTime(item.createdAt, locale)}
        </p>
      </div>
    </li>
  )
}
