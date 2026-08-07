'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons, type LucideIcon } from '@/lib/icons'
import { useEffect, useState } from 'react'
import { ApiErrorState } from '@/components/data-boundary'
import { AssetImage } from '@/components/ui/asset-image'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { fetchActivePromos } from '@/lib/mock/api'
import type { Promo, PromoKind } from '@/lib/types/promo'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Fallback mark per campaign type, so a banner whose art is missing (`image: ''`)
 * or still decoding is still recognisable as a tournament ad rather than an
 * empty red box.
 */
const KIND_ICONS: Record<PromoKind, LucideIcon> = {
  sale: icons.sale,
  tournament: icons.tournament,
  battlepass: icons.season,
  event: icons.calendar,
}

const ROTATE_MS = 7000

/**
 * Promo strip on Home (F7.3).
 *
 * Replaces the hardcoded "Double coins until 18:00" block: every banner now comes
 * from `GET /api/promos/active`, the same rows attract-mode reads, so the two
 * screens cannot advertise different offers on the same evening.
 *
 * Three deliberate choices:
 *
 *   • **The surface asks as a viewer, not as a filter.** A guest passes
 *     `viewer: 'everyone'` and the server returns fewer rows; the component never
 *     receives a members-only coin promo to hide in JSX. The SWR key carries the
 *     viewer, so switching surfaces refetches instead of reusing the member list.
 *   • **Rotation stops when the player engages.** Hover or keyboard focus holds
 *     the current slide — otherwise the CTA a player is reaching for is swapped,
 *     along with the section it opens, mid-click. Reduced motion stops rotation
 *     entirely and leaves the dots as the only way through.
 *   • **No campaign, no strip.** An empty list renders `null`. This is marketing,
 *     not data the player asked for, so an "Empty" placeholder would be noise —
 *     the error state is bare for the same reason.
 */
export function PromoStrip({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const viewer = surface === 'guest' ? 'everyone' : 'members'
  const setView = useStore((s) => s.setView)
  const reduced = useReducedMotion()

  const [index, setIndex] = useState(0)
  const [held, setHeld] = useState(false)
  const dotsRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })

  // `GET /api/promos/active?surface=home` (F7.3). The viewer is part of the key:
  // the guest surface must not read a cached members-only list.
  const promos = useApi(['promos/active', 'home', viewer], () =>
    fetchActivePromos('home', viewer),
  )
  const items: Promo[] = promos.data ?? []
  const count = items.length

  // A campaign can expire between refetches and shorten the list under us.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0)
  }, [count, index])

  useEffect(() => {
    if (count < 2 || held || reduced) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(timer)
  }, [count, held, reduced])

  if (promos.isLoading) return <Skeleton className="h-44 w-full rounded-xl md:h-40" />
  if (promos.error) return <ApiErrorState state={promos} bare size="sm" className="h-40" />
  if (count === 0) return null

  const promo = items[Math.min(index, count - 1)]
  const Icon = KIND_ICONS[promo.kind]

  return (
    <section
      aria-label="Promotions"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
      }}
      className="glass tick-corners relative overflow-hidden rounded-xl"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={promo.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.35 }}
          className="relative"
        >
          <AssetImage
            src={promo.image}
            alt=""
            // Decorative art behind DOM copy: the banner is never the largest
            // element on Home, so it stays lazy and out of the hero's way.
            sizes="(min-width: 1280px) 70vw, 100vw"
            className="object-cover object-right"
            // A campaign with no art is a real row (`image: ''`), and the badge,
            // headline and CTA below still have to sit on something — the plate
            // is what stops the strip from becoming a flat red-scrimmed void.
            fallback="plate"
          />
          {/* The art is framed dark on the left; this veil guarantees the
              contrast ratio there even if a future banner is not. It is a §3
              utility, not a gradient spelled out here (F9.7b) — the campaign
              art comes from the admin panel, so it passes the same pie. */}
          <div className="veil-promo-h absolute inset-0" />

          <div className="relative flex min-h-44 flex-col items-start justify-center gap-2 p-6 md:min-h-40 md:p-7">
            <span className="label-mono flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[10px] text-primary-foreground">
              <Icon size={12} />
              {promo.badge}
            </span>
            <h3 className="max-w-xl font-display text-2xl font-bold uppercase tracking-tight text-text-high text-balance md:text-3xl">
              {promo.title}
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-text-medium text-pretty">
              {promo.subtitle}
            </p>
            {/* `cta` and `target` are set or null together, so one check covers
                both and an informational campaign renders no button. */}
            {promo.cta !== null && promo.target !== null && (
              <button
                onClick={() => setView(promo.target as NonNullable<Promo['target']>)}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {promo.cta}
                <icons.forward size={14} />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div
          ref={dotsRef}
          role="group"
          aria-label="Promotions"
          className="absolute bottom-5 right-6 flex gap-1.5"
        >
          {items.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              aria-label={`Show promotion ${i + 1}: ${p.title}`}
              aria-current={i === index ? 'true' : undefined}
              data-roving-item
              className={cn(
                'h-1 rounded-full transition-all focus-visible:outline-offset-4',
                i === index
                  ? 'w-8 bg-primary shadow-[0_0_10px_rgba(229,53,43,0.9)]'
                  : 'w-1.5 bg-white/40',
              )}
            />
          ))}
        </div>
      )}

      {/* Rotation is a visual change with no DOM landmark of its own, so the
          slide is announced politely — the copy above is `aria-hidden`-free but
          swapped without a focus move, which a screen reader would otherwise
          miss entirely. */}
      <p className="sr-only" aria-live="polite">
        {`Promotion ${index + 1} of ${count}. ${promo.badge}. ${promo.title}. ${promo.subtitle}`}
      </p>
    </section>
  )
}
