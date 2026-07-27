'use client'

import { icons } from '@/lib/icons'
import { useState } from 'react'
import { Grid, Row, Spec } from '@/components/dev-kit/kit-shell'
import { Skeleton, SkeletonCard, SkeletonRow, SkeletonText, SkeletonTile } from '@/components/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Modal } from '@/components/ui/modal'
import { Panel } from '@/components/ui/panel'
import { SectionHeader } from '@/components/ui/section-header'
import { Tooltip } from '@/components/ui/tooltip'

/** Surfaces, actions, feedback and loading primitives (F1.2–F1.4, F1.8–F1.10, F1.13–F1.16). */
export function KitSurfaces() {
  const [modal, setModal] = useState<null | 'sm' | 'md' | 'lg' | 'full' | 'blocking'>(null)
  const [drawer, setDrawer] = useState<null | 'right' | 'bottom'>(null)
  const [retrying, setRetrying] = useState(false)

  return (
    <>
      <Spec id="F1.2" name="Panel" note="glass / strong / flat, header + actions slot">
        <Grid>
          <Panel variant="glass" title="Glass" eyebrow="01">
            <p className="text-sm text-text-medium">Frosted plate for chips and secondary panels.</p>
          </Panel>
          <Panel variant="strong" title="Strong" eyebrow="02" ticks>
            <p className="text-sm text-text-medium">Heavier plate — modals and overlays.</p>
          </Panel>
          <Panel variant="flat" title="Flat" actions={<Badge tone="info">live</Badge>}>
            <p className="text-sm text-text-medium">Opaque panel for dense lists, no blur cost.</p>
          </Panel>
        </Grid>
        <Row label="flush + ticks + radius=xl">
          <Panel flush ticks radius="xl" className="w-full">
            <div className="border-b border-border px-4 py-3 text-sm text-text-high">Edge to edge row</div>
            <div className="px-4 py-3 text-sm text-text-medium">No inner padding on the panel itself</div>
          </Panel>
        </Row>
      </Spec>

      <Spec id="F1.3" name="SectionHeader" note="numbered heading, subtitle, action slot">
        <Row label="index + subtitle + action" stack>
          <SectionHeader
            index="01"
            title="Your session"
            subtitle="Everything about the machine you are sitting at right now."
            action={<Button variant="ghost" size="sm">See all</Button>}
            className="mb-0 w-full"
          />
          <SectionHeader title="No index, h3" as="h3" className="mb-0 w-full" />
        </Row>
      </Spec>

      <Spec id="F1.4" name="Button" note="5 variants x 4 sizes, loading / disabled / cut">
        <Row label="variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
        </Row>
        <Row label="sizes">
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
          <Button size="xl">xl</Button>
        </Row>
        <Row label="states">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="icons + cut CTA + block">
          <Button iconLeft={<icons.add />}>Add time</Button>
          <Button variant="secondary" iconRight={<icons.save />}>
            Save
          </Button>
          <Button cut size="lg">
            Start session
          </Button>
          <IconButton label="Delete" variant="danger">
            <icons.delete />
          </IconButton>
          <IconButton label="Network" size="sm">
            <icons.network />
          </IconButton>
        </Row>
        <Row label="block">
          <Button block variant="secondary">
            Full width
          </Button>
        </Row>
      </Spec>

      <Spec id="F1.8" name="Modal" note="sm / md / lg / full, blocking variant">
        <Row label="open">
          <Button variant="secondary" size="sm" onClick={() => setModal('sm')}>
            sm
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setModal('md')}>
            md
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setModal('lg')}>
            lg
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setModal('full')}>
            full
          </Button>
          <Button variant="danger" size="sm" onClick={() => setModal('blocking')}>
            blocking (no Esc)
          </Button>
        </Row>

        <Modal
          open={modal !== null && modal !== 'blocking'}
          onClose={() => setModal(null)}
          size={modal === 'blocking' || modal === null ? 'md' : modal}
          eyebrow="SYS"
          title={`Modal / ${modal ?? ''}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => setModal(null)}>Confirm</Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-text-medium">
            Escape, overlay click, focus trap and scroll lock all come from{' '}
            <code className="text-text-high">useDismissableLayer</code>. Tab cycles inside the
            dialog only.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm">
              Focusable A
            </Button>
            <Button variant="secondary" size="sm">
              Focusable B
            </Button>
          </div>
        </Modal>

        <Modal
          open={modal === 'blocking'}
          onClose={() => setModal(null)}
          size="sm"
          hideClose
          dismissable={false}
          title="Session paused"
        >
          <p className="text-sm leading-relaxed text-text-medium">
            {'Escape and overlay clicks are disabled — the only way out is an explicit action.'}
          </p>
          <Button block className="mt-5" onClick={() => setModal(null)}>
            Resume
          </Button>
        </Modal>
      </Spec>

      <Spec id="F1.9" name="Drawer" note="right / bottom, same dismiss core as Modal">
        <Row label="open">
          <Button variant="secondary" size="sm" onClick={() => setDrawer('right')}>
            right
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDrawer('bottom')}>
            bottom
          </Button>
        </Row>
        <Drawer
          open={drawer !== null}
          onClose={() => setDrawer(null)}
          side={drawer ?? 'right'}
          eyebrow="CART"
          title="Your order"
          footer={<Button block cut>Checkout</Button>}
        >
          <div className="flex flex-col gap-3">
            {['Monster Energy', 'Chicken wrap', 'Coffee'].map((i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-high">{i}</span>
                <span className="font-clock text-text-medium">x1</span>
              </div>
            ))}
          </div>
        </Drawer>
      </Spec>

      <Spec id="F1.10" name="Badge" note="7 tones x 3 variants, dot / pulse / round">
        <Row label="soft (default)">
          {(['success', 'warning', 'danger', 'info', 'neutral', 'vip', 'ps5'] as const).map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
        </Row>
        <Row label="solid">
          {(['success', 'warning', 'danger', 'info', 'neutral', 'vip', 'ps5'] as const).map((t) => (
            <Badge key={t} tone={t} variant="solid">
              {t}
            </Badge>
          ))}
        </Row>
        <Row label="outline">
          {(['success', 'warning', 'danger', 'info', 'neutral', 'vip', 'ps5'] as const).map((t) => (
            <Badge key={t} tone={t} variant="outline">
              {t}
            </Badge>
          ))}
        </Row>
        <Row label="dot / pulse / round / sm">
          <Badge tone="success" dot pulse>
            occupied
          </Badge>
          <Badge tone="warning" dot>
            reserved
          </Badge>
          <Badge tone="neutral" round>
            round
          </Badge>
          <Badge tone="info" size="sm">
            sm
          </Badge>
        </Row>
      </Spec>

      <Spec id="F1.13" name="Tooltip" note="delayed on hover, instant on focus, Esc closes">
        <Row label="sides">
          {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
            <Tooltip key={side} side={side} content={`Hint on ${side}`}>
              <Button variant="secondary" size="sm">
                {side}
              </Button>
            </Tooltip>
          ))}
          <Tooltip content="Opens instantly" delay={0}>
            <Button variant="ghost" size="sm">
              delay=0
            </Button>
          </Tooltip>
          <Tooltip content="Never shown" disabled>
            <Button variant="ghost" size="sm">
              disabled
            </Button>
          </Tooltip>
        </Row>
      </Spec>

      <Spec id="F1.14" name="EmptyState" note="icon, title, description, CTA">
        <Grid cols={2}>
          <Panel variant="flat" flush>
            <EmptyState
              bare
              icon={icons.empty}
              title="No notifications"
              description="When an admin sends you time or a message, it lands here."
              actionLabel="Refresh"
              onAction={() => {}}
            />
          </Panel>
          <Panel variant="flat" flush>
            <EmptyState
              bare
              size="sm"
              icon={icons.games}
              title="No games match"
              description="Try clearing the filters."
              actionLabel="Clear filters"
              onAction={() => {}}
              secondaryLabel="Browse all"
              onSecondary={() => {}}
            />
          </Panel>
        </Grid>
      </Spec>

      <Spec id="F1.15" name="ErrorState" note="retry button with in-flight state">
        <Grid cols={2}>
          <Panel variant="flat" flush>
            <ErrorState
              bare
              onRetry={() => {
                setRetrying(true)
                setTimeout(() => setRetrying(false), 1600)
              }}
              retrying={retrying}
            />
          </Panel>
          <Panel variant="flat" flush>
            <ErrorState
              bare
              size="sm"
              title="Payment declined"
              description="The card terminal rejected the transaction."
              detail="ERR_TERMINAL_TIMEOUT / txn 8841"
              onRetry={() => {}}
              secondaryLabel="Pay later"
              onSecondary={() => {}}
            />
          </Panel>
        </Grid>
      </Spec>

      <Spec id="F1.16" name="Skeleton" note="base + card / row / tile / text presets">
        <Row label="base shapes">
          <Skeleton className="h-10 w-10" radius="full" />
          <Skeleton className="h-10 w-40" radius="md" />
          <Skeleton className="h-2 w-24" radius="sm" />
        </Row>
        <Row label="presets" stack>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonText lines={3} />
        </Row>
        <Grid cols={4}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonCard />
          <SkeletonCard />
        </Grid>
      </Spec>
    </>
  )
}
