'use client'

/**
 * The single way a screen reads data (closes the F3.4 tail).
 *
 * `lib/mock/api/*` is already a network: every call is async, takes 200–600 ms
 * and can fail on purpose. This hook is the client half of that contract, so no
 * component ever has to think about transport again:
 *
 *  - errors are normalized to `ApiError`, so the UI always has a `code` to
 *    translate (`errors.<code>`) and never renders a raw JS message;
 *  - SWR's silent background retry is off — a failure must be *visible* and
 *    recovered with an explicit "Retry" (F1.15), not hidden behind a spinner;
 *  - `retry()` / `retrying` are ready to hand straight to `<ErrorState>`.
 *
 * Pair it with `<DataBoundary>` and a data surface gets loading / empty / error
 * for free (docs/PLAN.md §0.3). When the real backend lands in Stage 4, only the
 * fetcher passed in here changes.
 */

import { useCallback, useState } from 'react'
import useSWR, { type SWRConfiguration, useSWRConfig } from 'swr'
import type { Key, SWRResponse } from 'swr'
import { type ApiError, toApiError } from '@/lib/mock/api'

/**
 * Does an SWR key sit under one of these prefixes?
 *
 * One definition for both ways a read goes stale — a pushed event
 * (`EVENT_INVALIDATES`, `useRealtimeRevalidation`) and a mutation this client
 * just made (`useInvalidate`). Two copies of this rule would be two answers to
 * "is `['loyalty/battlepass', email]` part of the loyalty family", and the pass
 * would refresh on the club's news but not on the player's own claim.
 */
export function keyMatches(key: unknown, prefixes: readonly string[]): boolean {
  const head =
    typeof key === 'string' ? key : Array.isArray(key) && typeof key[0] === 'string' ? key[0] : null
  if (head === null) return false
  return prefixes.some((prefix) => head === prefix || head.startsWith(`${prefix}/`))
}

/**
 * Revalidates every read under the given key prefixes.
 *
 * For the writes whose effects reach further than the endpoint that was called:
 * claiming a quest pays coins *and* moves season XP, so a card that only
 * re-read its own list would leave the Battle Pass beside it a level behind
 * until the next push. The server is the one that knows both numbers, so the
 * fix is to re-ask it rather than to patch two caches by hand.
 */
export function useInvalidate(): (...prefixes: string[]) => Promise<void> {
  const { mutate } = useSWRConfig()
  return useCallback(
    async (...prefixes: string[]) => {
      await mutate((key: unknown) => keyMatches(key, prefixes))
    },
    [mutate],
  )
}

export interface ApiState<T> {
  /** Last successful payload. Stays put while a retry is in flight. */
  data: T | undefined
  /** Set only when the latest attempt failed. */
  error: ApiError | undefined
  /** First load, nothing to show yet. */
  isLoading: boolean
  /** A revalidation is running (initial load included). */
  isValidating: boolean
  /** A user-triggered retry is running — drives the button spinner. */
  retrying: boolean
  /** Re-runs the request. Safe to pass directly to `onRetry`. */
  retry: () => void
  mutate: SWRResponse<T, ApiError>['mutate']
}

export function useApi<T>(
  key: Key,
  fetcher: () => Promise<T>,
  config?: SWRConfiguration<T, ApiError>,
): ApiState<T> {
  const swr = useSWR<T, ApiError>(
    key,
    async () => {
      try {
        return await fetcher()
      } catch (error) {
        // Anything thrown becomes an ApiError, so `error.code` is always safe to
        // look up in the dictionaries.
        throw toApiError(error)
      }
    },
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      ...config,
    },
  )

  const [retrying, setRetrying] = useState(false)
  const { mutate } = swr

  const retry = useCallback(() => {
    setRetrying(true)
    void mutate().finally(() => setRetrying(false))
  }, [mutate])

  return {
    data: swr.data,
    error: swr.error,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    retrying,
    retry,
    mutate,
  }
}
