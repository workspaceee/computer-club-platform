import { cn } from '@/lib/utils'
import type { Game } from '@/lib/types'

interface GameCoverProps {
  game: Game
  className?: string
  titleClassName?: string
}

/** Stylized gradient art-cover placeholder with bold game title typography. */
export function GameCover({ game, className, titleClassName }: GameCoverProps) {
  const [from, to] = game.cover
  const initials = game.name
    .split(/[\s:]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className={cn('relative flex items-end overflow-hidden', className)}
      style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 85%)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <span
        className="pointer-events-none absolute -right-2 top-1 select-none font-display text-7xl font-black leading-none text-white/10"
        aria-hidden
      >
        {initials}
      </span>
      <div className="relative z-10 p-3">
        <h3
          className={cn(
            'font-display font-extrabold uppercase leading-tight tracking-tight text-white drop-shadow-md',
            titleClassName ?? 'text-base',
          )}
        >
          {game.name}
        </h3>
      </div>
    </div>
  )
}
