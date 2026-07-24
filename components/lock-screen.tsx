'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserCog,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ImbaLogo } from '@/components/imba-logo'
import { MockQr } from '@/components/mock-qr'
import { login } from '@/lib/mock/api'
import { DEMO_USER } from '@/lib/mock/data'
import { useStore } from '@/lib/store'

type Mode = 'login' | 'register'

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function LockScreen() {
  const loginSuccess = useStore((s) => s.loginSuccess)
  const toast = useStore((s) => s.toast)
  const now = useClock()

  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  // login fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  // register fields
  const [rUser, setRUser] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPass, setRPass] = useState('')
  const [rConfirm, setRConfirm] = useState('')

  const [touched, setTouched] = useState(false)

  const loginErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (identifier && identifier.includes('@') && !emailOk(identifier))
      e.identifier = 'Enter a valid email address'
    if (password && password.length < 6) e.password = 'Minimum 6 characters'
    return e
  }, [identifier, password])

  const passStrength = useMemo(() => {
    let s = 0
    if (rPass.length >= 6) s++
    if (/[A-Z]/.test(rPass)) s++
    if (/[0-9]/.test(rPass)) s++
    if (/[^A-Za-z0-9]/.test(rPass)) s++
    return s
  }, [rPass])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!identifier || !password || Object.keys(loginErrors).length > 0) {
      triggerShake()
      return
    }
    setLoading(true)
    try {
      const user = await login({ identifier, password })
      toast('success', `Welcome back, ${user.nickname}!`)
      loginSuccess(user)
    } catch (err) {
      setLoading(false)
      triggerShake()
      toast('error', (err as Error).message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (
      !rUser ||
      !emailOk(rEmail) ||
      rPass.length < 6 ||
      rPass !== rConfirm
    ) {
      triggerShake()
      return
    }
    setLoading(true)
    setTimeout(() => {
      toast('success', 'Account created! Signing you in...')
      setTimeout(() => loginSuccess({ ...DEMO_USER, nickname: rUser, email: rEmail }), 900)
    }, 1500)
  }

  const demoLogin = () => {
    setLoading(true)
    setTimeout(() => {
      toast('info', 'Entering demo mode')
      loginSuccess({ ...DEMO_USER, nickname: 'DemoPlayer' })
    }, 600)
  }

  const demoAdmin = () => {
    toast('info', 'Admin Panel is a separate app (out of scope for this prototype).')
  }

  const startQr = () => {
    setQrOpen(true)
    setTimeout(() => {
      setQrOpen(false)
      toast('success', 'QR verified via IMBA app!')
      loginSuccess({ ...DEMO_USER, nickname: 'MobileScan' })
    }, 4000)
  }

  const timeStr = now
    ? now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--'
  const dateStr = now
    ? now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="relative flex h-full min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* animated grid + glow */}
      <div className="imba-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <ParticleField />

      {/* top identity row */}
      <div className="absolute left-6 top-6 flex items-center gap-3">
        <span className="rounded-lg border border-border bg-surface px-3 py-1.5 font-display text-sm font-bold tracking-wide text-text-high">
          PC #17
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          READY
        </span>
      </div>

      <div className="absolute right-6 top-6 flex items-center gap-2 text-text-medium">
        <ShieldCheck size={16} className="text-primary" />
        <span className="text-xs font-medium">Kernel Lock Active</span>
      </div>

      {/* center content */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <ImbaLogo size="lg" showText={false} className="mb-4" />
        <h1 className="font-display text-4xl font-black tracking-tight text-text-high">
          IMBA<span className="text-primary">.</span>SHELL
        </h1>
        <p className="mb-6 mt-1 text-sm text-text-medium">
          Sign in to unlock your station
        </p>

        <motion.div
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full rounded-2xl border border-border bg-surface/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                onSubmit={handleLogin}
                className="flex flex-col gap-4"
              >
                <Field
                  label="Username or email"
                  value={identifier}
                  onChange={setIdentifier}
                  placeholder="player@imba.club"
                  error={touched ? loginErrors.identifier : undefined}
                  autoFocus
                />
                <Field
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="Type 'fail' to test errors"
                  error={touched ? loginErrors.password : undefined}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="text-text-low transition-colors hover:text-text-high"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-text-medium">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Remember me
                </label>

                <PrimaryButton loading={loading} label="Sign In" />

                <div className="my-1 flex items-center gap-3 text-text-low">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] uppercase tracking-widest">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <SecondaryButton onClick={startQr} icon={<QrCode size={16} />} label="QR Login" />
                  <SecondaryButton onClick={demoLogin} icon={<Sparkles size={16} />} label="Demo" />
                  <SecondaryButton onClick={demoAdmin} icon={<UserCog size={16} />} label="Admin" />
                </div>

                <p className="text-center text-sm text-text-medium">
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register')
                      setTouched(false)
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Register account
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                onSubmit={handleRegister}
                className="flex flex-col gap-4"
              >
                <Field label="Username" value={rUser} onChange={setRUser} placeholder="ProGamer" autoFocus />
                <Field
                  label="Email"
                  value={rEmail}
                  onChange={setREmail}
                  placeholder="you@imba.club"
                  error={touched && rEmail && !emailOk(rEmail) ? 'Enter a valid email' : undefined}
                />
                <div>
                  <Field
                    label="Password"
                    type="password"
                    value={rPass}
                    onChange={setRPass}
                    placeholder="Min 6 characters"
                    error={touched && rPass && rPass.length < 6 ? 'Minimum 6 characters' : undefined}
                  />
                  {rPass && (
                    <div className="mt-2 flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            background:
                              i < passStrength
                                ? passStrength <= 1
                                  ? 'var(--danger)'
                                  : passStrength === 2
                                    ? 'var(--warning)'
                                    : 'var(--success)'
                                : 'rgba(255,255,255,0.1)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <Field
                  label="Confirm password"
                  type="password"
                  value={rConfirm}
                  onChange={setRConfirm}
                  placeholder="Repeat password"
                  error={touched && rConfirm && rConfirm !== rPass ? 'Passwords do not match' : undefined}
                />

                <PrimaryButton loading={loading} label="Create Account" />

                <p className="text-center text-sm text-text-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login')
                      setTouched(false)
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* bottom bar */}
      <div className="absolute bottom-6 left-6 flex flex-col">
        <span className="font-display text-3xl font-bold tabular-nums text-text-high">{timeStr}</span>
        <span className="text-sm text-text-medium">{dateStr}</span>
      </div>
      <div className="absolute bottom-6 right-6 text-right">
        <ImbaLogo size="sm" />
      </div>

      {/* QR modal */}
      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface-2 p-8"
            >
              <MockQr />
              <p className="font-display text-lg font-bold text-text-high">Scan with IMBA app</p>
              <p className="flex items-center gap-2 text-sm text-text-medium">
                <Loader2 size={14} className="animate-spin text-primary" />
                Waiting for confirmation...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  trailing,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  trailing?: React.ReactNode
  autoFocus?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-text-low">{label}</label>
      <div
        className="flex items-center gap-2 rounded-lg border bg-black/20 px-3 transition-colors focus-within:border-primary"
        style={{ borderColor: error ? 'var(--danger)' : 'var(--border)' }}
      >
        <input
          type={type}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-text-high outline-none placeholder:text-text-low"
        />
        {trailing}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

function PrimaryButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-display font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_20px_rgba(229,53,43,0.35)] transition-all hover:bg-primary-hover hover:shadow-[0_0_30px_rgba(229,53,43,0.55)] disabled:opacity-70"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : label}
    </button>
  )
}

function SecondaryButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-2.5 text-[11px] font-medium text-text-medium transition-colors hover:border-border-strong hover:bg-white/10 hover:text-text-high"
    >
      {icon}
      {label}
    </button>
  )
}

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 53) % 100}%`,
        delay: (i % 6) * 0.8,
        duration: 6 + (i % 5),
        size: 2 + (i % 3),
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/60"
          style={{ left: p.left, width: p.size, height: p.size, bottom: -10 }}
          animate={{ y: [0, -700], opacity: [0, 0.8, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
