'use client'

import { icons } from '@/lib/icons'
import { useState } from 'react'
import { Grid, Row, Spec } from '@/components/dev-kit/kit-shell'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import { Field } from '@/components/ui/field'
import { HudChip } from '@/components/ui/hud-chip'
import { HudPlate } from '@/components/ui/hud-plate'
import { Money } from '@/components/ui/money'
import { NavRail, type NavRailItem } from '@/components/ui/nav-rail'
import { Panel } from '@/components/ui/panel'
import { Progress } from '@/components/ui/progress'
import { RingProgress } from '@/components/ui/ring-progress'
import { Segmented } from '@/components/ui/segmented'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { StatTile } from '@/components/ui/stat-tile'
import { Toggle } from '@/components/ui/toggle'
import { useStore } from '@/lib/store'

/**
 * Stand-in sections for the rail demo.
 *
 * Deliberately *not* imported from `lib/launcher-nav`: the kit demonstrates the
 * primitive, and wiring it to the real table would make this page render whatever
 * the launcher's navigation happens to be — and break when a section is renamed.
 */
const RAIL_ITEMS: NavRailItem<'home' | 'games' | 'shop' | 'profile'>[] = [
  { id: 'home', label: 'Home', index: '01', icon: icons.home },
  { id: 'games', label: 'Games', index: '02', icon: icons.games },
  { id: 'shop', label: 'Shop', index: '03', icon: icons.shop },
  { id: 'profile', label: 'Profile', index: '04', icon: icons.player },
]

