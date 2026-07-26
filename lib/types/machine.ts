import type { Cents, ID, ISODateTime } from './common'

/** `zones.class` — drives pricing and which passes apply. */
export type ZoneClass = 'vip' | 'standard' | 'ps5'

export interface Zone {
  id: ID
  clubId: ID
  name: string
  class: ZoneClass
  hourlyPriceCents: Cents
}

/**
 * `machines.status`. `offline` means the agent has not checked in — the UI must
 * show that honestly instead of pretending the seat is free (F5.4).
 */
export type MachineStatus = 'free' | 'occupied' | 'reserved' | 'maintenance' | 'offline'

/** `machines.specs_json` — shown on the seat picker and the attract screen. */
export interface MachineSpecs {
  cpu: string
  gpu: string
  ram: string
  monitor: string
  refreshHz: number
}

export interface Machine {
  id: ID
  clubId: ID
  zoneId: ID
  label: string
  status: MachineStatus
  specs: MachineSpecs
  /** `null` when the Windows agent has never connected. */
  agentLastSeen: ISODateTime | null
}

/** One entry of the display mode list the agent reports (F5.1). */
export interface DisplayMode {
  width: number
  height: number
  refreshHz: number
}

/**
 * `machine_settings` — per-seat hardware state for the current session only.
 * Reset on logout, unlike `UserPreferences` in `settings.ts` which follows the
 * member between PCs.
 */
export interface MachineSettings {
  machineId: ID
  sessionId: ID | null
  brightness: number
  displayMode: DisplayMode
  audioOutId: string
  audioInId: string
  appliedAt: ISODateTime
}

/** Live readings from the agent, polled while the session is active. */
export interface MachineTelemetry {
  fps: number
  pingMs: number
  cpuTempC: number
  gpuTempC: number
  cpuLoadPct: number
  gpuLoadPct: number
  diskUsedPct: number
}

/** Occupancy summary for the lock screen and the attract mode free-seats slide. */
export interface ZoneOccupancy {
  zoneId: ID
  zoneName: string
  class: ZoneClass
  free: number
  total: number
}
