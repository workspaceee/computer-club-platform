'use client'

import type { LucideIcon } from '@/lib/icons'

import { AssetImage } from '@/components/ui/asset-image'
import { cn } from '@/lib/utils'

interface ProductImageProps {
  /**
   * `Product.image` verbatim. An empty string is a legitimate value — a time
   * pass and a membership tier have nothing to photograph — and is rendered as
   * the icon without ever requesting a file.
   */
  src: string
  /** Product name. Used only to build the alt text. */
  alt: string
  /** Drawn when `src` is empty or the file fails to load. */
  fallbackIcon: LucideIcon
  /** Tints the icon fallback to match a highlighted card. */
  highlight?: boolean
  /** Sets the box. Must carry a concrete size — the image fills its parent. */
  className?: string
  /** Passed to `next/image`; every caller renders this at a different width. */
  sizes?: string
}

/**
 * Product artwork with an icon underneath (F7.2).
 *
 * The counterpart to `GameCover`, and it exists for the same reason: the image
 * layer can be absent for perfectly ordinary rows, so the fallback has to be a
 * real state rather than a broken `img`. Two distinct cases collapse into one
 * visual here:
 *
 *  - `src === ''` — the category ships no photography. No request is made.
 *  - a load error — a file was expected and did not arrive.
 *
 * Both are handled by `AssetImage` (F7.5) rather than here: this component's job
 * shrank to picking *which* fallback the category deserves, and for a 56px
 * thumbnail that is the category icon, not the shared 16:9 plate. The icon is
 * also why there is no blur data for `products/` — it is painted before the
 * request starts and covers the decode window on its own.
 *
 * The box is always square and always sized by the caller, so a card's height is
 * decided before any image resolves. That is what keeps the grid's layout shift
 * at zero while 37 thumbnails stream in.
 */
export function ProductImage({
  src,
  alt,
  fallbackIcon: Icon,
  highlight,
  className,
  sizes = '56px',
}: ProductImageProps) {
  return (
    <div
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden rounded-md border',
        highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface-2',
        className,
      )}
    >
      <AssetImage
        src={src}
        // The card writes the product name in its own `h3` directly beside this,
        // so the art is decorative — an alt repeating it would read every
        // product twice.
        alt=""
        sizes={sizes}
        className="object-cover"
        fallback={
          <Icon
            size={22}
            className={highlight ? 'text-primary' : 'text-text-medium'}
            aria-hidden
          />
        }
      />
    </div>
  )
}
