import { AssetImage } from '@/components/ui/asset-image'
import { cn } from '@/lib/utils'

interface ImbaLogoProps {
  size?: 'sm' | 'lg'
  showText?: boolean
  /**
   * From which width the lettering is *printed* (C2.9).
   *
   * `always` (default) is every branded surface — the lock screen, the attract
   * loop, anything with room. `sm` is for the launcher's top bar: on a phone the
   * wordmark is ~55 px of a row that also has to carry the session clock and the
   * avatar menu, and the shield alone already says which club this is. Nothing is
   * lost to a screen reader either way, because the bar wraps the mark in a
   * button that carries its own name ("IMBA home").
   */
  textAt?: keyof typeof TEXT_AT
  className?: string
}

const TEXT_AT = {
  always: '',
  sm: 'hidden sm:block',
} as const

/**
 * Official IMBA Cyber Club identity.
 * /imba-mark.webp     — mascot shield (512x616, alpha)
 * /imba-wordmark.webp — IMBA / CYBER CLUB lettering (1024x549, alpha)
 *
 * The intrinsic ratios below are still written as the original PNG dimensions:
 * they are the *proportions* the layout maths needs, and F7.4's width cap
 * preserved them exactly (512/616 === 732/880).
 *
 * Both halves pass `fallback="none"` (F7.5): brand chrome gets no stand-in, since
 * a generic dark plate in the shape of a logo reads as a broken logo. An absent
 * mark next to intact lettering (or vice versa) degrades honestly, and the topbar
 * around it never loses its height either way.
 */
export function ImbaLogo({
  size = 'sm',
  showText = true,
  textAt = 'always',
  className,
}: ImbaLogoProps) {
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
        <AssetImage
          src="/imba-mark.webp"
          // One accessible name per logo (F7.4). With the wordmark visible the
          // shield is the decorative half of a single composite mark; naming
          // both would make a screen reader read the club twice in a row.
          alt={showText ? '' : 'IMBA Cyber Club'}
          sizes={`${markW}px`}
          className="object-contain"
          fallback="none"
          priority={size === 'lg'}
        />
      </div>
      {showText && (
        <div
          className={cn('relative shrink-0', TEXT_AT[textAt])}
          style={{ width: wordW, height: wordH }}
        >
          <AssetImage
            src="/imba-wordmark.webp"
            alt="IMBA Cyber Club"
            sizes={`${wordW}px`}
            className="object-contain"
            fallback="none"
            priority={size === 'lg'}
          />
        </div>
      )}
    </div>
  )
}
