'use client'

import { HudPlate } from '@/components/ui/hud-plate'
import { Money } from '@/components/ui/money'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import { formatCoins, formatEur, sumCents } from '@/lib/money'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { fetchWallet } from '@/lib/mock/api'
import { cartTotalCents, timeChargeCents, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * The money half of the right-hand block (C2.4).
 *
 * Split from `SessionHud` when the euro balance arrived, because the two blocks
 * answer different questions and re-render on different clocks: the session
 * plate ticks every second, the wallet moves only when money does. Kept together
 * *here* for the one rule that governs them — a surface shows either a balance
 * or a tab, never both:
 *
 *  - a **member** has a wallet: euros they topped up, and the coins the loyalty
 *    economy pays out;
 *  - a **walk-in** has neither. What a guest owes is an open tab settled at the
 *    counter, so a €0.00 balance beside it would be a lie about an account that
 *    does not exist (F6.2).
 */
export function WalletHud({ surface }: { surface: LauncherSurface }) {
  return surface === 'guest' ? <GuestTabPlate /> : <MemberWalletPlates />
}

/**
 * What the visit owes so far: the bar order **plus** the time on the seat.
 *
 * Its own component so the euro balance and the coin plate above do not
 * re-render on the clock: this is the one reading in the bar that legitimately
 * changes every second, because the counter bills used time by the minute (F6.3).
 * Both terms are cents, so this is a plain sum — no float round-trip (F7.2).
 */
function GuestTabPlate() {
  const { t } = useT()

  const seconds = useStore((s) => s.sessionSeconds)
  const cart = useStore((s) => s.cart)

  const tabTotal = sumCents(cartTotalCents(cart), timeChargeCents(seconds))

  return (
    <HudPlate
      icon={<icons.bill size={14} />}
      label={t('guest.tab')}
      value={<Money value={tabTotal} fromCents size="sm" />}
    />
  )
}

/**
 * Balance and coins — the two pockets a member spends from (C2.4).
 *
 * The euro balance comes from the server, the coin balance from the store, and
 * the asymmetry is deliberate rather than an oversight:
 *
 *  - **euros** are only ever moved by a write the club owns (a top-up at the
 *    counter, an order, an admin correction), and every one of those events
 *    invalidates the `wallet` key prefix (`EVENT_INVALIDATES`), so one SWR read
 *    stays fresh without a second copy of the balance living in the client;
 *  - **coins** are still awarded client-side until C7 wires the real ledger, so
 *    the store is the only place that knows the current number — re-reading the
 *    profile here would roll a bar order's payout back on the next revalidation.
 *
 * Nothing is drawn until the balance lands. A plate reading €0.00 while the
 * request is in flight is not a placeholder, it is a wrong number on the one
 * screen a player checks before ordering — so the space is held by a skeleton of
 * the plate's own size instead (docs/PLAN.md §0.3).
 */
function MemberWalletPlates() {
  const { t } = useT()

  const coins = useStore((s) => s.coins)
  const setView = useStore((s) => s.setView)

  const wallet = useApi('wallet/balance', () => fetchWallet())

  return (
    <>
      {wallet.data ? (
        <PlateButton
          onClick={() => setView('wallet')}
          label={t('wallet.openWallet', { amount: formatEur(wallet.data.moneyCents) })}
          className="hidden md:block"
        >
          <HudPlate
            icon={<icons.wallet size={14} />}
            label={t('wallet.balance')}
            value={<Money value={wallet.data.moneyCents} fromCents size="sm" />}
          />
        </PlateButton>
      ) : wallet.error ? (
        // A failed read used to render *nothing*, which is the one outcome the
        // bar must not have: the row silently closed up and the player was left
        // with a launcher that looked like it had no wallet at all, two
        // centimetres from a basket they were about to pay from. The plate stays,
        // states that it does not know, and its press retries the read instead of
        // navigating — the section behind it would only show the same failure.
        <PlateButton
          onClick={() => void wallet.mutate()}
          label={t('wallet.balanceUnknown')}
          className="hidden md:block"
        >
          <HudPlate
            icon={<icons.wallet size={14} />}
            label={t('wallet.balance')}
            // An em dash rather than €0.00: the balance is unknown, and a zero
            // here is a number the club never sent.
            value={<span aria-hidden>—</span>}
          />
        </PlateButton>
      ) : (
        // Same footprint as the plate it stands in for, so the bar does not
        // reflow around the avatar when the balance arrives. `Skeleton` is
        // `aria-hidden` by construction: a loading balance has nothing to say.
        <Skeleton radius="md" className="hidden h-[42px] w-24 md:block" />
      )}

      {/* Coins are the second pocket of the same wallet, so the plate is a button
          on the same terms as the balance beside it. It was a bare `HudPlate`
          until now, which made the pair inconsistent in the way that matters
          least visually and most for use: two readings side by side, one of them
          keyboard-reachable and named, the other a decorative `div` a player
          could see and never open. */}
      <PlateButton
        onClick={() => setView('wallet')}
        label={t('wallet.openCoins', { amount: formatCoins(coins) })}
      >
        <HudPlate
          tone="coin"
          icon={<icons.coins size={14} />}
          label={t('wallet.coinBalance')}
          value={formatCoins(coins)}
        />
      </PlateButton>
    </>
  )
}

/**
 * A plate that can be pressed (C2.4).
 *
 * `HudPlate` is a `div` by design — it is a reading, not a control — so every
 * plate in the bar that leads somewhere wraps itself in a button. That wrapper
 * had been typed out twice here with the same six classes, which is how the coin
 * plate ended up with none of them.
 *
 * The name is `aria-label` on the button and the plate inside is left in the
 * tree: the label replaces the subtree it wraps, so the amount has to travel in
 * the name or it is drawn and never spoken.
 */
function PlateButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'rounded-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
        className,
      )}
    >
      {children}
    </button>
  )
}
