'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CheckoutModal } from '@/components/launcher/checkout-modal'
import { Drawer } from '@/components/ui/drawer'
import { useT } from '@/lib/i18n/provider'
import { cartTotal, useStore } from '@/lib/store'

/**
 * The cart (F1.9) — a `Drawer`, not a hand-rolled panel.
 *
 * It used to build its own scrim + `motion.aside` from scratch, and every
 * behaviour of a dismissable surface was missing as a result: the panel was an
 * `<aside>` rather than a dialog, Escape did nothing, focus stayed on the "add to
 * cart" button behind the scrim, and the whole shop grid underneath stayed in the
 * tab order — a keyboard user could tab straight through the open drawer into the
 * page it was covering. Checked in the browser before the change: the document
 * held **zero** `role="dialog"` nodes with the cart and the checkout dialog both
 * open, and Escape closed neither.
 *
 * Reusing `Drawer` is what buys the "Escape peels exactly one layer" property
 * (F6.7): the drawer and the dialog raised from it both register on the shared
 * stack in `useDismissableLayer`, so the dialog answers Escape first and the
 * drawer only once the dialog is gone. Nothing here has to know that — the
 * ordering falls out of the two surfaces sharing one stack instead of each
 * binding its own `document` listener.
 */
export function CartDrawer() {
  const { t } = useT()
  const cart = useStore((s) => s.cart)
  const cartOpen = useStore((s) => s.cartOpen)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const changeQty = useStore((s) => s.changeQty)
  const removeFromCart = useStore((s) => s.removeFromCart)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const total = cartTotal(cart)

  return (
    <>
      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        eyebrow="BAR"
        title={t('shop.cart')}
        footer={
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-medium">{t('shop.total')}</span>
              <span className="font-display text-2xl font-black tabular-nums text-text-high">
                ${total.toFixed(2)}
              </span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => setCheckoutOpen(true)}
              className="w-full rounded-lg bg-primary py-3 font-display font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('shop.checkout')}
            </button>
          </div>
        }
      >
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ShoppingCart size={40} className="text-text-low" aria-hidden />
            <p className="font-display font-bold text-text-high">{t('shop.cartEmpty')}</p>
            <p className="text-sm text-text-medium">{t('shop.cartEmptyBody')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, x: 40 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-black/20 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-high">{item.name}</p>
                    <p className="text-xs text-text-low">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="rounded-l-lg p-1.5 text-text-medium transition-colors hover:text-text-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                      // The row repeats six controls per item, so every label
                      // carries the product name — otherwise a screen reader
                      // reads "decrease quantity" twelve times with no way to
                      // tell which line it is on.
                      aria-label={`${t('shop.quantity')} −1: ${item.name}`}
                    >
                      <Minus size={14} aria-hidden />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums text-text-high">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="rounded-r-lg p-1.5 text-text-medium transition-colors hover:text-text-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                      aria-label={`${t('shop.quantity')} +1: ${item.name}`}
                    >
                      <Plus size={14} aria-hidden />
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-bold tabular-nums text-text-high">
                    ${(item.price * item.qty).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="rounded-md p-1 text-text-low transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    aria-label={`${t('shop.remove')}: ${item.name}`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Drawer>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  )
}
