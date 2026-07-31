'use client'

/**
 * The bell in the top bar and the panel behind it (C2.4).
 *
 * Three decisions shape the file, and all three are about *when* the club is
 * read rather than how the list looks:
 *
 *  1. **The count is always live, the list never is.** The badge is the only
 *     reason to look at the bar, so `support/unread` is fetched whether the
 *     panel is open or not; the list itself is keyed `null` while closed, so a
 *     station sitting on the launcher all evening is not polling an endpoint
 *     nobody is looking at. Both keys start with `support`, which is the prefix
 *     `message.received` and `broadcast` invalidate (`EVENT_INVALIDATES`), so one
 *     push refreshes the badge without this component subscribing by hand.
 *  2. **The count belongs in the trigger's name.** A red disc reading "3"
 *     announces nothing, and once it overflows to "9+" it is not even the number
 *     any more. `inbox.openUnread` carries the real count as words; the disc is
 *     `aria-hidden` decoration on top of it.
 *  3. **Reading is a write, so it goes through the server.** Clicking a row
 *     marks it read via `markNotificationRead` and then revalidates — there is no
 *     client-side `readAt` to drift out of step with the badge.
 *
 * C2.5 grows this panel with per-day grouping and in-card actions ("Accept
 * invite", "Rate order"). What it inherits from here is the read model: a flat,
 * newest-first list, unread marked, and one "mark all" write.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useId } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { IconAction } from '@/components/ui/icon-action'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useT } from '@/lib/i18n/provider'
import { icons, type LucideIcon } from '@/lib/icons'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/mock/api'
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

/** Highest number the disc prints before it becomes `inbox.overflow` ("9+"). */
const BADGE_MAX = 9

export function NotificationBell() {
  const { t, tp } = useT()
  const toast = useStore((s) => s.toast)
  const open = useStore((s) => s.notificationsOpen)
  const setOpen = useStore((s) => s.setNotificationsOpen)
  const panelId = useId()

  // Always fetched: the badge is the whole point of the control, and a bell that
  // only learns about unread mail once you open it has nothing to say in the bar.
  const unread = useApi(['support', 'unread'], () => fetchUnreadCount())
  // Only fetched while the panel is up (see rule 1 above).
  const inbox = useApi(open ? ['support', 'inbox'] : null, () => fetchNotifications())

  const count = unread.data ?? 0

  // The same shared layer core the avatar menu uses (F6.7): Escape peels only the
  // topmost layer, outside-click closes, and no scroll lock — locking the page
  // would shift the bar this popover hangs from. The registered panel is the
  // wrapper, trigger included, so a pointer-down on the bell toggles it off
  // instead of closing and immediately reopening.
  const layerRef = useDismissableLayer({
    open,
    onClose: () => setOpen(false),
    closeOnOutside: true,
    trapFocus: false,
    lockScroll: false,
  })

  async function readOne(notification: Notification) {
    if (notification.readAt !== null) return
    try {
      await markNotificationRead(notification.id)
    } catch {
      // A failed read is not worth a toast: the row stays unread and the next
      // revalidation tells the truth either way.
    }
    void inbox.mutate()
    void unread.mutate()
  }

  async function readAll() {
    try {
      const marked = await markAllNotificationsRead()
      if (marked > 0) toast('success', t('inbox.markedAllToast'))
    } catch {
      toast('error', t('errors.generic'))
    }
    void inbox.mutate()
    void unread.mutate()
  }

  return (
    <div ref={layerRef} className="relative">
      <IconAction
        icon={<icons.notifications size={17} />}
        // The count as words, because the disc beside it is decoration and "9+"
        // is not a number anyone can act on.
        label={count > 0 ? tp('inbox.openUnread', count) : t('inbox.openNone')}
        count={count}
        badgeTone="danger"
        countMax={BADGE_MAX}
        overflowLabel={t('inbox.overflow')}
        active={open}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={t('inbox.title')}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            // Anchored to the bell on a wide screen and pinned to the viewport
            // edges on a narrow one: at 360 px a fixed-width popover hanging off
            // a control this far right would run off the screen.
            className="glass-strong absolute right-0 top-12 z-10 flex max-h-[70svh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-text-high">
                  {t('inbox.title')}
                </p>
                <p className="text-xs text-text-low">
                  {count > 0 ? tp('inbox.unreadCount', count) : t('inbox.allRead')}
                </p>
              </div>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => void readAll()}
                  // `whitespace-nowrap` with the `min-w-0` beside it: the label is
                  // the longest string in the header and the three languages
                  // disagree about how long, so the wrapping is spent on the
                  // subtitle rather than folding the action onto two lines.
                  className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                >
                  {t('inbox.markAllRead')}
                </button>
              )}
            </header>

            <div className="overflow-y-auto p-1.5">
              <DataBoundary
                state={inbox}
                loading={
                  <div className="flex flex-col gap-1.5 p-1.5">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} radius="md" className="h-16 w-full" />
                    ))}
                  </div>
                }
                isEmpty={(list) => list.length === 0}
                empty={
                  <EmptyState
                    bare
                    size="sm"
                    icon={icons.notifications}
                    title={t('inbox.empty')}
                    description={t('inbox.emptyBody')}
                  />
                }
                errorSize="sm"
                errorBare
              >
                {(list) => (
                  <ul className="flex flex-col gap-1">
                    {list.map((notification) => (
                      <li key={notification.id}>
                        <NotificationRow
                          notification={notification}
                          onRead={() => void readOne(notification)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </DataBoundary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: () => void
}) {
  const { t, formatDateTime } = useT()
  const level = LEVEL[notification.level]
  const isUnread = notification.readAt === null

  return (
    // A `button` even though the row has no destination yet (C2.5 gives the cards
    // their actions): marking a message read *is* an action, and it has to be
    // reachable from the keyboard. A read row is inert, so it is not a button.
    <button
      type="button"
      onClick={onRead}
      disabled={!isUnread}
      className={cn(
        'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
        isUnread ? 'bg-white/[0.04] hover:bg-white/[0.07]' : 'opacity-70',
      )}
    >
      <span aria-hidden className={cn('mt-0.5 shrink-0', level.tone)}>
        <level.icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-sm font-bold text-text-high">
            {notification.title}
          </span>
          {isUnread && (
            // Spoken, not coloured: the dot is `aria-hidden`, so "Unread" is what
            // reaches a reader — the state is never carried by colour alone.
            <>
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="sr-only">{t('inbox.unread')}</span>
            </>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-text-low">
          {notification.body}
        </span>
        <span className="label-mono mt-1 block text-[9px] text-text-low">
          {formatDateTime(new Date(notification.createdAt))}
        </span>
      </span>
    </button>
  )
}
