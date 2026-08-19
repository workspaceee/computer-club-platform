'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

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

  // No "has it decoded yet" state any more: the image is painted at full opacity
  // the moment the browser has it. Tracking the decoded path only ever existed to
  // drive the opacity ramp this component no longer runs, and it carried its own
  // failure mode — a file already complete in cache fires no `load` event, so a
  // second visit could leave the art transparent forever.

  if (broken) {
    if (fallback === 'none') return null
    if (fallback === 'plate') return <FallbackPlate sizes={sizes} className={className} />
    return <>{fallback}</>
  }

  const blur = blurFor(src)

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
      onError={() => {
        setFailed(true)
        setFailedSrc(src)
      }}
      // The art paints the instant it decodes — no ramp, no blur-up.
      //
      // This used to hold the image at `opacity-0` and fade it in over 500 ms.
      // On a shelf of sixty-seven covers that read as the whole grid dissolving
      // into place, and worse: every tile the player scrolled past was mid-fade,
      // so the art looked soft and unfinished for half a second exactly when they
      // were deciding what to click. The designed layer underneath (the cover's
      // own gradient, the product card's icon) already fills the decode window,
      // so there is nothing for a transition to cover — the honest behaviour is
      // a crisp swap from the placeholder to the photograph.
      className={cn(className, 'opacity-100')}
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