/** Form controls, data display and loyalty primitives (F1.5–F1.7, F1.11, F1.12, F1.17–F1.20, F1.23). */
export function KitData() {
  const [text, setText] = useState('')
  const [tab, setTab] = useState<'login' | 'guest'>('login')
  const [zone, setZone] = useState<'all' | 'vip' | 'ps5'>('all')
  const [volume, setVolume] = useState(70)
  const [reduce, setReduce] = useState(false)
  const [res, setRes] = useState('1920x1080')
  const [rail, setRail] = useState<(typeof RAIL_ITEMS)[number]['id']>('games')
  const toast = useStore((s) => s.toast)

  return (
    <>
      <Spec id="F1.5" name="Field" note="label, icon, trailing, hint, error, disabled">
        <div className="grid gap-4 rounded-lg border border-border bg-surface/40 p-4 sm:grid-cols-2">
          <Field
            label="Login"
            icon={<icons.player size={16} />}
            placeholder="nickname"
            value={text}
            onValueChange={setText}
            hint="Case insensitive."
          />
          <Field
            label="Password"
            type="password"
            icon={<icons.lock size={16} />}
            placeholder="••••••••"
            error="Wrong login or password."
          />
          <Field label="Search" icon={<icons.search size={16} />} placeholder="Find a game" />
          <Field
            label="Disabled"
            icon={<icons.player size={16} />}
            placeholder="Locked by admin"
            disabled
          />
          <Field
            label="Trailing slot"
            placeholder="Minutes"
            trailing={
              <Button size="sm" variant="ghost">
                Max
              </Button>
            }
          />
        </div>
      </Spec>

      <Spec id="F1.6" name="Segmented" note="pill / outline, sizes, icons, disabled option">
        <Row label="pill (default)" stack>
          <Segmented
            label="Mode"
            options={[
              { value: 'login', label: 'Account' },
              { value: 'guest', label: 'Guest' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Segmented
            variant="outline"
            size="sm"
            fill
            options={[
              { value: 'all', label: 'All' },
              { value: 'vip', label: 'VIP' },
              { value: 'ps5', label: 'PS5', disabled: true },
            ]}
            value={zone}
            onChange={setZone}
          />
          <Segmented
            round
            options={[
              { value: 'all', label: 'Hour', icon: <icons.clock size={14} /> },
              { value: 'vip', label: 'Day', icon: <icons.calendar size={14} /> },
            ]}
            value={zone === 'ps5' ? 'all' : zone}
            onChange={setZone}
          />
        </Row>
      </Spec>

      <Spec id="F1.7" name="Slider / Toggle / Select" note="row and bare variants">
        <Panel variant="flat" className="flex flex-col gap-1">
          <Slider label="Master volume" value={volume} onChange={setVolume} suffix="%" />
          <Slider
            label="Sensitivity (no suffix)"
            value={5}
            onChange={() => {}}
            min={1}
            max={10}
            step={1}
          />
          <Toggle
            label="Reduce animations"
            description="Cuts every non-essential transition."
            checked={reduce}
            onChange={setReduce}
          />
          <Toggle label="Disabled toggle" checked disabled onChange={() => {}} />
          <Select
            label="Resolution"
            value={res}
            onChange={setRes}
            options={[
              { value: '1920x1080', label: '1920 x 1080' },
              { value: '1366x768', label: '1366 x 768' },
            ]}
          />
        </Panel>
        <Row label="bare variants" stack>
          <Toggle variant="bare" label="Bare toggle" checked={reduce} onChange={setReduce} />
          <Select
            variant="bare"
            value={res}
            onChange={setRes}
            options={[
              { value: '1920x1080', label: '1920 x 1080' },
              { value: '1366x768', label: '1366 x 768' },
            ]}
          />
          <Slider hideValue value={volume} onChange={setVolume} className="w-64" />
        </Row>
      </Spec>

      <Spec id="F1.11" name="StatTile" note="icon, value, delta, hint, tones">
        <Grid cols={4}>
          <StatTile label="Time left" value="01:42:18" mono icon={<icons.clock size={16} />} />
          <StatTile
            label="Revenue today"
            value="€412.50"
            mono
            tone="success"
            delta={12.4}
            icon={<icons.trend size={16} />}
          />
          <StatTile label="Coins" value="1 250" mono tone="coin" icon={<icons.coins size={16} />} />
          <StatTile label="Open tabs" value="3" tone="danger" delta={-8} hint="vs yesterday" />
        </Grid>
        <Grid cols={4}>
          <StatTile size="sm" label="XP" value="8 420" tone="xp" mono />
          <StatTile size="sm" label="Sessions" value="27" tone="info" />
          <StatTile size="sm" label="Occupancy" value="78%" tone="primary" delta={4} deltaSuffix="pp" />
          <StatTile size="sm" label="Idle PCs" value="5" tone="warning" />
        </Grid>
      </Spec>

      <Spec id="F1.12" name="Progress / RingProgress" note="tones, sizes, labels">
        <Panel variant="flat" className="flex flex-col gap-4">
          <Progress label="Level 12" value={68} tone="xp" showValue />
          <Progress label="Disk" value={92} tone="danger" showValue />
          <Progress value={40} tone="success" size="sm" />
          <Progress
            label="Session"
            value={102}
            max={120}
            tone="primary"
            showValue
            format={(v, m) => `${v} / ${m} min`}
          />
        </Panel>
        <Row label="rings">
          <RingProgress value={68} label="XP" tone="xp" size={96}>
            <span className="font-clock text-lg font-semibold text-text-high">68%</span>
          </RingProgress>
          <RingProgress value={92} tone="danger" size={80} thickness={6} label="Load" />
          <RingProgress value={35} tone="coin" size={64} thickness={5} label="Bonus" />
          <RingProgress value={100} tone="success" size={64} thickness={5} label="Done" />
        </Row>
      </Spec>

      <Spec id="F1.17" name="Countdown" note="neutral > 15m, warning ≤ 15m, danger ≤ 5m + pulse">
        <Row label="thresholds">
          <Countdown seconds={3 * 3600} label="Neutral" />
          <Countdown seconds={12 * 60} label="≤ 15 min" />
          <Countdown seconds={3 * 60} label="≤ 5 min" />
          <Countdown seconds={0} label="Expired" />
        </Row>
        <Row label="sizes">
          <Countdown seconds={5400} size="sm" label="sm" />
          <Countdown seconds={5400} size="md" label="md" />
          <Countdown seconds={5400} size="xl" label="xl" />
        </Row>
        <Row label="noPulse">
          <Countdown seconds={90} label="Danger, no pulse" noPulse />
        </Row>
      </Spec>

      <Spec id="F1.18" name="Money" note="EUR, debt sign, signed deltas, cents input">
        <Row label="tones">
          <Money value={12.5} />
          <Money value={12.5} tone="muted" />
          <Money value={4.2} tone="debt" />
          <Money value={18} tone="success" signed />
          <Money value={7.99} tone="coin" />
          <Money value={49} tone="primary" />
        </Row>
        <Row label="sizes">
          <Money value={412.5} size="xs" />
          <Money value={412.5} size="sm" />
          <Money value={412.5} size="md" />
          <Money value={412.5} size="lg" />
          <Money value={412.5} size="xl" />
        </Row>
        <Row label="options">
          <Money value={1499} fromCents />
          <Money value={12} decimals={0} />
          <Money value={12.5} hideSymbol />
          <Money value={3} suffix="/ hour" />
          <Money value={19.9} strike />
          <Money value={-25} tone="debt" size="lg" />
        </Row>
      </Spec>

      <Spec id="F1.19" name="Avatar" note="initials, tier ring, presence dot, level chip">
        <Row label="sizes">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
            <Avatar key={s} size={s} name="Alexei Petrov" level={7} />
          ))}
        </Row>
        <Row label="tiers (rookie / regular / veteran / elite)">
          <Avatar name="New Guy" level={1} showLevel />
          <Avatar name="Regular Player" level={7} showLevel />
          <Avatar name="Veteran Player" level={14} showLevel />
          <Avatar name="Elite Player" level={26} showLevel />
        </Row>
        <Row label="presence + square + single-word name">
          <Avatar name="Online User" level={12} status="online" />
          <Avatar name="Idle User" level={12} status="idle" />
          <Avatar name="Offline User" level={12} status="offline" />
          <Avatar name="kotik" level={3} square />
          <Avatar name="Photo User" level={22} src="/placeholder-user.jpg" status="online" />
        </Row>
      </Spec>

      <Spec id="F1.20" name="Toaster" note="4 kinds, queue capped at 3, auto-dismiss, pause on hover">
        <Row label="fire a toast">
          <Button
            variant="success"
            size="sm"
            onClick={() => toast('success', 'Time added to your session.')}
          >
            success
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => toast('error', 'Card terminal rejected the payment.', { title: 'Payment failed' })}
          >
            error
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast('warning', 'Your session ends in 5 minutes.', { title: 'Time running out' })}
          >
            warning
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast('info', 'Order sent to the bar.')}>
            info
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              toast('info', 'First')
              toast('info', 'Second')
              toast('info', 'Third')
              toast('success', 'Fourth — First was evicted')
            }}
          >
            queue overflow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast('info', 'Sticky until dismissed.', { duration: 0 })}
          >
            duration=0
          </Button>
        </Row>
      </Spec>

      <Spec
        id="F1.23"
        name="HudChip"
        note="telemetry chip — the shared bottom row of the login and idle screens (§5.3)"
      >
        {/* Literal samples on purpose: this is the gallery of the primitive, not
            a station. The live seat readings belong to `StationPanel` (C1.6) —
            wiring the kit to the club would make the tone rows below depend on
            whichever seat this dev build happens to run on. */}
        <Row label="the seam, exactly as both screens render it (values are live in the app)">
          <HudChip dot variant="station" label="PC #17" value="Free" />
          <HudChip label="Zone" value="Main Hall" />
          <HudChip icon={<icons.network size={13} />} label="Ping" value="4 ms" />
          <HudChip icon={<icons.display size={13} />} label="Display" value="240 Hz" />
          <HudChip icon={<icons.hardware size={13} />} label="GPU" value="RTX 4080" />
          <HudChip icon={<icons.status size={13} />} label="Status" value="Optimal" tone="accent" />
        </Row>
        <Row label="tone: default / accent / warning / danger / muted (icon + value, never the surface)">
          <HudChip icon={<icons.network size={13} />} label="Ping" value="4 ms" />
          <HudChip icon={<icons.network size={13} />} label="Ping" value="4 ms" tone="accent" />
          <HudChip icon={<icons.network size={13} />} label="Ping" value="180 ms" tone="warning" />
          <HudChip icon={<icons.network size={13} />} label="Ping" value="lost" tone="danger" />
          <HudChip icon={<icons.network size={13} />} label="Ping" value="—" tone="muted" />
        </Row>
        {/* The five seat states C1.6 has to be able to say. `station` reads
            `default` as success, which is why "free" needs no tone. */}
        <Row label="seat status, the five readings the station chip must carry">
          <HudChip dot variant="station" label="PC #17" value="Free" />
          <HudChip dot variant="station" label="PC #18" value="Free until 22:00" tone="default" />
          <HudChip dot variant="station" label="PC #19" value="In use" tone="warning" />
          <HudChip dot variant="station" label="PC #20" value="Booked from 21:30" tone="warning" />
          <HudChip dot variant="station" label="PC #21" value="Maintenance" tone="danger" />
        </Row>
        <Row label="variants + optional parts (no icon, dot only, icon + dot)">
          <HudChip variant="station" label="PC #17" value="READY" />
          <HudChip label="Zone" value="VIP" />
          <HudChip dot label="Session" value="LIVE" tone="accent" />
          <HudChip dot icon={<icons.status size={13} />} label="Uplink" value="Stable" />
        </Row>
      </Spec>

      <Spec
        id="C2.1"
        name="HudPlate"
        note="bar-mounted reading — the right block of the top bar, tone tints the edge"
      >
        <Row label="tones (default / coin / warning ≤ 15m / danger ≤ 5m)">
          <HudPlate
            icon={<icons.timer size={14} />}
            label="Time left"
            labelAt="always"
            value={<Countdown seconds={2 * 3600} size="sm" />}
          />
          <HudPlate
            tone="coin"
            icon={<icons.coins size={14} />}
            label="Coins"
            labelAt="always"
            value="1 240"
          />
          <HudPlate
            tone="warning"
            icon={<icons.timer size={14} />}
            label="Time left"
            labelAt="always"
            value={<Countdown seconds={12 * 60} size="sm" />}
          />
          <HudPlate
            tone="danger"
            icon={<icons.timer size={14} />}
            label="Time left"
            labelAt="always"
            value={<Countdown seconds={3 * 60} size="sm" />}
          />
        </Row>
        <Row label="what the two surfaces actually show (member coins vs walk-in tab, rising clock)">
          <HudPlate
            icon={<icons.timer size={14} />}
            label="Session time"
            labelAt="always"
            value={<Countdown seconds={47 * 60} size="sm" mode="elapsed" />}
          />
          <HudPlate
            icon={<icons.bill size={14} />}
            label="Open tab"
            labelAt="always"
            value={<Money value={1740} fromCents size="sm" />}
          />
          <HudPlate label="No icon" labelAt="always" value="—" />
        </Row>
      </Spec>

      <Spec
        id="C2.1 / nav"
        name="NavRail"
        note="launcher navigation — underline in the top bar, pill in the mobile bar"
      >
        <Row label="underline (desktop top bar; the rule hangs off the bar's edge, so it clips here)">
          <NavRail
            items={RAIL_ITEMS}
            value={rail}
            onChange={setRail}
            label="Kit navigation"
            className="h-12"
          />
        </Row>
        <Row label="pill (mobile bottom bar), on the material it ships with">
          <NavRail
            items={RAIL_ITEMS}
            value={rail}
            onChange={setRail}
            variant="pill"
            label="Kit navigation, compact"
            className="glass-strong w-full max-w-sm rounded-lg p-1"
          />
        </Row>
      </Spec>
    </>
  )
}
