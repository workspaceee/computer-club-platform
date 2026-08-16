'use client'

/**
 * "The club now" on the home screen (C3.7).
 *
 * The one card on this surface about the **room** rather than about the account:
 * how many seats are free and where they are, which friends are on the floor and
 * on which PC, and the single button that pulls one of them into what the player
 * is already playing. Everything on it answers one question — "is anything
 * happening here, and can I move someone next to me".
 *
 * The decisions worth naming, each of them a bug the card would otherwise ship:
 *
 *  1. **One read, not three.** `fetchClubNow()` answers with the zones, the
 *     friends and the party context in one payload. Three fetches would give the
 *     card three loading states and therefore three heights, and a surface that
 *     resizes twice while it settles is exactly what C3.11 forbids. It is also one
 *     consistency guarantee: the totals are summed server-side from the same rows
 *     the zone counts came from, so the headline and its breakdown cannot disagree.
 *
 *  2. **"Here now" is a seat, not a presence flag.** A friend online from home is
 *     precisely the person this card must not point at — it promises to name the
 *     PC. Friends without a machine are folded into one count (`friendsAway`)
 *     rather than a greyed-out roster, which would bury the two people who are
 *     actually in the building.
 *
 *  3. **`callable` is the server's word.** Whether a row may have a button folds
 *     together the target's privacy, whether they are already in the squad, and
 *     whether there is a title to form one around — the *same* predicate
 *     `callToParty()` enforces. A card that guessed would offer an invite the API
 *     then refuses, so this component only renders the answer it was given.
 *
 *  4. **One button, one write.** "Call to party" is either "create a party around
 *     what I am playing" or "invite into the one I own", and choosing between them
 *     in the client would mean two awaits with a window between them in which a
 *     double click creates two parties. The composite lives in the endpoint; here
 *     there is only the `inFlight` ref beside the state, because a second click
 *     arrives before React has re-rendered.
 *
 * Not rendered for a walk-in, and for the reason the dailies and the season card
 * are not (C3.4, C3.5) rather than out of symmetry: both halves of this card are
 * answers to "where can I put my friend", the friend list is keyed to an account,
 * and a guest would be shown the previous member's evening. Zone names and seat
 * labels are club data, printed as they come (F2.2).
 */

import { motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { Skeleton } from '@/components/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { useApi, useInvalidate } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { callToParty, fetchClubNow, toApiError } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import type { ID } from '@/lib/types/common'
import type { ZoneOccupancy } from '@/lib/types/machine'
import type { ClubFriend } from '@/lib/types/social'
import { cn } from '@/lib/utils'

/**
 * Seats change when *other* people sit down, and those events are scoped to their
 * own stations — no push reaches this client for them (`matchesScope`). So the one
 * card on the screen that reports the room polls, at the same cadence the attract
 * screen reads occupancy with.
 */
const CLUB_NOW_REFRESH_MS = 30_000

/** Skeleton row counts — the club's own shape, so the panel does not jump (C3.11). */
const ZONE_SKELETON_ROWS = 3
const FRIEND_SKELETON_ROWS = 2

export function ClubNowCard({ index }: { index: string }) {
  const { t, tp } = useT()
  const user = useStore((s) => s.user)
  const toast = useStore((s) => s.toast)

  // Keyed by the member, so signing out cannot leave the next player looking at
  // someone else's friends. The `social` head is what makes a pushed
  // `party.invite` or `friend.request` land here without a subscription of its own
  // (`EVENT_INVALIDATES`).
  const board = useApi(user ? ['social/club-now', user.email] : null, fetchClubNow, {
    refreshInterval: CLUB_NOW_REFRESH_MS,
  })
  const invalidate = useInvalidate()

  const [calling, setCalling] = useState<ID | null>(null)
  // The ref beside the state, for the reason the quests card keeps one: a double
  // click arrives before React has re-rendered, and the closure would still see
  // `null` and post the invite twice.
  const inFlight = useRef(false)

  const call = useCallback(
    async (friend: ClubFriend) => {
      if (inFlight.current) return
      inFlight.current = true
      setCalling(friend.userId)
      try {
        await callToParty(friend.userId)
        // The whole family: the invite also appears in the inbox that answers it
        // (C2.5), and this card must re-read `partyState` from the server rather
        // than patch its own copy of it.
        await invalidate('social')
        toast('success', t('home.clubNowCalledToast', { name: friend.nickname }))
      } catch (error) {
        // The API answers with a code; the sentence is ours (F2.2).
        toast('error', t(`errors.${toApiError(error).code}` as TKey))
      } finally {
        inFlight.current = false
        setCalling(null)
      }
    },
    [invalidate, t, toast],
  )

  if (!user) return null

  const data = board.data
  // Club-wide free seats as a fraction, in the subtitle: it is the headline the
  // zone rows below break down, and no row can state it.
  const headline = data
    ? data.free > 0
      ? t('home.clubNowFree', { free: data.free, total: data.total })
      : t('home.clubNowFull')
    : undefined

  return (
    <section aria-labelledby="club-now-heading">
      <SectionHeader
        index={index}
        title={t('home.clubNowTitle')}
        headingId="club-now-heading"
        subtitle={headline}
        // What a call would form a party around — the answer to "invited to what".
        // Present only when there is a title, because there is nothing to name
        // otherwise and a chip saying so would be a second copy of the sentence
        // under the list.
        action={
          data?.partyGameName ? (
            <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
              <icons.community size={11} aria-hidden />
              {t('home.clubNowPartyGame', { game: data.partyGameName })}
            </span>
          ) : null
        }
      />

      <div className="glass tick-corners rounded-xl p-4">
        <DataBoundary
          state={board}
          errorBare
          errorSize="sm"
          loading={
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                {Array.from({ length: ZONE_SKELETON_ROWS }).map((_, i) => (
                  <Skeleton key={i} className="h-[38px] w-full" radius="md" />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-32" />
                {Array.from({ length: FRIEND_SKELETON_ROWS }).map((_, i) => (
                  <Skeleton key={i} className="h-[62px] w-full" radius="md" />
                ))}
              </div>
            </div>
          }
          // A club with no zones mapped and nobody on the floor: the card has
          // nothing to report at all, and says who it is waiting on.
          isEmpty={(board) => board.zones.length === 0 && board.friendsInClub.length === 0}
          empty={
            <EmptyState
              bare
              size="sm"
              icon={icons.display}
              title={t('home.clubNowEmpty')}
              description={t('home.clubNowEmptyBody')}
            />
          }
        >
          {(board) => (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col gap-2">
                <p className="label-mono text-[9px] text-text-low">{t('home.clubNowZones')}</p>
                <ul className="flex flex-col gap-2">
                  {/* Zones with no hardware are dropped: an empty zone is a row
                      the club has not built yet, not a full one. */}
                  {board.zones
                    .filter((zone) => zone.total > 0)
                    .map((zone, i) => (
                      <ZoneRow key={zone.zoneId} zone={zone} index={i} />
                    ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <p className="label-mono text-[9px] text-text-low">
                  {tp('home.clubNowFriends', board.friendsInClub.length)}
                </p>

                {board.friendsInClub.length === 0 ? (
                  // "Nobody tonight" and "no friends at all" are two different
                  // evenings (C3.13). A member with a list gets the promise this
                  // card exists to make — it will name their PCs; somebody with no
                  // list at all gets the club's own offer for making one, priced in
                  // the club's `referralMinutes` rather than in a number written
                  // into three dictionaries. A club running no such scheme sends
                  // `0`, and then there is no offer to make: the honest line is
                  // still "add the players you meet here".
                  <EmptyState
                    bare
                    size="sm"
                    icon={referral ? icons.gift : icons.community}
                    title={
                      referral
                        ? tp('home.clubNowReferral', board.referralMinutes)
                        : t('home.clubNowNoFriends')
                    }
                    description={t(
                      referral ? 'home.clubNowReferralBody' : 'home.clubNowNoFriendsBody',
                    )}
                  />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {board.friendsInClub.map((friend, i) => (
                      <FriendRow
                        key={friend.userId}
                        friend={friend}
                        index={i}
                        calling={calling === friend.userId}
                        // Every other row goes inert while one invite is in
                        // flight — one party, one write.
                        blocked={calling !== null && calling !== friend.userId}
                        onCall={() => void call(friend)}
                      />
                    ))}
                  </ul>
                )}

                {/* Stated once under the list rather than as five disabled buttons
                    with no explanation: with no title running and no party owned
                    there is nothing to invite anyone *into*. */}
                {board.partyGameName === null && board.friendsInClub.length > 0 && (
                  <p className="text-pretty text-xs leading-relaxed text-text-low">
                    {t('home.clubNowNeedGame')}
                  </p>
                )}

                {/* The friends who are not here — a count, never a roster. */}
                {board.friendsAway > 0 && (
                  <p className="text-pretty text-xs leading-relaxed text-text-low">
                    {tp('home.clubNowAway', board.friendsAway)}
                  </p>
                )}
              </div>
            </div>
          )}
        </DataBoundary>
      </div>
    </section>
  )
}

/**
 * One zone: its name, a bar, and the count in words.
 *
 * A number and a bar rather than a colour, the same call the attract screen makes:
 * "3 free" is the same fact for a player with red-green blindness as for anyone
 * else. A zone with nothing free says "Full" instead of showing a `0`, which in a
 * column of numbers reads as a quantity and not as a closed door — and the row's
 * accessible name carries the fraction the bar draws.
 */
function ZoneRow({ zone, index }: { zone: ZoneOccupancy; index: number }) {
  const { t, tp } = useT()
  const free = zone.free > 0

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      // Recessed into the panel — the shallow rung of the well family (§3.3). The
      // element allowed to step forward on this card is the callable friend row.
      className="well-shallow flex items-center gap-3 rounded-md border border-border px-3 py-2"
      aria-label={t('home.clubNowZoneLabel', {
        zone: zone.zoneName,
        free: zone.free,
        total: zone.total,
      })}
    >
      {/* Club copy, printed as the club named it (F2.2). */}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-high">
        {zone.zoneName}
      </span>
      <span aria-hidden className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.07] sm:w-16">
        <span
          className={cn('block h-full rounded-full', free ? 'bg-success' : 'bg-text-low')}
          style={{ width: `${(zone.free / zone.total) * 100}%` }}
        />
      </span>
      <span
        aria-hidden
        className={cn(
          'label-mono shrink-0 text-[9px] tabular-nums',
          free ? 'text-success' : 'text-text-low',
        )}
      >
        {free ? tp('home.clubNowZoneFree', zone.free) : t('home.clubNowZoneFull')}
      </span>
    </motion.li>
  )
}

/**
 * One friend on the floor: who they are, which PC, what they are in, and the one
 * thing that can be done about it.
 *
 * The right-hand slot holds four mutually exclusive outcomes — call them, the
 * invite is already out, they are already in the squad, or they do not take invites
 * at all. The last is their own setting, so the row states it plainly rather than
 * offering a button that would be refused.
 */
function FriendRow({
  friend,
  index,
  calling,
  blocked,
  onCall,
}: {
  friend: ClubFriend
  index: number
  calling: boolean
  blocked: boolean
  onCall: () => void
}) {
  const { t } = useT()

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn(
        'flex flex-col gap-3 rounded-md border px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3',
        // The only row that steps forward is the one there is something to do
        // about; the rest are recessed into the panel (§3.3).
        friend.callable ? 'border-success/40 bg-success/10' : 'well-shallow border-border',
        blocked && 'opacity-45',
      )}
    >
      {/* The dot is presence and the ring is the tier — both labelled inside the
          avatar, so nothing here is colour-only. */}
      <Avatar name={friend.nickname} size="sm" level={friend.level} status="online" />

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-semibold leading-snug text-text-high">
          {friend.nickname}
        </p>
        <p className="label-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-text-low">
          {/* The seat label is the club's own ("PC #17"), so the line works for a
              hall numbered any way the club likes. */}
          <span className="flex items-center gap-1 tabular-nums">
            <icons.display size={11} aria-hidden />
            {t('home.clubNowFriendSeat', { seat: friend.machineLabel ?? '' })}
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <icons.games size={11} aria-hidden />
            <span className="truncate">
              {friend.playingGameName
                ? t('home.clubNowFriendPlaying', { game: friend.playingGameName })
                : t('home.clubNowFriendIdle')}
            </span>
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center sm:w-[124px] sm:justify-end">
        {friend.callable ? (
          <Button
            variant="primary"
            size="sm"
            loading={calling}
            disabled={blocked}
            onClick={onCall}
            iconLeft={<icons.add aria-hidden />}
            // Two words on screen, shared by every row, so the accessible name
            // carries who is being called.
            aria-label={t('home.clubNowCallLabel', { name: friend.nickname })}
          >
            {t('home.clubNowCall')}
          </Button>
        ) : friend.partyState === 'joined' ? (
          <Badge tone="success" variant="soft" size="sm">
            {t('home.clubNowJoined')}
          </Badge>
        ) : friend.partyState === 'invited' ? (
          <Badge tone="info" variant="soft" size="sm">
            {t('home.clubNowInvited')}
          </Badge>
        ) : !friend.acceptsPartyInvites ? (
          <span className="text-pretty text-[11px] leading-relaxed text-text-low">
            {t('home.clubNowNoInvites')}
          </span>
        ) : null}
      </div>
    </motion.li>
  )
}
