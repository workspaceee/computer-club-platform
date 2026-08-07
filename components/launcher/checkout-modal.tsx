'use client'

import confetti from 'canvas-confetti'
import { icons } from '@/lib/icons'
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { useSalesGate } from '@/hooks/use-sales-gate'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { checkoutCart, toApiError } from '@/lib/mock/api'
import { formatEur } from '@/lib/money'
import { cartTotalCents, useStore } from '@/lib/store'

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
}

const onlyDigits = (v: string) => v.replace(/\D/g, '')

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const { t } = useT()
  const cart = useStore((s) => s.cart)
  const checkout = useStore((s) => s.checkout)
  const toast = useStore((s) => s.toast)

  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'form' | 'processing' | 'done'>('form')

  const totalCents = cartTotalCents(cart)

  /**
   * The gate, read *live* rather than at open time (C2.12).
   *
   * This dialog is the one surface that can be sitting open, with a card number
   * already typed into it, at the moment the link goes down: the drawer's button
   * was legitimately enabled when it was pressed. So the refusal has to be able to
   * arrive mid-form — the Pay button goes off under the player's hand, and `pay()`
   * checks again before it posts, because a click can beat a re-render.
   *
   * The form is *not* torn down and the fields are not cleared. The link comes
   * back in seconds and re-typing a card number is the rudest thing this dialog
   * could do; the only thing that stops is the charge.
   */
  const sales = useSalesGate()

  const valid =
    onlyDigits(card).length === 16 &&
    expiry.length === 5 &&
    cvc.length >= 3 &&
    name.trim().length > 1

  const reset = () => {
    setCard('')
    setExpiry('')
    setCvc('')
    setName('')
    setStatus('form')
  }

  const close = () => {
    if (status === 'processing') return
    reset()
    onClose()
  }

  const pay = async () => {
    if (!valid) return
    // The click that beat the re-render. Refused here rather than allowed to
    // reach the endpoint, and it says what the player needs to hear first —
    // nothing was charged. The transport refuses it too (`lib/mock/api/client.ts`),
    // so this is a courtesy with a better sentence, not the safety net.
    if (!sales.canSpend) {
      toast('error', t('realtime.salesRefused'))
      return
    }
    setStatus('processing')
    try {
      // The basket posts ids and quantities only — the server prices it, charges
      // the card and turns passes into minutes plus bar items into an order.
      await checkoutCart(
        cart.map((item) => ({ productId: item.id, qty: item.qty })),
        'card',
      )
    } catch (err) {
      setStatus('form')
      // The API returns a code, the UI decides the wording (F2.2).
      toast('error', t(`errors.${toApiError(err).code}` as TKey))
      return
    }
    setStatus('done')
    confetti({
      particleCount: 140,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e5352b', '#ffffff', '#c0c6cc', '#31b696'],
    })
    setTimeout(() => {
      checkout()
      toast('success', 'Balance updated. Receipt sent to your email.')
      reset()
      onClose()
    }, 2200)
  }

  return (
    // `Modal`, not a bare `Overlay` (F1.8/F6.7). The dialog used to be a plain
    // `motion.div` inside the overlay frame, which meant the *payment* form — the
    // one surface where a stray keystroke costs money — had no dialog role, no
    // `aria-modal`, no focus trap and no Escape. Tab walked straight out of it
    // into the cart drawer and the shop grid behind that. Verified in the browser
    // before this change: with the cart and this form both open the document held
    // zero `role="dialog"` nodes.
    //
    // Escape ordering now comes from the shared layer stack rather than render
    // order: this dialog is pushed after the drawer that raised it, so it is the
    // topmost layer and answers Escape alone.
    <Modal
      open={open}
      onClose={close}
      eyebrow={<icons.payment size={14} aria-hidden />}
      title={t('shop.checkout')}
      // A click outside or an Escape must not abandon an in-flight charge, and
      // during processing that also hides the close button.
      dismissable={status !== 'processing'}
      hideClose={status === 'processing'}
      // A card form is the worst case for a short window: at 693px tall the
      // total, four fields and the Pay button do not fit at once. The cap lives
      // in `Modal`; only the narrower width is ours.
      className="max-w-md"
    >
      <>
            {status === 'done' ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto py-6 text-center">
                <icons.success size={56} className="text-success" aria-hidden />
                {/* The result has to reach a screen reader that is not looking at
                    the tick: the region announces itself when the state flips. */}
                <div role="status" aria-live="polite">
                  <h4 className="font-display text-xl font-bold text-text-high">
                    Payment successful!
                  </h4>
                  <p className="text-sm text-text-medium">
                    Receipt sent to your email. Enjoy your session.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                {/* Grouped total — recessed into the dialog (`well-shallow`, §3.3). */}
                <div className="well-shallow flex items-center justify-between rounded-lg px-4 py-3">
                  <span className="text-sm text-text-medium">{t('shop.total')}</span>
                  <span className="font-display text-xl font-black text-text-high">
                    {formatEur(totalCents)}
                  </span>
                </div>

                <CardField label="Card number">
                  <input
                    value={card}
                    onChange={(e) =>
                      setCard(
                        onlyDigits(e.target.value)
                          .slice(0, 16)
                          .replace(/(.{4})/g, '$1 ')
                          .trim(),
                      )
                    }
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    className="w-full bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
                  />
                </CardField>

                <div className="grid grid-cols-2 gap-3">
                  <CardField label="Expiry">
                    <input
                      value={expiry}
                      onChange={(e) => {
                        const d = onlyDigits(e.target.value).slice(0, 4)
                        setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                      }}
                      placeholder="12/28"
                      inputMode="numeric"
                      className="w-full bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
                    />
                  </CardField>
                  <CardField label="CVC">
                    <input
                      value={cvc}
                      onChange={(e) => setCvc(onlyDigits(e.target.value).slice(0, 4))}
                      placeholder="123"
                      inputMode="numeric"
                      className="w-full bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
                    />
                  </CardField>
                </div>

                <CardField label="Name on card">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Player"
                    className="w-full bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
                  />
                </CardField>

                <button
                  onClick={pay}
                  disabled={!valid || status === 'processing' || !sales.canSpend}
                  aria-busy={status === 'processing'}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-display font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'processing' ? (
                    <>
                      <icons.pending size={18} className="animate-spin" aria-hidden />
                      {/* A spinner is not an accessible name: without this the
                          button announces itself as "button, busy" and nothing
                          says what is being waited on. */}
                      <span className="sr-only">{t('common.loading')}</span>
                    </>
                  ) : (
                    <>
                      <icons.lock size={15} aria-hidden />
                      Pay {formatEur(totalCents)}
                    </>
                  )}
                </button>
                {/* Why the button is dead, said next to the button — a greyed-out
                    "Pay €12.40" with a filled-in card form above it and no
                    explanation is indistinguishable from a broken checkout.
                    `role="status"`: it can appear while the player is looking at
                    the form, so it has to announce itself. */}
                {!sales.canSpend && (
                  <p
                    role="status"
                    className="text-pretty text-center text-xs leading-relaxed text-warning"
                  >
                    {sales.reason === 'closed'
                      ? t('shop.closedCheckoutHint')
                      : `${t('realtime.salesTitle')} — ${t('realtime.salesHint')}`}
                  </p>
                )}
                <p className="text-center text-xs text-text-low">
                  Mock payment — no real card is charged.
                </p>
              </div>
            )}
      </>
    </Modal>
  )
}

/**
 * A field whose `<label>` *wraps* the input.
 *
 * It used to be a sibling `<label>` with no `htmlFor`, which associates with
 * nothing: all four inputs announced themselves as bare text boxes and only the
 * placeholder hinted at what to type — on the one form in the product that takes
 * card details. Wrapping is the fix that needs no id plumbing through
 * `children`.
 */
function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-text-low">{label}</span>
      {/* An input frame is a `well` (§3.3) — the same recess `Field` uses, so a
          card number does not read as a shallower hole than an email. */}
      <div className="well rounded-lg border border-border px-3 py-2.5 focus-within:border-primary focus-within:well-deep">
        {children}
      </div>
    </label>
  )
}
