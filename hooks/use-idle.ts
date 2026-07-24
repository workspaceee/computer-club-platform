'use client'

import { useEffect, useState } from 'react'

/**
 * Returns `true` after `timeoutMs` of no user activity
 * (mouse move / click / key press / touch / scroll).
 * Any activity instantly resets it back to `false`.
 */
export function useIdle(timeoutMs = 30_000) {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), timeoutMs)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'] as const
    for (const e of events) window.addEventListener(e, reset, { passive: true })
    reset()

    return () => {
      clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, reset)
    }
  }, [timeoutMs])

  return idle
}
