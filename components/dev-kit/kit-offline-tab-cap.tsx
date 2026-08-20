'use client'

/**
 * The offline tab ceiling, on the /dev/kit page (C2.17).
 *
 * The one state in this block that cannot be reached by using the product: it
 * needs a **postpaid** seat and a link that has been down for half an hour, and
 * no dev affordance can produce the second one without waiting for it. So the
 * panel is mounted here with the reading passed in, which is exactly how the
 * launcher mounts it — `time-warnings.tsx` decides *when*, this file decides
 * *with what*.
 *
 * Three readings rather than one, because the copy has to survive all of them:
 * the ceiling itself, an hour of blind growth, and a shift-long outage where the
 * charge is the number a guest would argue about at the counter.
 *
 * "Call the admin" is live here — it goes through the same mock endpoint the real
 * panel uses, which is the point: the button that must keep working while
 * everything else is refused (C2.13) is worth pressing in the showcase.
 */

import { useState } from 'react'
import { Row, Spec } from '@/components/dev-kit/kit-shell'
import { OfflineTabCap } from '@/components/launcher/offline-tab-cap'
import { Button } from '@/components/ui/button'
import { OFFLINE_TAB_CAP_SECONDS } from '@/lib/store'

const READINGS = [
  { label: 'at the ceiling — the moment it fires', seconds: OFFLINE_TAB_CAP_SECONDS },
  { label: 'an hour of blind growth', seconds: 60 * 60 },
  { label: 'a shift-long outage', seconds: 7 * 60 * 60 + 42 * 60 },
] as const

export function KitOfflineTabCap() {
  const [seconds, setSeconds] = useState<number | null>(null)

  return (
    <Spec
      id="C2.17"
      name="OfflineTabCap"
      note="postpaid only, dismissable, the clock behind it never stops"
    >
      {READINGS.map((reading) => (
        <Row key={reading.seconds} label={reading.label} stack>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setSeconds(reading.seconds)}
          >
            Open at {Math.floor(reading.seconds / 60)} min
          </Button>
        </Row>
      ))}

      <OfflineTabCap
        open={seconds !== null}
        unreported={seconds ?? 0}
        onClose={() => setSeconds(null)}
      />
    </Spec>
  )
}
