import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImbaLogoProps {
  size?: 'sm' | 'lg'
  showText?: boolean
  className?: string
}

/**
 * Official IMBA Cyber Club identity.
 * /imba-mark.png     — mascot shield (732x880)
 * /imba-wordmark.png — IMBA / CYBER CLUB lettering (1182x634)
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
          src="/imba-mark.png"
          alt="IMBA Cyber Club mascot"
          fill
          sizes={`${markW}px`}
          className="object-contain"
          priority={size === 'lg'}
        />
      </div>
      {showText && (
        <div className="relative shrink-0" style={{ width: wordW, height: wordH }}>
          <Image
            src="/imba-wordmark.png"
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
