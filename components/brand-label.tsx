'use client'

import { motion } from 'framer-motion'

import { AssetImage } from '@/components/ui/asset-image'

/**
 * Small corner signature for the two unattended screens (lock + attract).
 *
 * Both screens used to open with the lockup as a hero element in the top-left.
 * On the current backdrop that fought the neon sign painted into the photograph
 * itself — the club name was on screen twice, once as art and once as chrome —
 * and it spent the strongest corner of the layout on something nobody reads
 * twice. Demoted to a label in the bottom-right: still a claim of ownership on
 * an idle machine, no longer competing with the clock for first read.
 *
 * The box is `2.2:1` because that is the lockup's real aspect (`1024x463`). The
 * old call sites declared boxes near `5.5:1`, so `object-contain` letterboxed
 * them and the art rendered at barely half the declared width — sizing to the
 * true ratio is why this reads deliberate rather than shrunken.
 */
export function BrandLabel({
  className = '',
  /**
   * Whether this instance is the thing that names the club to a screen reader
   * (F7.4). The lock screen has no other mention, so it names it. The attract
   * screen's own `aria-label` already does, and repeating it there would read
   * "IMBA Cyber Club" ahead of "move the mouse to unlock".
   */
  named = true,
}: {
  className?: string
  named?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
      className={`neon-logo pointer-events-none relative h-9 w-20 opacity-80 md:h-10 md:w-[88px] ${className}`}
    >
      <AssetImage
        src="/imba-logo-full.webp"
        alt={named ? 'IMBA Cyber Club' : ''}
        priority
        sizes="88px"
        className="object-contain object-right"
        fallback="none"
      />
    </motion.div>
  )
}
