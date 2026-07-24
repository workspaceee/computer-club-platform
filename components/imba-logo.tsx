import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImbaLogoProps {
  size?: 'sm' | 'lg'
  showText?: boolean
  className?: string
}

const MARK = {
  sm: 34,
  lg: 96,
}

export function ImbaLogo({ size = 'sm', showText = true, className }: ImbaLogoProps) {
  const markSize = MARK[size]
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="relative shrink-0 drop-shadow-[0_0_12px_rgba(229,53,43,0.45)]"
        style={{ width: markSize, height: markSize }}
      >
        <Image
          src="/imba-mark.png"
          alt="IMBA Cyber Club mascot mark"
          fill
          sizes={`${markSize}px`}
          className="object-contain"
          priority={size === 'lg'}
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display font-extrabold tracking-tight text-text-high',
              size === 'lg' ? 'text-5xl' : 'text-xl',
            )}
          >
            IMBA
          </span>
          <span
            className={cn(
              'font-display font-semibold uppercase tracking-[0.32em] text-primary',
              size === 'lg' ? 'text-sm mt-1' : 'text-[9px] mt-0.5',
            )}
          >
            Cyber Club
          </span>
        </div>
      )}
    </div>
  )
}
