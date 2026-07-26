'use client'

/**
 * ErrorBoundary + crash screen showcase (F6.5), on the /dev/kit page.
 *
 * A crash screen is the one surface nobody can review by using the product:
 * you cannot ask a reviewer to break the shell on purpose. So the boundary gets
 * a real throw here, wired to a button, and both variants can be inspected —
 * including that `Try again` genuinely recovers the subtree.
 *
 * This is the honest test, not a screenshot of the fallback: the button makes a
 * child component throw during render, and everything after that is the same
 * code path a real fault takes.
 */

import { useRef, useState } from 'react'
import { CrashScreen } from '@/components/crash-screen'
import { Row, Spec } from '@/components/dev-kit/kit-shell'
import { ErrorBoundary } from '@/components/error-boundary'
import { Button } from '@/components/ui/button'

/** Throws while rendering — the only way to exercise a real error boundary. */
function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error('Simulated render fault from /dev/kit (F6.5)')
  return (
    <p className="text-sm leading-relaxed text-text-medium">
      {'This subtree renders normally until it is told to throw.'}
    </p>
  )
}

/**
 * One armed boundary.
 *
 * The subtlety worth naming: the demo must disarm the bomb when the guest
 * presses retry, or the child would throw again instantly and the screen would
 * look frozen. It cannot disarm inside `onError` either — that runs while the
 * boundary is catching, and flipping state there changes `resetKey` and clears
 * the fallback in the same commit, so nothing would ever be visible.
 *
 * A ref is the honest fix: the boundary's own `reset()` fires first, and the
 * disarm rides along on the re-render it triggers.
 */
function BoundaryDemo({ variant }: { variant: 'page' | 'section' }) {
  const [armed, setArmed] = useState(false)
  // Read during the retry render only, so no state update races the boundary.
  const disarmOnNextRender = useRef(false)

  if (disarmOnNextRender.current && armed) {
    disarmOnNextRender.current = false
    setArmed(false)
  }

  return (
    <>
      <Button variant="danger" size="sm" className="self-start" onClick={() => setArmed(true)}>
        Throw in {variant}
      </Button>
      <ErrorBoundary
        variant={variant}
        /* The real crash screen, with retry routed through the demo so the bomb
           is disarmed on the way out. No visuals are re-implemented here. */
        fallback={({ reset }) => (
          <CrashScreen
            variant={variant}
            reference="SH-DEMO01"
            onRetry={() => {
              disarmOnNextRender.current = true
              reset()
            }}
          />
        )}
      >
        <Bomb armed={armed} />
      </ErrorBoundary>
    </>
  )
}

export function KitCrash() {
  return (
    <Spec
      id="F6.5"
      name="ErrorBoundary + CrashScreen"
      note="real throws, both variants, retry recovers the subtree"
    >
      <Row label="variant=section — inline card, the surrounding frame survives" stack>
        <BoundaryDemo variant="section" />
      </Row>
      <Row label="variant=page — full crash screen, adds the restart escape hatch" stack>
        <BoundaryDemo variant="page" />
      </Row>
    </Spec>
  )
}
