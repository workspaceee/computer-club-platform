'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { CheckoutModal } from '@/components/launcher/checkout-modal'
import { overlayZ } from '@/lib/overlay'
import { cartTotal, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const cart = useStore((s) => s.cart)
  const cartOpen = useStore((s) => s.cartOpen)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const changeQty = useStore((s) => s.changeQty)
  const removeFromCart = useStore((s) => s.removeFromCart)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const total = cartTotal(cart)

  return (
    <>
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            // The cart used to outrank every dialog at `z-80`, which is exactly
            // backwards: it raises the checkout dialog, so it has to sit *under*
            // it. Both now read their rung from the ladder (F6.4).
            className={cn('fixed inset-0 bg-black/60 backdrop-blur-sm', overlayZ.drawer)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-border-strong bg-surface-2"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart size={18} className="text-primary" />
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-text-high">
                    Your Cart
                  </h3>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="text-text-low transition-colors hover:text-text-high"
                  aria-label="Close cart"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <ShoppingCart size={40} className="text-text-low" />
                    <p className="font-display font-bold text-text-high">Cart is empty</p>
                    <p className="text-sm text-text-medium">Add items from the shop to get started.</p>
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
                            <p className="text-xs text-text-low">${item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1 rounded-lg border border-border">
                            <button
                              onClick={() => changeQty(item.id, -1)}
                              className="p-1.5 text-text-medium transition-colors hover:text-text-high"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums text-text-high">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => changeQty(item.id, 1)}
                              className="p-1.5 text-text-medium transition-colors hover:text-text-high"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="w-16 text-right text-sm font-bold tabular-nums text-text-high">
                            ${(item.price * item.qty).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-text-low transition-colors hover:text-danger"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-text-medium">Total</span>
                  <span className="font-display text-2xl font-black text-text-high">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <button
                  disabled={cart.length === 0}
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full rounded-lg bg-primary py-3 font-display font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  )
}
