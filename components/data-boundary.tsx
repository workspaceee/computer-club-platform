'use client'

/**
 * One place where `loading` / `empty` / `error` are decided for a data surface.
 *
 * Definition of Done (docs/PLAN.md §0.3) demands all three states on every
 * screen. Before this component each view only drew skeletons, so a failed mock
 * call left an empty area with no way back. Now a surface is written once:
 *
 * ```tsx
 * const games = useApi(['games', query], () => fetchGames({ search: query }))
 *
 * <DataBoundary
 *   state={games}
 *   loading={<GameGridSkeleton />}
 *   isEmpty={(page) => page.items.length === 0}
 *   empty={<EmptyState title={t('games.noResults')} />}
 * >
 *   {(page) => <GameGrid items={page.items} />}
 * </DataBoundary>
 * ```
 *
 * Error copy comes from the `errors` namespace keyed by `ApiError.code` (F2.2),
 * so failures are localized like everything else and the guest never sees a
 * stack trace — only the code as a small technical detail.
 */

import { ErrorState } from '@/components/ui/error-state'
import type { ApiState } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import type { ApiErrorCode } from '@/lib/mock/api'

/**
 * Every `ApiErrorCode` has a matching `errors.<code>` string in all three
 * dictionaries, so the code doubles as the translation key. Adding a code to
 * `lib/mock/api/client.ts` without its copy is a TypeScript error in `en.ts`.
 */
function titleKey(code: ApiErrorCode): TKey {
  return `errors.${code}` as TKey
}

/** Connection-shaped failures get the "check the cable / call staff" copy. */
function bodyKey(code: ApiErrorCode): TKey {
  return code === 'network' || code === 'timeout' ? 'errors.networkBody' : 'errors.genericBody'
}

interface ApiErrorStateProps {
  state: ApiState<unknown>
  size?: 'sm' | 'md'
  bare?: boolean
  className?: string
}

/**
 * Localized `<ErrorState>` wired to a `useApi` result. Exported on its own for
 * surfaces that cannot use the render-prop form (e.g. the hero carousel, which
 * owns slide state above the fetch).
 */
export function ApiErrorState({ state, size = 'md', bare, className }: ApiErrorStateProps) {
  const { t } = useT()
  const error = state.error

  return (
    <ErrorState
      title={t(titleKey(error?.code ?? 'generic'))}
      description={t(bodyKey(error?.code ?? 'generic'))}
      detail={error ? `${error.status} · ${error.code}` : undefined}
      onRetry={state.retry}
      retryLabel={t('common.retry')}
      retrying={state.retrying}
      size={size}
      bare={bare}
      className={className}
    />
  )
}

interface DataBoundaryProps<T> {
  state: ApiState<T>
  /** Skeleton for the first load. Should match the real layout's footprint. */
  loading: React.ReactNode
  /** Rendered with the resolved payload. */
  children: (data: T) => React.ReactNode
  /** Decides whether a *successful* response counts as empty. */
  isEmpty?: (data: T) => boolean
  /** Usually an `<EmptyState>`; omit to render nothing when empty. */
  empty?: React.ReactNode
  errorSize?: 'sm' | 'md'
  errorBare?: boolean
  errorClassName?: string
}

export function DataBoundary<T>({
  state,
  loading,
  children,
  isEmpty,
  empty,
  errorSize,
  errorBare,
  errorClassName,
}: DataBoundaryProps<T>) {
  // Nothing has ever loaded: the failure is the only thing worth showing.
  if (state.data === undefined) {
    if (state.error) {
      return (
        <ApiErrorState
          state={state}
          size={errorSize}
          bare={errorBare}
          className={errorClassName}
        />
      )
    }
    if (state.isLoading) return <>{loading}</>
    return <>{empty ?? null}</>
  }

  // A background refresh failed but we still hold a good payload — keep the data
  // on screen (stale beats blank) and let the next revalidation recover.
  if (isEmpty?.(state.data)) return <>{empty ?? null}</>
  return <>{children(state.data)}</>
}
