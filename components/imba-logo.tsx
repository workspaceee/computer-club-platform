import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImbaLogoProps {
  size?: 'sm' | 'lg'
  showText?: boolean
  className?: string
}

/**
 * Official IMBA Cyber Club identity.
 * /imba-mark.webp     — mascot shield (512x616, alpha)
 * /imba-wordmark.webp — IMBA / CYBER CLUB lettering (1024x549, alpha)
 *
 * The intrinsic ratios below are still written as the original PNG dimensions:
 * they are the *proportions* the layout maths needs, and F7.4's width cap
 * preserved them exactly (512/616 === 732/880).
 */
export function ImbaLogo({ size = 'sm', showText = true, className }: ImbaLogoProps) {
  const h = size === 'lg' ? 96 : 36
  const markW = Math.round(h * (732 / 880))
  const wordH = Math.round(h * 0.66)
  const wordW = Math.round(wordH * (1182 / 634))

  return (
    <div className={cn('flex items-center', size === 'lg' ? 'gap-4' : 'gap-2.5', className)}>
      <div
        className="relative shrink-0 drop-shadow-[0_0_14px_rgba(229,53,43,0.4)]"
        style={{ width: markW, height: h }}
      >
        <Image
          src="/imba-mark.webp"
          // One accessible name per logo (F7.4). With the wordmark visible the
          // shield is the decorative half of a single composite mark; naming
          // both would make a screen reader read the club twice in a row.
          alt={showText ? '' : 'IMBA Cyber Club'}
          aria-hidden={showText || undefined}
          fill
          sizes={`${markW}px`}
          className="object-contain"
          priority={size === 'lg'}
        />
      </div>
      {showText && (
        <div className="relative shrink-0" style={{ width: wordW, height: wordH }}>
          <Image
            src="/imba-wordmark.webp"
            alt="IMBA Cyber Club"
            fill
            sizes={`${wordW}px`}
            className="object-contain"
            priority={size === 'lg'}
          />
        </div>
      )}
    </div>
  )
}
