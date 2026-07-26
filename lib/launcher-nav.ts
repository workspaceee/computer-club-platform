/**
 * Launcher navigation map (F6.2).
 *
 * One table describes every section of the client: its label key, icon, section
 * number, where it appears (top bar / avatar menu / mobile bar), whether the
 * PostPaid guest surface may see it, and — while Stage 1 is in flight — which
 * task still has to build it. `top-bar.tsx`, `mobile-nav.tsx` and `launcher.tsx`
 * all read from here, so a section can never appear in one place and be missing
 * in another.
 */
import {
  Gamepad2,
  Home,
  LifeBuoy,
  ShoppingBag,
  Swords,
  Trophy,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { TKey } from '@/lib/i18n/types'

/**
 * Top-level surface of the client (F6.2).
 *
 * `guest` is the PostPaid walk-in surface of Stage 2: the *same* launcher shell
 * with a smaller navigation set and an open tab instead of a wallet, so it is a
 * live value from day one rather than a placeholder route.
 *
 * F6.8 — decided: **no `kiosk` value.** The idle/marketing state is the lock
 * screen in attract-mode (`C1.8`), not a separate surface. Adding `kiosk` here
 * would leave a value nothing can ever render (docs/PLAN.md §F6.8).
 */
export type Screen = 'lock' | 'launcher' | 'guest'

/** Surfaces built on the launcher shell. `lock` is not one of them. */
export type LauncherSurface = Exclude<Screen, 'lock'>

/**
 * Sections of the launcher (F6.2). Numbering `01…09` below is the order players
 * see; this module is the single source of truth for labels, icons, placement
 * and guest availability.
 */
export type LauncherView =
  | 'home'
  | 'games'
  | 'shop'
  | 'rewards'
  | 'tournaments'
  | 'social'
  | 'wallet'
  | 'profile'
  | 'help'

export interface LauncherNavItem {
  id: LauncherView
  /** Two-digit section number used by `SectionHeader` and the top bar. */
  index: string
  labelKey: TKey
  icon: LucideIcon
  /** `primary` sits in the top bar, `menu` lives in the avatar dropdown. */
  slot: 'primary' | 'menu'
  /** Part of the five-slot mobile bottom bar. */
  mobile: boolean
  /** Surfaces allowed to open the section. Guests have no wallet or profile. */
  surfaces: LauncherSurface[]
  /**
   * Stage 1 task that implements the screen. Present = not built yet, the shell
   * renders `PendingView` instead of faking content.
   */
  pendingTask?: string
}

export const LAUNCHER_NAV: LauncherNavItem[] = [
  {
    id: 'home',
    index: '01',
    labelKey: 'nav.home',
    icon: Home,
    slot: 'primary',
    mobile: true,
    surfaces: ['launcher', 'guest'],
  },
  {
    id: 'games',
    index: '02',
    labelKey: 'nav.games',
    icon: Gamepad2,
    slot: 'primary',
    mobile: true,
    surfaces: ['launcher', 'guest'],
  },
  {
    id: 'shop',
    index: '03',
    labelKey: 'nav.shop',
    icon: ShoppingBag,
    slot: 'primary',
    mobile: true,
    surfaces: ['launcher', 'guest'],
  },
  {
    id: 'rewards',
    index: '04',
    labelKey: 'nav.rewards',
    icon: Trophy,
    slot: 'primary',
    mobile: true,
    surfaces: ['launcher'],
    pendingTask: 'C8',
  },
  {
    id: 'tournaments',
    index: '05',
    labelKey: 'nav.tournaments',
    icon: Swords,
    slot: 'primary',
    mobile: false,
    surfaces: ['launcher'],
    pendingTask: 'C10',
  },
  {
    id: 'social',
    index: '06',
    labelKey: 'nav.social',
    icon: Users,
    slot: 'primary',
    mobile: false,
    surfaces: ['launcher'],
    pendingTask: 'C9',
  },
  {
    id: 'wallet',
    index: '07',
    labelKey: 'nav.wallet',
    icon: Wallet,
    slot: 'menu',
    mobile: false,
    surfaces: ['launcher'],
    pendingTask: 'C7',
  },
  {
    id: 'profile',
    index: '08',
    labelKey: 'nav.profile',
    icon: User,
    slot: 'menu',
    mobile: true,
    surfaces: ['launcher'],
  },
  {
    id: 'help',
    index: '09',
    labelKey: 'nav.help',
    icon: LifeBuoy,
    slot: 'menu',
    mobile: false,
    surfaces: ['launcher', 'guest'],
    pendingTask: 'C11',
  },
]

const BY_ID = new Map(LAUNCHER_NAV.map((item) => [item.id, item]))

export const navItem = (id: LauncherView): LauncherNavItem => {
  const item = BY_ID.get(id)
  if (!item) throw new Error(`Unknown launcher view: ${id}`)
  return item
}

export const isLauncherView = (value: unknown): value is LauncherView =>
  typeof value === 'string' && BY_ID.has(value as LauncherView)

/** Sections a surface may open, in navigation order. */
export const navFor = (surface: LauncherSurface): LauncherNavItem[] =>
  LAUNCHER_NAV.filter((item) => item.surfaces.includes(surface))

export const canOpen = (surface: LauncherSurface, id: LauncherView): boolean =>
  navItem(id).surfaces.includes(surface)

/**
 * Keeps navigation honest when a surface cannot show the requested section —
 * a guest landing on `wallet`, for example, falls back to `home` instead of
 * rendering an empty frame.
 */
export const resolveView = (surface: LauncherSurface, id: LauncherView): LauncherView =>
  canOpen(surface, id) ? id : 'home'
