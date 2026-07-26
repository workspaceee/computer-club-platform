import type { Cents, Coins, ID, ISODateTime } from './common'

export type TournamentFormat = 'single-elim' | 'double-elim' | 'round-robin' | 'swiss'

/**
 * `tournaments.status`. `check-in` is the window where the client shows the
 * call-up banner and the player has to confirm attendance (MVP §5.10).
 */
export type TournamentStatus =
  | 'draft'
  | 'announced'
  | 'check-in'
  | 'running'
  | 'finished'
  | 'cancelled'

/** Prize description is free-form per place so admin can promise anything. */
export interface TournamentPrize {
  place: number
  label: string
  coins?: Coins
  cents?: Cents
}

export interface Tournament {
  id: ID
  name: string
  gameId: ID
  startsAt: ISODateTime
  format: TournamentFormat
  /** Entry fee. Either money or coins may be zero — both may be set. */
  feeCents: Cents
  feeCoins: Coins
  prizes: TournamentPrize[]
  slots: number
  slotsTaken: number
  status: TournamentStatus
}

export interface TournamentEntry {
  tournamentId: ID
  /** Solo events use `userId`; team events use `teamId`. */
  userId: ID | null
  teamId: ID | null
  checkedIn: boolean
  seed: number | null
}
