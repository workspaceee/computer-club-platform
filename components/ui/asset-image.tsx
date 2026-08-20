'use client'

import Image from 'next/image'
import { useCallback, useState, type ReactNode } from 'react'

import { FALLBACK_ASSET, blurFor } from '@/lib/assets/blur'
import { cn } from '@/lib/utils'

interface AssetImageProps {
  /**
   * Public path of the asset. An empty string is a legitimate value — a
   * membership tier has nothing to photograph, a campaign may ship without art —
   * and resolves to the fallback without ever issuing a request.
   */
  src: string
  /**
   * Accessible name, or `''` for decorative art. Required, never optional: §13.7
   * of docs/DESIGN.md makes the decision explicit at every call site, and `''`
   * additionally sets `aria-hidden` here so an empty name cannot leak an
   * unlabelled node into the tree.
   */
  alt: string
  /** Responsive hint for `next/image`. Required — every surface renders at its own width. */
  sizes: string
  /** Applied to the `img`. The box is the parent's job; this component fills it. */
  className?: string
  /** Above-the-fold art only (lock screen, first hero slide). */
  priority?: boolean
  /**
   * What to draw when `src` is empty or the file fails to load.
   *
   *   - a node — the surface has a designed empty state (gradient + initials on a
   *     game tile, a category icon on a product card, initials in an avatar).
   *   - `'plate'` — the surface *is* the image, so it gets `FALLBACK_ASSET`.
   *   - `'none'` — the layers underneath are already sufficient, and stretching a
   *     plate over them would be worse than the colour they paint.
   */
  fallback: ReactNode | 'plate' | 'none'
}

/**
 * The one image primitive in the product (F7.5).
 *
 * Two guarantees, and they are the reason every surface goes through here rather
 * than calling `next/image` directly:
 *
 * 1. **No broken picture, ever.** A failed request unmounts the `img` and mounts
 *    the fallback in its place. Unmounting is the load-bearing half: leaving a
 *    failed `img` in the DOM paints the browser's own torn-page glyph *over*
 *    whatever the surface drew underneath, which is exactly the artefact F7.5
 *    exists to remove. An empty `src` takes the same path without a request.
 * 2. **No blank frame while decoding.** Where the image is the surface itself,
 *    a 16px LQIP (`lib/assets/blur.ts`) is painted and scaled up until the real
 *    file arrives. Where a designed layer already sits underneath, there is no
 *    LQIP by construction and that layer does the same job for free.
 * 3. **No hard pop.** That designed layer still has to hand over to the
 *    photograph, and switching it in on one frame is what makes a shelf feel
 *    like it is snapping together under the player. Art that was fetched over
 *    the wire ramps across 220 ms (`asset-fade`); art that was already decoded
 *    paints instantly, because fading in a file that is *already there* is what
 *    reads as slow. See `ramps` below for why blur and `priority` opt out.
 *
 * `pnpm assets:verify` enforces the funnel: `next/image` may not be imported
 * outside this file, so a new surface cannot quietly reintroduce a bare `img`.
 *
 * The component never sets a size. `fill` needs a positioned parent, and the
 * parent is where the aspect ratio belongs — that is what keeps CLS at zero
 * while thumbnails stream in.
 */
export function AssetImage({
  src,
  alt,
  sizes,
  className,
  priority,
  fallback,
}: AssetImageProps) {
  const [failed, setFailed] = useState(false)
  // A surface can swap `src` (carousel slide, changed avatar) and the new file
  // deserves its own attempt rather than inheriting the old one's failure.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = src === '' || (failed && failedSrc === src)

  /**
   * Which path has pixels on screen, and whether it had to be fetched to get
   * them. Keyed by `src` for the same reason the failure above is: a carousel
   * that swaps slides must ramp the *new* frame, not inherit the old one's
   * "already painted".
   */
  const [paint, setPaint] = useState<{ src: string; cached: boolean } | null>(null)

  /**
   * Catches the file that was **already decoded** when React attached.
   *
   * This is the load-bearing half of the ramp, and the exact bug that sank the
   * last attempt at one: a complete image fires no `load` event, so a component
   * that waits for `onLoad` before lighting the art leaves every cached cover
   * transparent *forever* on the second visit to a shelf. Reading `complete` in
   * the ref runs during commit — React re-renders before the browser paints, so
   * the tile is opaque on its first frame with no flash.
   *
   * `naturalWidth > 0` distinguishes "decoded" from "finished, empty" (a 404 is
   * `complete` too); that path is `onError`'s.
   */
  const adopt = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0) {
        setPaint((p) => (p?.src === src ? p : { src, cached: true }))
      }
    },
    [src],
  )

  if (broken) {
    if (fallback === 'none') return null
    if (fallback === 'plate') return <FallbackPlate sizes={sizes} className={className} />
    return <>{fallback}</>
  }

  const blur = blurFor(src)

  /**
   * Whether this image ramps in, and it is a narrow "yes" on purpose.
   *
   * Excluded, because in both cases a ramp makes things *worse*, not smoother:
   *
   *   - **`blur`** — `next/image` paints the LQIP as the `img`'s own
   *     `background-image`, so holding the element at `opacity-0` would hide the
   *     very placeholder that is covering the decode window. These families
   *     already crossfade blur→photo inside `next/image`; this must not fight it.
   *   - **`priority`** — the above-the-fold art (lock screen, first hero slide)
   *     is the LCP element. Delaying the largest paint in the product by 220 ms
   *     to make it prettier is the one trade that is never worth taking.
   *
   * What is left is exactly the lazy, gradient-backed art the player watches
   * stream in while scrolling a shelf — the case the ramp is for.
   */
  const ramps = !blur && !priority
  const state = paint?.src === src ? (paint.cached ? 'instant' : 'ramp') : 'pending'

  return (
    <Image
      src={src}
      alt={alt}
      aria-hidden={alt === '' || undefined}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={blur ? 'blur' : 'empty'}
      blurDataURL={blur}
      ref={ramps ? adopt : undefined}
      onLoad={
        ramps
          ? () => setPaint((p) => (p?.src === src ? p : { src, cached: false }))
          : undefined
      }
      onError={() => {
        setFailed(true)
        setFailedSrc(src)
      }}
      // `asset-fade` starts at `opacity-0` and `[data-paint]` releases it: a
      // 220 ms ramp for a file off the wire, an immediate hard paint for one that
      // was already decoded. The gradient (or icon) underneath is what the player
      // sees during `pending`, so nothing is ever blank — the ramp only softens
      // the hand-off between that designed layer and the photograph.
      data-paint={ramps ? state : undefined}
      className={cn(className, ramps ? 'asset-fade' : 'opacity-100')}
    />
  )
}

/**
 * The plate is a committed asset pinned by `assets:verify`, so it is present or
 * the build is broken. `onError` here is the last line anyway — if even this
 * cannot load (a mangled deploy), the plate resolves to flat `surface-2` rather
 * than to a torn-page glyph on the kiosk's main screen.
 */
function FallbackPlate({ sizes, className }: { sizes: string; className?: string }) {
  const [gone, setGone] = useState(false)

  if (gone) return <div aria-hidden className="absolute inset-0 bg-surface-2" />

  return (
    <Image
      src={FALLBACK_ASSET}
      alt=""
      aria-hidden
      fill
      sizes={sizes}
      placeholder="blur"
      blurDataURL={blurFor(FALLBACK_ASSET)}
      onError={() => setGone(true)}
      className={cn('object-cover', className)}
    />
  )
}
