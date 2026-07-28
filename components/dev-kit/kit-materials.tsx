import { Row, Spec } from '@/components/dev-kit/kit-shell'
import { AssetImage } from '@/components/ui/asset-image'
import { cn } from '@/lib/utils'

/**
 * Materials, neon tiers, veils and the radius scale (F9.6).
 *
 * The one section of the showcase that is not a primitive gallery, and the
 * reason it exists at all: `Panel` proves the *component* works, but it cannot
 * show the difference between `glass` and `glass-strong` — that difference only
 * appears when both sit on a photograph, next to each other, at the same size.
 * Same for the three neon tiers (§4.2): each is legible alone and only becomes a
 * budget when T1 and T2 are in one frame. So every demo here is a comparison,
 * and the media is a real `public/attract/` frame rather than a flat swatch,
 * because a veil measured over `--background` is a veil measured over nothing.
 */

const FRAME_A = '/attract/frame-1.webp'
const FRAME_B = '/attract/frame-2.webp'

/** Photographic bed. `alt=''` — decorative by construction (§13.6). */
function Frame({
  src = FRAME_A,
  className,
  children,
}: {
  src?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-lg border border-border bg-black',
        className,
      )}
    >
      <AssetImage
        src={src}
        alt=""
        sizes="(min-width: 1024px) 33vw, 100vw"
        fallback="plate"
        className="object-cover"
      />
      {children}
    </div>
  )
}

/** Caption under a demo tile: utility name + what to look at. */
function Cap({ name, note }: { name: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <code className="text-[11px] text-text-high">{name}</code>
      <p className="text-[11px] leading-relaxed text-text-low">{note}</p>
    </div>
  )
}

const MATERIALS = [
  {
    cls: 'glass',
    label: '.glass',
    note: 'blur(10px), white 3.5→0.6 %, --border. The frame stays readable through it.',
  },
  {
    cls: 'glass-strong',
    label: '.glass-strong',
    note: 'blur(18px) over #101015, --border-strong. The frame becomes texture, not content.',
  },
  {
    cls: 'panel',
    label: '.panel',
    note: 'Opaque --panel, no blur. The frame is gone — and no compositing cost.',
  },
  {
    cls: 'well',
    label: '.well',
    note: 'Not a material: black 40 % recessed into a panel. Over media it only darkens.',
  },
] as const

const VEILS = [
  {
    cls: 'veil-login-h',
    frame: FRAME_A,
    note: 'Login, horizontal. Nearly clear at 42 % where the subject is, dense right and left.',
  },
  {
    cls: 'veil-login-v',
    frame: FRAME_A,
    note: 'Login, vertical. Presses the top and bottom edges only; the middle is untouched.',
  },
  {
    cls: 'veil-attract-scrim',
    frame: FRAME_B,
    note: 'Idle, radial. A dark egg at 50/47 % — the bed the giant clock sits on.',
  },
  {
    cls: 'veil-attract-v',
    frame: FRAME_B,
    note: 'Idle, vertical. Bottom heavier than login’s: the ticker rides on it.',
  },
  {
    cls: 'scanlines',
    frame: FRAME_B,
    note: '1 px line every 3 px, opacity .06, overlay. Texture — never darkening.',
  },
] as const

const RADII = [
  ['rounded-sm', '3 px', 'chips, hairline swatches, inline code plates'],
  ['rounded-md', '6 px', 'buttons, inputs, badges — the default'],
  ['rounded-lg', '10 px', 'panels, cards, tiles'],
  ['rounded-xl', '16 px', 'modals, drawers, hero plates'],
  ['rounded-full', '∞', 'only chips and pills (§4.4)'],
] as const

