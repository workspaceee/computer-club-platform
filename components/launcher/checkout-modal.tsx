'use client'

import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, CreditCard, Loader2, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { processPayment } from '@/lib/mock/api'
import { cartTotal, useStore } from '@/lib/store'

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
}

const onlyDigits = (v: string) => v.replace(/\D/g, '')

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const cart = useStore((s) => s.cart)
  const checkout = useStore((s) => s.checkout)
  const toast = useStore((s) => s.toast)

  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'form' | 'processing' | 'done'>('form')

  const total = cartTotal(cart)

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
    setStatus('processing')
    await processPayment()
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="tick-corners w-full max-w-md overflow-hidden rounded-xl border border-border-strong bg-surface-2"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <CreditCard size={18} className="text-primary" />
                <h3 className="font-display text-lg font-bold uppercase tracking-tight text-text-high">
                  Checkout
                </h3>
              </div>
              <button
                onClick={close}
                disabled={status === 'processing'}
                className="text-text-low transition-colors hover:text-text-high disabled:opacity-40"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {status === 'done' ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <CheckCircle2 size={56} className="text-success" />
                <h4 className="font-display text-xl font-bold text-text-high">Payment successful!</h4>
                <p className="text-sm text-text-medium">
                  Receipt sent to your email. Enjoy your session.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between rounded-lg bg-black/25 px-4 py-3">
                  <span className="text-sm text-text-medium">Total</span>
                  <span className="font-display text-xl font-black text-text-high">
                    ${total.toFixed(2)}
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
                  disabled={!valid || status === 'processing'}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-display font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'processing' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Lock size={15} />
                      Pay ${total.toFixed(2)}
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-text-low">
                  Mock payment — no real card is charged.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-text-low">{label}</label>
      <div className="rounded-lg border border-border bg-black/20 px-3 py-2.5 focus-within:border-primary">
        {children}
      </div>
    </div>
  )
}
