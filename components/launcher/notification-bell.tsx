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
 *  3. **Reading is a write, so it goes through the server.** Opening the panel
 *     marks what is on screen read via `markNotificationRead` and revalidates the
 *     badge — there is no client-side `readAt` to drift out of step with it.
 *
 * C2.5 added the day grouping and the in-card actions, both of which live in
 * `notification-card.tsx`: this file still owns only *when the club is read* —
 * the badge query, the panel query, the layer, and the two writes. The read model
 * it hands down is unchanged: a flat, newest-first list, grouped on the client.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import {
  NotificationCard,
  groupByDay,
  useDayLabel,
} from '@/components/launcher/notification-card'
import { EmptyState } from '@/components/ui/empty-state'
import { IconAction } from '@/components/ui/icon-action'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/mock/api'
import { useStore } from '@/lib/store'

/** Highest number the disc prints before it becomes `inbox.overflow` ("9+"). */
const BADGE_MAX = 9

export function NotificationBell() {
  const { t, tp } = useT()
  const toast = useStore((s) => s.toast)
  const open = useStore((s) => s.notificationsOpen)
  const setOpen = useStore((s) => s.setNotificationsOpen)
  const panelId = useId()
  const dayLabel = useDayLabel()

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

  function refresh() {
    void inbox.mutate()
    void unread.mutate()
  }

  /**
   * Everything the player has now seen is read (C2.5).
   *
   * C2.4 marked a message read when the *row* was clicked, which worked only
   * because the row was itself a button. Cards now hold their own buttons, and
   * clicking "Accept invite" must not also be the gesture that clears an
   * unrelated warning above it. Opening the panel is the honest signal: these
   * messages were on screen and the player was looking at them.
   *
   * The writes are fired once per open — `markedFor` remembers which fetch was
   * already cleared, so a revalidation caused by the writes themselves (or by a
   * push arriving while the panel is up) does not start the loop again. The
   * badge is refreshed after; the list is not, because rows going from bold to
   * plain under the reader's eyes is worse than a panel that settles on close.
   */
  const markedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!open) {
      markedFor.current = null
      return
    }
    const list = inbox.data
    if (!list) return
    const unreadIds = list.filter((n) => n.readAt === null).map((n) => n.id)
    const stamp = unreadIds.join(',')
    if (unreadIds.length === 0 || markedFor.current === stamp) return
    markedFor.current = stamp
    void Promise.allSettled(unreadIds.map((id) => markNotificationRead(id)))
      // A failed read is not worth a toast: the card stays unread and the next
      // open tells the truth either way.
      .then(() => void unread.mutate())
  }, [open, inbox.data, unread])

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
            // Anchored to the bell from `sm` up, pinned to the viewport below it.
            //
            // Clamping the *width* to `calc(100vw-2rem)` was not enough and hid a
            // real defect at 360 px: the bell is not the rightmost control in the
            // bar, so a 328 px panel right-aligned to it started at x = -42 and
            // cut the left edge off its own title ("ВЕДОМЛЕНИЯ", "ОДНЯ"). A
            // popover has to be positioned against whichever box it must stay
            // inside — the bell on a wide screen, the viewport on a phone — so on
            // narrow screens it leaves the anchor entirely and spans the bar.
            className="glass-strong fixed inset-x-4 top-[4.25rem] z-20 flex max-h-[70svh] flex-col overflow-hidden rounded-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[22rem]"
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
                  <div className="flex flex-col gap-2">
                    {groupByDay(list).map((group) => (
                      // One `section` per day, named by its heading, so a reader
                      // moving by landmark hears "Notifications, Yesterday"
                      // instead of walking one flat list of forty rows.
                      <section key={group.key} aria-label={t('inbox.dayGroup', { day: dayLabel(group) })}>
                        <h3 className="label-mono sticky top-0 z-10 bg-surface-1/95 px-3 py-1.5 text-[9px] text-text-low backdrop-blur">
                          {dayLabel(group)}
                        </h3>
                        <ul className="flex flex-col gap-1">
                          {group.items.map((notification) => (
                            <li key={notification.id}>
                              <NotificationCard
                                notification={notification}
                                onAnswered={refresh}
                              />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </DataBoundary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
