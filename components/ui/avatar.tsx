import { cn } from '@/lib/utils'

/**
 * Avatar (F1.19).
 *
 * Initials-first: the club has no photo uploads on day one, so a deterministic
 * initials tile is the default and `src` is the optional upgrade path. The ring
 * encodes the loyalty tier (F1.1 tokens) and the corner dot encodes presence —
 * both are decorative-plus-labelled, never colour-only. See docs/DESIGN.md §1.
 */
const SIZE = {
  xs: { box: 'size-7', text: 'text-[10px]', dot: 'size-2', badge: 'text-[8px] px-1' },
  sm: { box: 'size-9', text: 'text-xs', dot: 'size-2.5', badge: 'text-[9px] px-1' },
  md: { box: 'size-12', text: 'text-sm', dot: 'size-3', badge: 'text-[9px] px-1.5' },
  lg: { box: 'size-16', text: 'text-lg', dot: 'size-3.5', badge: 'text-[10px] px-1.5' },
  xl: { box: 'size-24', text: 'text-2xl', dot: 'size-4', badge: 'text-xs px-2' },
} as const

/** Loyalty tiers — kept in one place so admin and launcher agree. */
export type AvatarTier = 'rookie' | 'regular' | 'veteran' | 'elite'

export function avatarTier(level?: number): AvatarTier {
  if (!level || level < 5) return 'rookie'
  if (level < 10) return 'regular'
  if (level < 20) return 'veteran'
  return 'elite'
}

const TIER: Record<AvatarTier, { ring: string; glow: string; badge: string; label: string }> = {
  rookie: {
    ring: 'ring-border-strong',
    glow: '',
    badge: 'bg-steel text-background',
    label: 'Rookie',
  },
  regular: {
    ring: 'ring-xp/70',
    glow: 'shadow-[0_0_18px_-6px_var(--xp)]',
    badge: 'bg-xp text-background',
    label: 'Regular',
  },
  veteran: {
    ring: 'ring-coin/80',
    glow: 'shadow-[0_0_20px_-6px_var(--coin)]',
    badge: 'bg-coin text-background',
    label: 'Veteran',
  },
  elite: {
    ring: 'ring-primary',
    glow: 'shadow-[0_0_24px_-5px_var(--primary)]',
    badge: 'bg-primary text-primary-foreground',
    label: 'Elite',
  },
}

export type PresenceStatus = 'online' | 'idle' | 'offline'

const PRESENCE: Record<PresenceStatus, { dot: string; label: string }> = {
  online: { dot: 'bg-success', label: 'Online' },
  idle: { dot: 'bg-warning', label: 'Idle' },
  offline: { dot: 'bg-steel-2', label: 'Offline' },
}

/** "Alexei Petrov" → "AP", "kotik" → "KO". Deterministic, never empty. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface AvatarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Display name — drives initials and the accessible label. */
  name: string
  /** Optional photo. Falls back to initials automatically if omitted. */
  src?: string
  size?: keyof typeof SIZE
  /** Loyalty level: colours the ring and (optionally) shows the level chip. */
  level?: number
  /** Render the numeric level chip under the avatar. */
  showLevel?: boolean
  /** Presence indicator. Omit for lists where presence is meaningless. */
  status?: PresenceStatus
  /** Square tile instead of a circle (used in dense admin tables). */
  square?: boolean
}

export function Avatar({
  name,
  src,
  size = 'md',
  level,
  showLevel = false,
  status,
  square = false,
  className,
  ...props
}: AvatarProps) {
  const s = SIZE[size]
  const tier = TIER[avatarTier(level)]
  const label = [
    name,
    level !== undefined ? `level ${level}` : null,
    status ? PRESENCE[status].label : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      data-slot="avatar"
      className={cn('relative inline-flex shrink-0', className)}
      role="img"
      aria-label={label}
      {...props}
    >
      <div
        className={cn(
          'grid place-items-center overflow-hidden bg-surface-2 ring-2 ring-offset-2 ring-offset-background',
          square ? 'rounded-md' : 'rounded-full',
          s.box,
          tier.ring,
          tier.glow,
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            aria-hidden
            className={cn(
              'font-display font-bold uppercase tracking-widest text-text-medium',
              s.text,
            )}
          >
            {initialsOf(name)}
          </span>
        )}
      </div>

      {status && (
        <span
          aria-hidden
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background',
            s.dot,
            PRESENCE[status].dot,
            status === 'online' && 'animate-pulse',
          )}
        />
      )}

      {showLevel && level !== undefined && (
        <span
          aria-hidden
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-sm py-0.5 font-display font-bold uppercase leading-none tracking-widest',
            s.badge,
            tier.badge,
          )}
        >
          {level}
        </span>
      )}
    </div>
  )
}
