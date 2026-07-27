'use client'

import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

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
 *  - `onError` — a file was expected and did not arrive. The `img` is unmounted
 *    so the browser's own "broken image" glyph never paints over the icon.
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
  const [failed, setFailed] = useState(false)
  const showImage = src !== '' && !failed

  return (
    <div
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden rounded-md border',
        highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface-2',
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src}
          // The card writes the product name in its own `h3` directly beside
          // this, so the art is decorative — an alt repeating it would read
          // every product twice.
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <Icon
          size={22}
          className={highlight ? 'text-primary' : 'text-text-medium'}
          aria-hidden
        />
      )}
    </div>
  )
}
