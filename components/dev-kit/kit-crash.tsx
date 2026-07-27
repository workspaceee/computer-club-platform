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

import { useState } from 'react'
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
 * Two details this demo has to get right, both of them about *who* re-renders:
 *
 * - Disarming cannot happen in `onError`. That callback runs while the boundary
 *   is catching, and a state flip there lands in the same commit that shows the
 *   fallback — the crash screen would vanish before anyone saw it.
 * - Disarming cannot be deferred to "the next render" either. `reset()` is a
 *   `setState` on the *boundary*, so it re-renders the boundary alone; this
 *   component never runs again and the already-created `<Bomb armed />` element
 *   throws a second time the instant it is remounted.
 *
 * So retry has to do both jobs in the same event: disarm here, clear there.
 * React batches the two updates, the subtree remounts unarmed, and recovery is
 * genuine rather than staged.
 */
function BoundaryDemo({ variant }: { variant: 'page' | 'section' }) {
  const [armed, setArmed] = useState(false)

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
              setArmed(false)
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
