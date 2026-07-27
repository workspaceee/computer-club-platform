'use client'

import { useT } from '@/lib/i18n/provider'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { navItem } from '@/lib/launcher-nav'
import type { LauncherView } from '@/lib/launcher-nav'

/**
 * Placeholder for a section whose screen is scheduled but not built yet (F6.2).
 *
 * The navigation is complete from the start so the shell, keyboard order and
 * section numbering can be finished in stage 0 — but an unbuilt section says so
 * plainly and names the task that will fill it, instead of showing invented
 * numbers (docs/PLAN.md §0.2, rule 6).
 */
export function PendingView({ view }: { view: LauncherView }) {
  const { t } = useT()
  const item = navItem(view)
  const label = t(item.labelKey)

  return (
    <section aria-labelledby={`section-${view}`}>
      <SectionHeader headingId={`section-${view}`} index={item.index} title={label} as="h1" />
      <EmptyState
        icon={item.icon}
        title={t('nav.pendingTitle')}
        description={t('nav.pendingBody', { task: item.pendingTask ?? '—' })}
      />
    </section>
  )
}
