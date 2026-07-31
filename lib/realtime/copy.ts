/**
 * Event → user-visible line (F4).
 *
 * Payloads carry ids, cents and seconds — never prose. This module is the single
 * place that decides *what a player reads* when a frame arrives, and it returns a
 * dictionary key plus variables rather than a finished string, so the caller
 * translates with the live language (F2) and nothing here needs React.
 *
 * `null` means "this event has no toast": the screen that cares about it renders
 * the change itself (a modal, a lock screen, a badge), and a toast on top would
 * be noise. Stage 4 keeps this file as is — the server sends the same frames.
 */
import { EVENT_LEVEL, type AnyRealtimeEvent } from '@/lib/realtime/events'
import { formatEur } from '@/lib/money'
import type { TKey, TVars } from '@/lib/i18n/types'
import type { ToastKind } from '@/lib/store'

/** A toast waiting to be translated. */
export interface RealtimeToast {
  kind: ToastKind
  key: TKey
  vars?: TVars
  /** `0` keeps it up until dismissed — used for anything the player must act on. */
  durationMs?: number
}

/** Notification level → toast colour, so severity is decided in one place. */
function kindFor(event: AnyRealtimeEvent): ToastKind {
  switch (EVENT_LEVEL[event.type]) {
    case 'critical':
      return 'error'
    case 'warning':
      return 'warning'
    case 'success':
      return 'success'
    default:
      return 'info'
  }
}

const ORDER_KEY = {
  new: 'realtime.orderNew',
  accepted: 'realtime.orderAccepted',
  preparing: 'realtime.orderPreparing',
  delivering: 'realtime.orderDelivering',
  delivered: 'realtime.orderDelivered',
  cancelled: 'realtime.orderCancelled',
} as const satisfies Record<string, TKey>

/**
 * The line for one frame, or `null` when the event is handled visually elsewhere.
 *
 * Deliberately silent for: `session.paused` / `session.resumed` / `session.ended`
 * (the C2.7 pause overlay and the summary say it far louder — and the overlay
 * raises the "pause lifted" line itself, so a toast from here would double it),
 * `broadcast` (the shell
 * decides toast vs modal from `presentation`), and `time.warning` (the countdown
 * turns red and the session HUD owns that story).
 */
export function realtimeToast(event: AnyRealtimeEvent): RealtimeToast | null {
  switch (event.type) {
    case 'time.added': {
      const minutes = Math.round(Math.abs(event.payload.secondsAdded) / 60)
      if (minutes === 0) return null
      // A negative grant is a staff correction. The countdown already dropped;
      // announcing lost minutes in a green toast would be worse than silence.
      if (event.payload.secondsAdded < 0) return null
      return {
        kind: 'success',
        key: event.payload.reason === 'staff' ? 'realtime.timeAddedByStaff' : 'realtime.timeAdded',
        vars: { minutes },
      }
    }

    case 'session.moved':
      return {
        kind: 'warning',
        key: 'realtime.sessionMoved',
        vars: { seat: event.payload.toMachineLabel ?? event.payload.toMachineId },
        // Moving seats needs an acknowledgement, not a 4-second flash.
        durationMs: 0,
      }

    case 'order.status':
      return {
        kind: event.payload.status === 'cancelled' ? 'error' : kindFor(event),
        key: ORDER_KEY[event.payload.status],
      }

    case 'tab.updated':
      return event.payload.status === 'settled'
        ? { kind: 'success', key: 'realtime.tabSettled' }
        : {
            kind: 'info',
            key: 'realtime.tabUpdated',
            vars: { total: formatEur(event.payload.totalCents) },
          }

    case 'pass.granted':
      return {
        kind: 'success',
        key: 'realtime.passGranted',
        vars: {
          name: event.payload.passName,
          minutes: event.payload.minutes + event.payload.bonusMinutes,
        },
      }

    case 'wallet.updated': {
      const { deltaCents, deltaCoins } = event.payload
      if (deltaCoins > 0) return { kind: 'success', key: 'realtime.coinsEarned', vars: { n: deltaCoins } }
      if (deltaCents > 0)
        return {
          kind: 'success',
          key: 'realtime.walletTopUp',
          vars: { amount: formatEur(deltaCents) },
        }
      if (deltaCents < 0)
        return { kind: 'info', key: 'realtime.walletSpent', vars: { amount: formatEur(-deltaCents) } }
      return null
    }

    case 'message.received':
      // Only staff replies are news; the player's own echo is not.
      return event.payload.author === 'staff' ? { kind: 'info', key: 'realtime.messageReceived' } : null

    case 'quest.completed':
      return {
        kind: 'success',
        key: 'realtime.questCompleted',
        vars: { title: event.payload.title },
      }

    case 'battlepass.tier':
      return { kind: 'success', key: 'realtime.battlePassTier', vars: { n: event.payload.tier } }

    case 'tournament.call':
      return {
        kind: 'warning',
        key: 'realtime.tournamentCall',
        vars: { name: event.payload.name },
        durationMs: 0,
      }

    case 'booking.reminder':
      return { kind: 'info', key: 'realtime.bookingReminder' }

    case 'friend.request':
      return event.payload.kind === 'received'
        ? { kind: 'info', key: 'realtime.friendRequest', vars: { name: event.payload.fromNickname } }
        : null

    case 'party.invite':
      return {
        kind: 'info',
        key: 'realtime.partyInvite',
        vars: { name: event.payload.fromNickname },
      }

    default:
      return null
  }
}
