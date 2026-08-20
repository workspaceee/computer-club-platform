'use client'

/**
 * The selling panel of the idle screen (C1.8).
 *
 * One panel, six kinds of content: tonight's tournament, free seats per zone, the
 * bar's promoted items, the season ladder, the battle pass and marketing's own
 * campaigns. It stands in the lower-left corner the promo banners already reserve
 * for copy, clear of the centred clock and above the crawl — so a walk-in reads
 * the club's offer without the composition of the screen changing under them
 * every nine seconds.
 *
 * Three decisions worth keeping:
 *
 *  - **`aria-hidden`, deliberately.** The crawl along the bottom already carries
 *    every live campaign as text, and an idle kiosk has no reader in front of it.
 *    Announcing a rotating panel once every nine seconds would bury the one
 *    sentence that matters — "move the mouse to unlock".
 *  - **T3, no neon (docs/DESIGN.md §4.2).** The panel is already the brightest
 *    thing on the frame and carries a red spine; the screen spends its single
 *    animated ring on the wake hint, the only actionable element it has.
 *  - **Copy is DOM text over the art, never baked into it.** Same rule as the
 *    banners (F7.3): it has to survive a translation and a price change.
 */

import { Money } from '@/components/ui/money'
import { icons, type LucideIcon } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { AttractSlide } from '@/hooks/use-attract-playlist'
import type { RewardType } from '@/lib/types/loyalty'
import type { PromoKind } from '@/lib/types/promo'
import { cn } from '@/lib/utils'

/** Mirrors the promo strip on Home so a campaign is recognisable on both screens. */
const KIND_ICONS: Record<PromoKind, LucideIcon> = {
  sale: icons.sale,
  tournament: icons.tournament,
  battlepass: icons.season,
  event: icons.calendar,
}

