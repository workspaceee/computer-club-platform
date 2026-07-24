'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Cpu,
  Eye,
  EyeOff,
  Fingerprint,
  Gauge,
  Loader2,
  Lock,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Wifi,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { AttractMode } from '@/components/attract-mode'
import { MockQr } from '@/components/mock-qr'
import { useIdle } from '@/hooks/use-idle'
import { login } from '@/lib/mock/api'
import { DEMO_USER } from '@/lib/mock/data'
import { useStore } from '@/lib/store'

type Mode = 'login' | 'register'

/** Idle time before the attract mode kicks in (ms). */
const IDLE_TIMEOUT_MS = 30_000

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
  const idle = useIdle(IDLE_TIMEOUT_MS)

  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  // login fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

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
    if (!rUser || !emailOk(rEmail) || rPass.length < 6 || rPass !== rConfirm) {
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

  const switchMode = (m: Mode) => {
    setMode(m)
    setTouched(false)
  }

  const timeStr = now
    ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--'
  const secStr = now ? String(now.getSeconds()).padStart(2, '0') : '--'
  const dateStr = now
    ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="relative flex h-full min-h-dvh w-full overflow-hidden bg-black">
      {/* ------- cinematic backdrop ------- */}
      <div className="absolute inset-0">
        <Image
          src="/lock-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
      </div>
      {/* readability overlays: cool the red cast, darken globally, deepen toward edges */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0" style={{ background: 'rgba(8,10,18,0.35)' }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,6,10,0.6) 0%, rgba(5,6,10,0.12) 45%, rgba(5,6,10,0.78) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,6,10,0.55) 0%, transparent 25%, transparent 70%, rgba(5,6,10,0.7) 100%)',
        }}
      />
      <ParticleField />

      {/* =================== LEFT — station identity =================== */}
      <div className="relative z-10 hidden flex-1 flex-col justify-between p-10 lg:flex xl:p-14">
        {/* real full logo lockup */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative h-16 w-[360px] xl:h-20 xl:w-[430px]"
        >
          <Image
            src="/imba-logo-full.png"
            alt="IMBA Cyber Club"
            fill
            priority
            sizes="430px"
            className="object-contain object-left drop-shadow-[0_0_24px_rgba(229,53,43,0.3)]"
          />
        </motion.div>

        {/* giant clock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="flex flex-col gap-3"
        >
          <span className="label-mono flex items-center gap-2 text-[11px] text-primary">
            <span className="h-px w-8 bg-primary/60" />
            Local time
          </span>
          <div className="flex items-end gap-3">
            <span className="font-display text-[7rem] font-bold leading-[0.85] tracking-tighter tabular-nums text-text-high xl:text-[9rem]">
              {timeStr}
            </span>
            <span className="mb-2 font-display text-2xl font-semibold tabular-nums text-primary xl:mb-3 xl:text-3xl">
              :{secStr}
            </span>
          </div>
          <span className="text-lg text-text-medium">{dateStr}</span>
        </motion.div>

        {/* telemetry strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-wrap items-center gap-3"
        >
          <StationBadge />
          <Telemetry icon={<Wifi size={13} />} label="Ping" value="4 ms" />
          <Telemetry icon={<Gauge size={13} />} label="Display" value="240 Hz" />
          <Telemetry icon={<Cpu size={13} />} label="GPU" value="RTX 4080" />
          <Telemetry icon={<Activity size={13} />} label="Status" value="Optimal" accent />
        </motion.div>
      </div>

      {/* =================== RIGHT — access terminal =================== */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-10 lg:w-[44%] lg:min-w-[480px] lg:px-12">
        {/* compact identity for mobile */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-8 h-14 w-72 lg:hidden"
        >
          <Image
            src="/imba-logo-full.png"
            alt="IMBA Cyber Club"
            fill
            priority
            sizes="288px"
            className="object-contain drop-shadow-[0_0_20px_rgba(229,53,43,0.35)]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={
            shake
              ? { x: [0, -10, 10, -8, 8, -4, 4, 0], opacity: 1, y: 0 }
              : idle
                ? { opacity: 0, y: 56, scale: 0.9, x: 0 }
                : { opacity: 1, y: 0, x: 0, scale: 1 }
          }
          transition={
            shake
              ? { duration: 0.5 }
              : idle
                ? { duration: 0.6, ease: 'easeIn' }
                : { duration: 0.7, delay: 0.1, ease: 'easeOut' }
          }
          className={`hud-frame relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0a0b10]/80 shadow-[0_32px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${idle ? 'pointer-events-none' : ''}`}
        >
          {/* HUD corner ticks */}
          <span className="hud-c hud-tl" aria-hidden />
          <span className="hud-c hud-tr" aria-hidden />
          <span className="hud-c hud-bl" aria-hidden />
          <span className="hud-c hud-br" aria-hidden />

          {/* subtle top accent line */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(229,53,43,0.8) 50%, transparent)',
            }}
          />

          {/* ------- card header : access terminal ------- */}
          <div className="relative z-[2] px-7 pt-7">
            <div className="flex items-center justify-between">
              <span className="label-mono flex items-center gap-2 text-[10px] text-primary">
                <ShieldCheck size={12} />
                Access Terminal
              </span>
              <span className="label-mono flex items-center gap-1.5 text-[10px] text-text-low">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                PC-17 · Online
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-5"
              >
                <h1 className="font-display text-[2.1rem] font-bold uppercase leading-[0.95] tracking-tight text-text-high text-balance">
                  {mode === 'login' ? (
                    <>
                      Welcome{' '}
                      <span className="text-glow text-primary">back</span>
                    </>
                  ) : (
                    <>
                      Join the{' '}
                      <span className="text-glow text-primary">club</span>
                    </>
                  )}
                  <span className="caret-blink ml-1 font-normal text-primary">_</span>
                </h1>
                <p className="mt-2.5 text-sm leading-relaxed text-text-medium">
                  {mode === 'login'
                    ? 'Authenticate to unlock your station and start the session.'
                    : 'Create your IMBA player profile in under a minute.'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ------- mode switch : segmented tabs ------- */}
            <div className="mt-6 grid grid-cols-2 rounded-lg border border-border bg-black/40 p-1">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative rounded-md py-2 font-display text-xs font-semibold uppercase tracking-widest transition-colors ${
                    mode === m ? 'text-text-high' : 'text-text-low hover:text-text-medium'
                  }`}
                  aria-pressed={mode === m}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-md border border-primary/40 bg-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(229,53,43,0.18)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                  <span className="relative z-[1]">{m === 'login' ? 'Sign in' : 'Register'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ------- form body ------- */}
          <div className="relative z-[2] p-7 pt-5">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleLogin}
                  className="flex flex-col gap-4"
                >
                  <Field
                    label="Username or email"
                    icon={<User size={15} />}
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder="player@imba.club"
                    error={touched ? loginErrors.identifier : undefined}
                    autoFocus
                  />
                  <Field
                    label="Password"
                    icon={<Lock size={15} />}
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

                  <PrimaryButton loading={loading} label="Unlock Station" />

                  <div className="my-1 flex items-center gap-3 text-text-low">
                    <span className="h-px flex-1 bg-border" />
                    <span className="label-mono text-[10px]">or continue with</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <SecondaryButton onClick={startQr} icon={<QrCode size={16} />} label="QR Login" />
                    <SecondaryButton onClick={demoLogin} icon={<Sparkles size={16} />} label="Demo" />
                    <SecondaryButton onClick={demoAdmin} icon={<UserCog size={16} />} label="Admin" />
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleRegister}
                  className="flex flex-col gap-4"
                >
                  <Field
                    label="Username"
                    icon={<User size={15} />}
                    value={rUser}
                    onChange={setRUser}
                    placeholder="ProGamer"
                    autoFocus
                  />
                  <Field
                    label="Email"
                    icon={<Mail size={15} />}
                    value={rEmail}
                    onChange={setREmail}
                    placeholder="you@imba.club"
                    error={touched && rEmail && !emailOk(rEmail) ? 'Enter a valid email' : undefined}
                  />
                  <div>
                    <Field
                      label="Password"
                      icon={<Lock size={15} />}
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
                    icon={<Fingerprint size={15} />}
                    type="password"
                    value={rConfirm}
                    onChange={setRConfirm}
                    placeholder="Repeat password"
                    error={touched && rConfirm && rConfirm !== rPass ? 'Passwords do not match' : undefined}
                  />

                  <PrimaryButton loading={loading} label="Create Account" />
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* ------- card footer strip ------- */}
          <div className="relative z-[2] flex items-center justify-between border-t border-border bg-black/30 px-7 py-3">
            <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
              <Lock size={10} className="text-success" />
              Encrypted session
            </span>
            <span className="label-mono text-[9px] text-text-low">IMBA-SHELL v2.4</span>
          </div>
        </motion.div>

        {/* mobile clock + station */}
        <div className="mt-8 flex items-center gap-4 lg:hidden">
          <span className="font-display text-3xl font-bold tabular-nums text-text-high">{timeStr}</span>
          <StationBadge />
        </div>
      </div>

      {/* Idle attract mode overlay */}
      <AnimatePresence>{idle && <AttractMode />}</AnimatePresence>

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
              className="glass-strong flex flex-col items-center gap-4 rounded-3xl p-8"
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

function StationBadge() {
  return (
    <span className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5">
      <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
      <span className="font-display text-sm font-bold tracking-wide text-text-high">PC #17</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-success">Ready</span>
    </span>
  )
}

function Telemetry({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5">
      <span className={accent ? 'text-success' : 'text-primary'}>{icon}</span>
      <span className="text-[10px] uppercase tracking-widest text-text-low">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-text-high">{value}</span>
    </span>
  )
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  trailing,
  autoFocus,
}: {
  label: string
  icon?: React.ReactNode
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
      <label className="label-mono text-[10px] text-text-low">{label}</label>
      <div
        className="flex items-center gap-2.5 rounded-lg border bg-black/40 px-3.5 transition-all focus-within:border-primary focus-within:bg-black/60 focus-within:shadow-[0_0_0_3px_rgba(229,53,43,0.14),0_0_24px_-6px_rgba(229,53,43,0.35)]"
        style={{ borderColor: error ? 'var(--danger)' : 'var(--border)' }}
      >
        {icon && <span className="shrink-0 text-text-low">{icon}</span>}
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
      className="group relative flex h-12 items-center justify-center gap-2 overflow-hidden bg-primary font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_0_24px_rgba(229,53,43,0.35)] transition-all hover:bg-primary-hover hover:shadow-[0_0_36px_rgba(229,53,43,0.55)] disabled:opacity-70 [clip-path:polygon(0_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%)]"
    >
      {/* sheen sweep on hover */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden
      />
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
      className="tick-corners flex flex-col items-center gap-1.5 rounded-md border border-border bg-white/[0.03] px-2 py-3 text-[11px] font-medium text-text-medium transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-text-high"
    >
      <span className="text-text-low transition-colors group-hover:text-primary">{icon}</span>
      {label}
    </button>
  )
}

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${(i * 53) % 100}%`,
        delay: (i % 6) * 1.2,
        duration: 9 + (i % 5),
        size: 2 + (i % 2),
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{ left: p.left, width: p.size, height: p.size, bottom: -10 }}
          animate={{ y: [0, -700], opacity: [0, 0.5, 0] }}
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
