'use client'

/**
 * Digit shortcuts for the launcher sections (F6.7).
 *
 * This is not a new affordance — it makes an existing one true. The top bar has
 * printed a section number next to every label since `F6.2` (`01 HOME`,
 * `02 GAMES`, …) and `SectionHeader` repeats it. Until now those numbers did
 * nothing: the UI was showing a keyboard map the keyboard did not honour, which
 * is worse than showing nothing.
 *
 * The table in `lib/launcher-nav.ts` stays the single source of truth, so the
 * shortcut set follows the surface for free: a guest pressing `7` gets nothing
 * because `wallet` is not in `navFor('guest')`, rather than being bounced off a
 * section that then folds back to home.
 *
 * Three guards, each for a way this would otherwise misfire on a kiosk:
 *
 *   • **A modifier means the browser or the OS is being addressed** (`Ctrl+1`
 *     switches tabs), never the launcher.
 *   • **Typing wins.** A digit typed into the library search box, a quantity
 *     field or the phone-number pad belongs to that field. Without this, typing
 *     "2" in search teleports the player out of the results they were filtering.
 *   • **An open layer owns the keyboard.** While a dialog, drawer or menu is up,
 *     jumping to another section behind it would leave the player confirming a
 *     purchase over a screen they can no longer see. `isLayerOpen()` is the same
 *     stack Escape uses, so the two keys can never disagree about what is on top.
 */

import { useEffect } from 'react'
import { isLayerOpen } from '@/hooks/use-dismissable-layer'
import { navFor, type LauncherSurface } from '@/lib/launcher-nav'
import { useStore } from '@/lib/store'

/** Does this element consume raw keystrokes? */
const isTextEntry = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
}

export function useNavShortcuts(surface: LauncherSurface) {
  const setView = useStore((s) => s.setView)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (!/^[1-9]$/.test(e.key)) return
      if (isTextEntry(e.target) || isLayerOpen()) return

      // The printed label is the shortcut: section `02` answers to `2`.
      const item = navFor(surface).find((entry) => entry.index === `0${e.key}`)
      if (!item) return

      e.preventDefault()
      setView(item.id)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [surface, setView])
}
