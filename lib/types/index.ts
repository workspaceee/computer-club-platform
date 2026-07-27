/**
 * Domain types for the whole product (F3.1).
 *
 * One file per domain, mirroring the data model in MVP §9.4. Import from the
 * domain module when you only need one area (`@/lib/types/session`), or from
 * this barrel when a file spans several (`@/lib/types`).
 */
export type * from './common'
export type * from './user'
export type * from './machine'
export type * from './session'
export type * from './pass'
export type * from './tab'
export type * from './catalog'
export type * from './order'
export type * from './loyalty'
export type * from './social'
export type * from './tournament'
export type * from './promo'
export type * from './booking'
export type * from './notification'
export type * from './settings'
export type * from './admin'
