/**
 * What the pocket behind the clock is called, and what it costs (C2.2).
 *
 * Both tables are keyed off the **closed** `TimeSource` union on purpose: adding
 * a source stops the build here instead of rendering a blank micro-label in the
 * top bar or an empty paragraph under a heading that promised one.
 *
 * They live in `lib/` rather than in a component because three surfaces now state
 * the same fact — the HUD plate, the "My session" panel and the home card (C3.3)
 * — and a per-file copy is exactly how one of them ends up naming `staff` time a
 * purchase after somebody edits the other two.
 */
import type { TKey } from '@/lib/i18n/types'
import type { TimeSource } from '@/lib/types/session'

/** The pocket, in two or three words: "Pass", "Wallet", "From the admin". */
export const SOURCE_LABEL: Record<TimeSource, TKey> = {
  pass: 'session.sourcePass',
  wallet: 'session.sourceWallet',
  staff: 'session.sourceStaff',
  postpaid: 'session.sourcePostpaid',
}

/** What spending from that pocket means, as a sentence. */
export const SPENDING_BODY: Record<TimeSource, TKey> = {
  pass: 'session.spendingPass',
  wallet: 'session.spendingWallet',
  staff: 'session.spendingStaff',
  postpaid: 'session.spendingPostpaid',
}
