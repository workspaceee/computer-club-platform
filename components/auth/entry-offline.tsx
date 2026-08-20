'use client'

import { motion } from 'framer-motion'
import { IconTile } from '@/components/icon-tile'
import { Button } from '@/components/ui/button'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'

interface EntryOfflineProps {
  /** Open a help thread from this seat. The one live action of the panel. */
  onCallStaff: () => void
  /** The call is in flight. */
  calling: boolean
  /** A thread is open — the counter has it, and pressing again would add nothing. */
  called: boolean
}

/**
 * "The door needs the club server" (C2.13).
 *
 * The card body while the link is down, and the reason it is a panel rather than
 * a disabled form: a greyed-out password field with a red toast under it says
 * *you* got something wrong. Nothing here is the player's fault, so the form goes
 * away and one sentence takes its place.
 *
 * Why the door closes at all — the club is the only party that can establish
 * admission (see `OFFLINE_ENTRY_BLOCKED` in `lib/mock/api/client.ts`): that the
 * credentials are real, that this account is not already playing across the room
 * (C1.12), that the seat is this arrival's to take (C1.7), and — for a paused
 * visit — how much time is actually left (C1.10). A station answering any of
 * those on its own opens a visit whose clock and tab the club never agreed to.
 *
 * One action, and it is not a retry: the shell reconnects by itself and the form
 * comes back on its own, so a "try again" button would only offer the player a
 * job the software already has. What it offers instead is the human — the shift
 * admin can open the door with a key, and on a lock screen with no link that is
 * the only path forward. `support.callStaff` is deliberately outside both offline
 * block-lists for exactly this moment.
 *
 * Tone is `warning`, never `danger`: the club is announced-not-broken, the same
 * grammar the offline banner and the guest panel already speak. Depth stays
 * `well` + `pill` inside the card, and no second T1 — the card's travelling ring
 * is the screen's whole budget (§4.2).
 *
 * The *words* live upstairs. `offlineEntryTitle` is the card's headline and
 * `offlineEntryBody` its subline, so this panel deliberately holds neither: a
 * refusal printed twice on one card reads as two different rules, and the header
 * of the lock screen is already the place every other state (a held seat, a
 * paused visit, a live recovery) states itself. What is left here is what only a
 * panel can carry — the live state of the link, and the button.
 */
export function EntryOffline({ onCallStaff, calling, called }: EntryOfflineProps) {
  const { t } = useT()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
      // A refusal the player did not cause, arriving under them. `status` because
      // nothing is broken and the screen recovers by itself.
      role="status"
    >
      {/* A well (§3.3): the state of the link is a fact stated *in* the card. */}
      <div className="well flex items-center gap-3 rounded-lg border border-border p-4">
        <IconTile icon={icons.offline} variant="warning" size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Status plate (§3.3), warning tone: the shell is already retrying, so
              the strip says what is happening rather than asking for anything. */}
          <span className="label-mono flex items-center gap-1.5 text-[10px] text-warning">
            <icons.pending size={11} className="animate-spin" />
            {t('realtime.reconnecting')}
          </span>
          {/* The promise a locked-out player needs next to the spinner: the wait
              is the software's job, not theirs. */}
          <span className="text-pretty text-xs leading-relaxed text-text-medium">
            {t('realtime.offlineBody')}
          </span>
        </div>
      </div>

      {/* The one committing action left on the screen, so it takes the bevel the
          Unlock button vacated (§4). Once a thread is open it goes quiet instead
          of disappearing: the player has to be able to see that the ask landed,
          and a second press would only find the same thread (`callStaff` is
          idempotent per open thread). */}
      <Button
        size="lg"
        block
        cut={!called}
        variant={called ? 'secondary' : 'primary'}
        loading={calling}
        disabled={called}
        onClick={onCallStaff}
        iconLeft={called ? <icons.check size={18} /> : <icons.staff size={18} />}
      >
        {t(called ? 'auth.adminCalled' : 'auth.callAdmin')}
      </Button>
    </motion.div>
  )
}
