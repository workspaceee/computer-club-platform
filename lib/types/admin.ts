import type { ID, ISODateTime } from './common'

/** Staff seniority. Separate from `UserRole`, which describes club guests. */
export type StaffRole = 'operator' | 'manager' | 'owner'

export interface StaffMember {
  id: ID
  clubId: ID
  nickname: string
  role: StaffRole
  active: boolean
}

/** What an audit entry points at (`audit_log.target_type`). */
export type AuditTargetType =
  | 'session'
  | 'tab'
  | 'order'
  | 'pass'
  | 'user'
  | 'machine'
  | 'tournament'
  | 'booking'
  | 'settings'

/**
 * `audit_log` — append-only record of every staff action. Written for anything
 * that touches money, time or another person's account.
 */
export interface AuditEntry {
  id: ID
  actorStaffId: ID
  action: string
  targetType: AuditTargetType
  targetId: ID
  /** Free-form diff/context; shape depends on `action`. */
  payload: Record<string, unknown>
  createdAt: ISODateTime
}
