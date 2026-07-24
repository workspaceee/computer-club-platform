import Image from 'next/image'
import { cn } from '@/lib/utils'

export type Icon3DName =
  | 'coin'
  | 'trophy'
  | 'controller'
  | 'bag'
  | 'crown'
  | 'timer'
  | 'rocket'
  | 'emblem'

const SRC: Record<Icon3DName, string> = {
  coin: '/icons/coin-3d.png',
  trophy: '/icons/trophy-3d.png',
  controller: '/icons/controller-3d.png',
  bag: '/icons/bag-3d.png',
  crown: '/icons/crown-3d.png',
  timer: '/icons/timer-3d.png',
  rocket: '/icons/rocket-3d.png',
  emblem: '/icons/emblem-3d.png',
}

interface Icon3DProps {
  name: Icon3DName
  size?: number
  className?: string
  glow?: boolean
  float?: boolean
  priority?: boolean
}

/** Glossy 3D-rendered premium icon with optional red glow + float animation. */
export function Icon3D({
  name,
  size = 40,
  className,
  glow = true,
  float = false,
  priority = false,
}: Icon3DProps) {
  return (
    <div
      className={cn('relative shrink-0', float && 'float-3d', className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(229,53,43,0.55), transparent 68%)',
          }}
        />
      )}
      <Image
        src={SRC[name] || '/placeholder.svg'}
        alt=""
        aria-hidden
        fill
        sizes={`${size}px`}
        className="object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]"
        priority={priority}
      />
    </div>
  )
}
