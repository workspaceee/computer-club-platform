'use client'

/**
 * The two doors of the right-hand block that are not readings (C2.4): the basket
 * and "Help".
 *
 * Together in one file because they are the same *kind* of control — an
 * `IconAction` that opens something that already exists elsewhere — and neither
 * owns any state of its own. The bell is not here: it carries a fetch, a popover
 * and a write, which is a component's worth of behaviour rather than a trigger.
 *
 * Both live on the guest surface too. A walk-in orders at the bar and calls staff
 * exactly like a member does; what a guest does not have is a wallet, and that
 * asymmetry is `WalletHud`'s to state, not the chrome's.
 */

import { IconAction } from '@/components/ui/icon-action'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import { cartCount, useStore } from '@/lib/store'

/**
 * The basket, with what is in it (C2.4).
 *
 * The count comes from the store rather than from a read, because the basket is
 * the one number in the bar the *client* owns: items are added locally and only
 * become the club's business at checkout. `cartCount` is the shared derivation,
 * so the bar and the drawer can never disagree about how many "2 × cola" is.
 *
 * It only opens the drawer — `CartDrawer` is mounted once in `GlobalOverlays`, so
 * pressing this cannot remount the panel or lose a half-built order.
 */
export function CartButton() {
  const { t, tp } = useT()
  const cart = useStore((s) => s.cart)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const cartOpen = useStore((s) => s.cartOpen)

  const count = cartCount(cart)

  return (
    <IconAction
      icon={<icons.cart size={17} />}
      // The count as words for the same reason the bell spells its own out: the
      // disc is decoration, and "Cart, 2 items" is what a screen reader needs to
      // decide whether opening the drawer is worth it.
      label={count > 0 ? tp('shop.openCart', count) : t('shop.openCartEmpty')}
      count={count}
      active={cartOpen}
      aria-haspopup="dialog"
      aria-expanded={cartOpen}
      onClick={() => setCartOpen(true)}
    />
  )
}

/**
 * "Help" — the labelled button of the block (C2.4).
 *
 * The one control in the bar that keeps its printed word from `md` up, because it
 * is the one a player looks for while something is already going wrong: a lone
 * life-ring glyph is a guess, and the section behind it (C11) is where "call
 * staff" lives. Below `md` the word goes and the name carries it.
 *
 * It navigates rather than opening a panel of its own: help is a section in the
 * one navigation table (`LAUNCHER_NAV`), so the bar, the avatar menu and the
 * mobile bar all reach the same screen.
 */
export function HelpButton() {
  const { t } = useT()
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)

  return (
    <IconAction
      icon={<icons.support size={17} />}
      label={t('nav.openSection', { section: t('nav.help') })}
      text={t('nav.help')}
      active={view === 'help'}
      onClick={() => setView('help')}
    />
  )
}