export function KitMaterials() {
  return (
    <>
      <Spec
        id="F9.6"
        name="Materials"
        note="glass / glass-strong / panel / well — same size, same photograph"
      >
        <div className="flex flex-col gap-2">
          <p className="label-mono text-[10px] text-text-low">on media</p>
          <Frame className="p-4 sm:p-6">
            {/* The login pie, so the plates are judged on a bed that actually
                ships — a material on a raw frame reads brighter than it ever will. */}
            <div aria-hidden className="veil-login-floor absolute inset-0" />
            <div aria-hidden className="veil-login-h absolute inset-0" />
            <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MATERIALS.map((m) => (
                <div
                  key={m.cls}
                  className={cn(
                    'flex h-28 flex-col justify-between rounded-lg p-3',
                    m.cls,
                    m.cls === 'well' && 'border border-border',
                  )}
                >
                  <span className="label-mono text-[10px] text-primary">{m.label}</span>
                  <span className="text-sm leading-relaxed text-text-high">Access card 0842</span>
                </div>
              ))}
            </div>
          </Frame>
          {/* Captions live off the photograph on purpose: a legend printed over
              the very media being judged is the one thing this section must not
              do — and it would be unreadable under `.panel`'s neighbours. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MATERIALS.map((m) => (
              <Cap key={m.cls} name={m.label} note={m.note} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="label-mono text-[10px] text-text-low">on chrome (app-ambient)</p>
          <div className="app-ambient hairline-grid rounded-lg border border-border p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MATERIALS.map((m) => (
                <div
                  key={m.cls}
                  className={cn(
                    'flex h-28 flex-col justify-between rounded-lg p-3',
                    m.cls,
                    m.cls === 'well' && 'border border-border',
                  )}
                >
                  <span className="label-mono text-[10px] text-text-low">{m.label}</span>
                  <span className="text-sm leading-relaxed text-text-high">Session 0842</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-text-low">
            {
              'Off media the four collapse towards each other — which is the argument for §4.1: pick the material by what sits under it, not by how heavy it looks here.'
            }
          </p>
        </div>
      </Spec>

      <Spec id="F9.6 / neon" name="Neon tiers" note="T1 travels · T2 is frozen · T3 has none">
        <Frame className="p-4 sm:p-6">
          <div aria-hidden className="veil-attract-floor absolute inset-0" />
          <div aria-hidden className="veil-attract-scrim absolute inset-0" />
          <div className="relative grid gap-4 sm:grid-cols-3">
            <div className="neon-ring glass flex h-28 flex-col justify-between rounded-lg p-3">
              <span className="label-mono text-[10px] text-primary">T1</span>
              <span className="text-sm text-text-high">Move mouse to unlock</span>
            </div>
            <div className="flex h-28 flex-wrap content-start items-start gap-2 rounded-lg border border-border/60 p-3">
              {['CPU 41°', 'PING 12', 'STATION 07'].map((chip) => (
                <span
                  key={chip}
                  className="neon-ring-static pill label-mono rounded-full px-2.5 py-1 text-[10px] text-text-high"
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="glass flex h-28 flex-col justify-between rounded-lg p-3">
              <span className="label-mono text-[10px] text-text-low">T3</span>
              <span className="text-sm text-text-high">Promo panel</span>
            </div>
          </div>
        </Frame>
        <div className="grid gap-4 sm:grid-cols-3">
          <Cap
            name=".neon-ring / .neon-edge"
            note="T1 — light travels, 7 s. Budget: exactly one element per screen, the thing the visitor came for."
          />
          <Cap
            name=".neon-ring-static / .neon-edge-static"
            note="T2 — same tube frozen at 135°, halo at .28. Unlimited: status plates read as lit, not as the destination."
          />
          <Cap
            name="— (no class)"
            note="T3 — the default. Border, material and type carry it; that is why T1 still reads as an accent."
          />
        </div>
        <p className="text-[11px] leading-relaxed text-text-low">
          {
            'Before F9.4 the idle screen wore seven traveling rings at once. The scarce resource is motion, not colour — which is why the tier switches the animation and nothing else.'
          }
        </p>
      </Spec>

      <Spec
        id="F9.6 / veils"
        name="Veils"
        note="five layers, one at a time, over a real public/attract/ frame"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col">
            <Frame src={FRAME_A} className="aspect-video" />
            <Cap name="— (bare frame)" note="The control. Nothing on top; nothing legible on top either." />
          </div>
          {VEILS.map((v) => (
            <div key={v.cls} className="flex flex-col">
              <Frame src={v.frame} className="aspect-video">
                <div aria-hidden className={cn('absolute inset-0', v.cls)} />
                <span className="label-mono absolute bottom-2 left-3 text-[10px] text-text-high">
                  {v.cls}
                </span>
              </Frame>
              <Cap name={`.${v.cls}`} note={v.note} />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="label-mono text-[10px] text-text-low">
            assembled pies — order is the caller’s: floor → shaping → texture
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col">
              <Frame src={FRAME_A} className="aspect-video">
                <div aria-hidden className="veil-login-floor absolute inset-0" />
                <div aria-hidden className="veil-login-h absolute inset-0" />
                <div aria-hidden className="veil-login-v absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-end p-5">
                  <span className="glass-strong rounded-lg px-4 py-3 text-sm text-text-high">
                    Access card
                  </span>
                </div>
              </Frame>
              <Cap
                name="login · floor + h + v"
                note="Insurance floor at .18 pure black, then the two shaping gradients on --veil-ink."
              />
            </div>
            <div className="flex flex-col">
              <Frame src={FRAME_B} className="aspect-video">
                <div aria-hidden className="veil-attract-floor absolute inset-0" />
                <div aria-hidden className="veil-attract-scrim absolute inset-0" />
                <div aria-hidden className="veil-attract-v absolute inset-0" />
                <div aria-hidden className="scanlines absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-clock text-4xl text-text-high">21:40</span>
                </div>
              </Frame>
              <Cap
                name="idle · floor + scrim + v + scanlines"
                note="Floor at .35 and the deeper ink: the media here is video nobody previewed."
              />
            </div>
          </div>
        </div>
      </Spec>

      <Spec id="F9.6 / radius" name="Radius scale" note="sm 3 · md 6 · lg 10 · xl 16 · full">
        <Row label="tactical corners, and what wears them" stack>
          <div className="grid w-full gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {RADII.map(([cls, size, use]) => (
              <div key={cls} className="flex flex-col gap-2">
                <div
                  className={cn(
                    'flex h-20 items-end justify-between border border-border-strong bg-surface-2 px-4 py-2',
                    cls,
                  )}
                >
                  <code className="text-[11px] text-text-high">{cls}</code>
                  <span className="font-clock text-[11px] text-text-medium">{size}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-low">{use}</p>
              </div>
            ))}
          </div>
        </Row>
      </Spec>
    </>
  )
}