/** What a battle-pass rung hands over, at a glance. */
const REWARD_ICONS: Record<RewardType, LucideIcon> = {
  time: icons.timer,
  product: icons.shop,
  merch: icons.merch,
  coins: icons.coins,
  cosmetic: icons.sticker,
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

export function AttractShowcase({ slide }: { slide: AttractSlide }) {
  const { t, tp } = useT()

  switch (slide.kind) {
    /* A room shot on its own says everything it has to say. */
    case 'frame':
      return null

    case 'promo': {
      const Icon = KIND_ICONS[slide.promo.kind]
      return (
        <Panel kicker={slide.promo.badge} icon={Icon} title={slide.promo.title}>
          <Lede>{slide.promo.subtitle}</Lede>
        </Panel>
      )
    }

    case 'tournament': {
      const { tournament, startsInMinutes } = slide
      const hours = Math.floor(startsInMinutes / 60)
      const when =
        hours >= 1 ? tp('common.hours', hours) : tp('common.minutes', Math.max(1, startsInMinutes))
      const prize = tournament.prizes[0]

      return (
        <Panel
          kicker={t('attract.tournamentKicker')}
          icon={icons.tournament}
          title={tournament.name}
        >
          <Lede>{tournament.gameName}</Lede>
          <Stats>
            <Stat
              icon={icons.timer}
              label={
                startsInMinutes > 0
                  ? t('attract.tournamentStartsIn', { when })
                  : t('attract.tournamentLive')
              }
              // The countdown is the reason to walk in, so it carries the accent
              // instead of the entry fee — the fee is an objection, not a hook.
              tone="primary"
            />
            {prize && <Stat icon={icons.gift} label={prize.label} />}
            {tournament.slotsFree > 0 && (
              <Stat icon={icons.community} label={tp('common.slots', tournament.slotsFree)} />
            )}
            <Stat
              icon={icons.payment}
              label={
                tournament.feeCents > 0 ? (
                  <Money value={tournament.feeCents} fromCents size="xs" tone="default" />
                ) : tournament.feeCoins > 0 ? (
                  tp('common.coins', tournament.feeCoins)
                ) : (
                  t('attract.tournamentFree')
                )
              }
            />
          </Stats>
        </Panel>
      )
    }

    case 'seats': {
      const { zones, free, total } = slide
      return (
        <Panel
          kicker={t('attract.seatsKicker')}
          icon={icons.display}
          title={free > 0 ? tp('attract.seatsTitle', free) : t('attract.seatsFull')}
        >
          <Lede>
            {free > 0 ? t('attract.seatsSubtitle', { total }) : t('attract.seatsFullBody')}
          </Lede>
          <Rows>
            {zones.map((zone) => (
              <Row key={zone.zoneId} name={zone.zoneName}>
                {/* A number and a bar, not a colour: "3 of 12" is the same fact
                    for a walk-in with red-green blindness as for anyone else. */}
                <span className="flex items-center gap-2.5">
                  <span className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.07] md:w-20">
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        zone.free > 0 ? 'bg-success' : 'bg-text-low',
                      )}
                      style={{ width: `${(zone.free / zone.total) * 100}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      'font-clock text-xs font-semibold tabular-nums',
                      zone.free > 0 ? 'text-text-high' : 'text-text-low',
                    )}
                  >
                    {t('attract.seatsZoneFree', { free: zone.free, total: zone.total })}
                  </span>
                </span>
              </Row>
            ))}
          </Rows>
        </Panel>
      )
    }

    case 'bar':
      return (
        <Panel kicker={t('attract.barKicker')} icon={icons.drinks} title={t('attract.barTitle')}>
          <Lede>{t('attract.barSubtitle')}</Lede>
          <Rows>
            {slide.items.map((item) => (
              <Row key={item.id} name={item.name} badge={item.tag}>
                <Money value={item.priceCents} fromCents size="sm" />
              </Row>
            ))}
          </Rows>
        </Panel>
      )

    case 'ladder':
      return (
        <Panel
          kicker={t('attract.ladderKicker')}
          icon={icons.rewards}
          title={t('attract.ladderTitle')}
        >
          <Rows>
            {slide.entries.map((entry) => (
              <Row
                key={entry.rank}
                // The rank is the row's identity, so it sits in the display face
                // rather than reading as another metric on the right.
                lead={
                  <span
                    className={cn(
                      'w-5 font-clock text-sm font-bold tabular-nums',
                      entry.rank === 1 ? 'text-primary' : 'text-text-low',
                    )}
                  >
                    {entry.rank}
                  </span>
                }
                // `isCurrentUser` is ignored on purpose: nobody is signed in at an
                // idle kiosk, so highlighting the fixture's member would be a lie.
                name={entry.nickname}
              >
                <span className="font-clock text-xs font-semibold tabular-nums text-text-medium">
                  {t('attract.ladderHours', { n: entry.hours })}
                </span>
              </Row>
            ))}
          </Rows>
        </Panel>
      )

    case 'pass':
      return (
        <Panel kicker={t('attract.passKicker')} icon={icons.season} title={slide.season.name}>
          <Lede>{t('attract.passSubtitle')}</Lede>
          <Stats>
            <Stat
              icon={icons.calendar}
              label={tp('attract.passDaysLeft', slide.daysLeft)}
              tone="primary"
            />
            <Stat
              icon={icons.level}
              label={t('attract.passLevels', { n: slide.season.levels })}
            />
          </Stats>
          <Rows>
            {slide.perks.map((perk) => {
              const Icon = REWARD_ICONS[perk.rewardType]
              return (
                <Row
                  key={`${perk.track}-${perk.level}`}
                  lead={<Icon size={13} className="text-primary" />}
                  name={perk.label}
                >
                  <span className="label-mono text-[10px] text-text-low">
                    {`LVL ${perk.level}`}
                  </span>
                </Row>
              )
            })}
          </Rows>
        </Panel>
      )
  }
}

/* ------------------------------------------------------------------ */
/*  Parts                                                              */
/* ------------------------------------------------------------------ */

/**
 * The frame every kind shares. One shell rather than six panels: this is the
 * corner of the screen a walk-in learns to look at, and a tournament slide that
 * is 8 px wider than the bar slide reads as the screen twitching.
 */
function Panel({
  kicker,
  icon: Icon,
  title,
  children,
}: {
  kicker: string
  icon: LucideIcon
  title: string
  children?: React.ReactNode
}) {
  return (
    <div aria-hidden className="glass rounded-xl border-l-2 border-l-primary p-5 md:p-6">
      <span className="label-mono flex items-center gap-1.5 text-[10px] tracking-[0.28em] text-primary">
        <Icon size={12} />
        {kicker}
      </span>
      <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-tight text-text-high text-balance md:text-2xl">
        {title}
      </h2>
      {children}
    </div>
  )
}

/** The one-line pitch under the headline. */
function Lede({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm leading-relaxed text-text-medium text-pretty">{children}</p>
}

/** Facts about one thing, on a rule: countdown, prize, seats left, entry. */
function Stats({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3.5">
      {children}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: LucideIcon
  label: React.ReactNode
  tone?: 'default' | 'primary'
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-text-medium">
      <Icon size={13} className={tone === 'primary' ? 'text-primary' : 'text-text-low'} />
      <span className={tone === 'primary' ? 'text-text-high' : undefined}>{label}</span>
    </span>
  )
}

/** A short list of comparable things: zones, bar items, ladder rows, pass rungs. */
function Rows({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">{children}</div>
  )
}

function Row({
  lead,
  name,
  badge,
  children,
}: {
  lead?: React.ReactNode
  name: string
  /** The admin's marketing badge on a bar item ("Popular", "Save 15%"). */
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      {lead}
      <span className="min-w-0 flex-1 truncate text-sm text-text-high">{name}</span>
      {badge && (
        <span className="label-mono shrink-0 rounded-full border border-primary/25 px-2 py-0.5 text-[9px] tracking-[0.2em] text-primary">
          {badge}
        </span>
      )}
      <span className="shrink-0">{children}</span>
    </div>
  )
}
