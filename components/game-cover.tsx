import { cn } from '@/lib/utils'
import type { Game } from '@/lib/types/catalog'

interface GameCoverProps {
  game: Game
  className?: string
  titleClassName?: string
  /**
   * Drop the built-in title.
   *
   * The cover anchors its own `h3` to the bottom edge, which is right for a grid
   * tile but wrong wherever the surface already writes the name into its own
   * bottom-anchored copy block — there the two layers stack and the title lands
   * on top of the call to action (the home hero: a 60px "VALORANT" sitting over
   * "Play now"). Such callers own the heading; the cover stays pure art.
   */
  hideTitle?: boolean
}

/** Stylized gradient art-cover placeholder with bold game title typography. */
export function GameCover({ game, className, titleClassName, hideTitle }: GameCoverProps) {
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
      {!hideTitle && (
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
      )}
    </div>
  )
}
