/**
 * AgentBridge — the single seam between the launcher UI and the Windows machine
 * it runs on (F5.1).
 *
 * Stage 3 ships only this contract plus a mock implementation (F5.2). Stage 5
 * replaces the mock with a real transport to the native agent; nothing in the UI
 * changes, because the UI is only ever allowed to import from this file.
 *
 * Rules for every consumer:
 *  1. Never touch `window`, a WebSocket, or a local HTTP port directly. If the UI
 *     needs the PC to do something, it goes through `AgentBridge`.
 *  2. Every method is async and may reject with `AgentError`. There is no
 *     "assume it worked" path — a seat with no agent must render "unavailable"
 *     instead of a fake success (F5.4).
 *  3. Capabilities are asked for, not guessed. A PS5 seat has no NVIDIA panel and
 *     an AMD build has no NVIDIA profiles; the UI reads `AgentCapabilities`
 *     before rendering the tile.
 *  4. Copy never comes from the agent. Errors carry a `code` that the UI maps to
 *     `errors.<code>` in the dictionaries (F2.2), exactly like `ApiError`.
 */
import type { DisplayMode, MachineTelemetry } from '@/lib/types/machine'
import type { ID, ISODateTime } from '@/lib/types/common'

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

/**
 * Everything that can go wrong between the launcher and the PC. Kept separate
 * from `ApiErrorCode`: an agent failure is local and usually retryable by the
 * player, a server failure is not.
 */
export type AgentErrorCode =
  /** No agent is installed or it has not checked in — the F5.4 state. */
  | 'agentUnavailable'
  /** The agent answered, but this build cannot do it (wrong GPU, no panel). */
  | 'unsupported'
  /** The agent accepted the call and never answered in time. */
  | 'agentTimeout'
  /** Game is in the catalogue but not present on this disk. */
  | 'gameNotInstalled'
  /** A game is already running; the UI must offer "switch" or "close first". */
  | 'gameAlreadyRunning'
  /** `killGame` / telemetry for a process that is not up. */
  | 'gameNotRunning'
  /** The launcher's own store (Steam/Epic/Riot) refused to start. */
  | 'launcherFailed'
  /** Windows refused the operation — usually missing elevation. */
  | 'permissionDenied'
  /** Value outside the range the hardware reports (brightness, unknown mode). */
  | 'invalidValue'
  /** Action is blocked by club policy (e.g. restart during a paid session). */
  | 'blockedByPolicy'
  /** Unclassified agent-side crash. */
  | 'agentFailed'

/** Thrown by every `AgentBridge` method. `code` is the only thing the UI reads. */
export class AgentError extends Error {
  readonly code: AgentErrorCode
  /** Which native surface failed, when the call targeted one. */
  readonly target?: NativePanelTarget
  /** Raw agent text — for logs and the admin panel only, never for the player. */
  readonly detail?: string

  constructor(code: AgentErrorCode, options?: { target?: NativePanelTarget; detail?: string }) {
    super(code)
    this.name = 'AgentError'
    this.code = code
    this.target = options?.target
    this.detail = options?.detail
  }
}

/** Narrowing helper so `catch` blocks stay readable. */
export function isAgentError(error: unknown): error is AgentError {
  return error instanceof AgentError
}

/** Maps anything thrown into an `AgentError`, so the UI always has a code. */
export function toAgentError(error: unknown): AgentError {
  if (isAgentError(error)) return error
  return new AgentError('agentFailed', {
    detail: error instanceof Error ? error.message : String(error),
  })
}

/* ------------------------------------------------------------------ *
 * Native panels (F5.3)
 * ------------------------------------------------------------------ */

/**
 * The native Windows/vendor surfaces the launcher is allowed to open. Closed
 * union on purpose: adding a target means the agent has to implement it, so a
 * typo cannot silently become a dead tile.
 */
export type NativePanelTarget =
  | 'nvidia-control-panel'
  | 'mouse'
  | 'audio-output'
  | 'audio-input'
  | 'keyboard'
  | 'windows-display'

/** Iteration order for the "native settings" grid — single source of truth. */
export const NATIVE_PANEL_TARGETS = [
  'nvidia-control-panel',
  'windows-display',
  'audio-output',
  'audio-input',
  'mouse',
  'keyboard',
] as const satisfies readonly NativePanelTarget[]

/* ------------------------------------------------------------------ *
 * GPU (NVIDIA) profiles
 * ------------------------------------------------------------------ */

/**
 * A one-click GPU preset the agent applies through the vendor driver, so a
 * player never has to walk the NVIDIA Control Panel tree. `settings` is a
 * key/value summary for display; keys are dictionary keys, not prose.
 */
export interface NvidiaProfile {
  id: ID
  /** Dictionary key, e.g. `esports` — the label is never sent by the agent. */
  nameKey: string
  /** Ordered summary rows, e.g. `[{ key: 'latency', value: 'ultra' }]`. */
  settings: readonly { key: string; value: string }[]
  /** `true` for the profile currently active on the driver. */
  active: boolean
  /** Presets the club marks as recommended for competitive play. */
  recommended: boolean
}

/* ------------------------------------------------------------------ *
 * Capabilities and identity
 * ------------------------------------------------------------------ */

/**
 * What this particular PC can actually do. Read once on mount; the UI disables
 * (never hides silently) whatever is `false` and explains why.
 */
export interface AgentCapabilities {
  launchGames: boolean
  displayModes: boolean
  brightness: boolean
  telemetry: boolean
  /** `false` on AMD builds and consoles — no driver presets to offer. */
  nvidiaProfiles: boolean
  /** Lock/unlock the Windows session from the launcher. */
  workstationLock: boolean
  /** Reboot the seat — admin/staff flows only. */
  restart: boolean
  /** Only the panels present on this machine. */
  nativePanels: readonly NativePanelTarget[]
}

/** Handshake result: who we are talking to, and since when. */
export interface AgentInfo {
  machineId: ID
  /** Agent build, for the admin fleet view and bug reports. */
  version: string
  os: string
  /** `null` while the agent has never connected in this browser session. */
  connectedAt: ISODateTime | null
  capabilities: AgentCapabilities
}

/* ------------------------------------------------------------------ *
 * Games
 * ------------------------------------------------------------------ */

/**
 * Store the title is started through, as an **id the agent speaks**.
 *
 * Deliberately not the catalogue's `GameLauncher` (`lib/types/catalog.ts`), and
 * deliberately no longer sharing its name: that union is the *display* string the
 * club sells the title under ("Battle.net", "EA App" — fourteen of them, printed
 * verbatim on the library tile, F2.2), while this is the lowercase handle the
 * station's agent accepts on the wire, and a title whose store the agent has no id
 * for is `standalone` rather than absent. One name for two meanings compiled fine —
 * the modules never import each other — and read as one concept to anyone opening
 * either file. `LAUNCHER_MAP` in `mock-agent.ts` is the crossing between them.
 */
export type AgentLauncherId =
  | 'steam'
  | 'epic'
  | 'riot'
  | 'battlenet'
  | 'ea'
  | 'ubisoft'
  | 'standalone'

/**
 * One title as the *disk* sees it, joined to the catalogue by `gameId`. The
 * catalogue says what the club sells; this says what this seat can start right
 * now — the two are never assumed to match.
 */
export interface InstalledGame {
  gameId: ID
  launcher: AgentLauncherId
  installed: boolean
  /** Bytes on disk, for "needs 84 GB free" style copy. `null` when unknown. */
  sizeBytes: number | null
  /** Updating/verifying titles must not be presented as ready to play. */
  needsUpdate: boolean
  lastPlayedAt: ISODateTime | null
}

/** Lifecycle of a single start attempt, surfaced as a progress UI. */
export type GameLaunchPhase =
  | 'queued'
  | 'preparing'
  | 'startingLauncher'
  | 'launching'
  | 'running'
  | 'exited'
  | 'failed'

/** Progress tick pushed to `launchGame`'s `onProgress` callback. */
export interface GameLaunchProgress {
  launchId: ID
  gameId: ID
  phase: GameLaunchPhase
  /** 0–100. Monotonic within one launch. */
  percent: number
  /** Machine-readable step key for the dictionaries, e.g. `syncingCloudSaves`. */
  step?: string
}

/** Result of a completed start. Kept so `killGame` and telemetry have a subject. */
export interface GameLaunchHandle {
  launchId: ID
  gameId: ID
  pid: number | null
  startedAt: ISODateTime
}

export interface LaunchGameOptions {
  /** Progress ticks until the phase is terminal (`running` / `exited` / `failed`). */
  onProgress?: (progress: GameLaunchProgress) => void
  /** Cooperative cancel — the UI's "Cancel" button on the launch overlay. */
  signal?: AbortSignal
  /** Shared club login to use, when the title needs one (`HouseAccount.id`). */
  houseAccountId?: ID
}

/* ------------------------------------------------------------------ *
 * Display and brightness
 * ------------------------------------------------------------------ */

/**
 * Applied mode plus the safety window. Display changes are applied
 * provisionally: if the player does not confirm before `revertAt`, the agent
 * puts the old mode back, so a wrong resolution can never brick a paid seat.
 */
export interface AppliedDisplayMode {
  mode: DisplayMode
  previous: DisplayMode
  /** `null` when the change was applied permanently. */
  revertAt: ISODateTime | null
}

export interface SetDisplayModeOptions {
  /** Seconds before an unconfirmed change rolls back. Default is agent-side. */
  confirmWithinSec?: number
}

/* ------------------------------------------------------------------ *
 * Workstation control
 * ------------------------------------------------------------------ */

/** Why the seat was locked — drives the copy on the native lock overlay. */
export type LockReason = 'sessionEnded' | 'break' | 'paymentRequired' | 'staff'

export interface RestartOptions {
  /** Countdown shown to the player before the reboot. */
  delaySec?: number
  reason?: 'update' | 'maintenance' | 'staff'
}

/* ------------------------------------------------------------------ *
 * The bridge
 * ------------------------------------------------------------------ */

/**
 * The whole PC-side surface of the product. Implemented by `mock-agent.ts` in
 * Stage 3 (F5.2) and by the real transport in Stage 5; `docs/AGENT-CONTRACT.md`
 * (F5.5) is written straight off this interface.
 */
export interface AgentBridge {
  /* -- handshake ---------------------------------------------------- */

  /**
   * `true` when a real agent answered the handshake. Everything else in the UI
   * that touches hardware is gated on this (F5.4).
   */
  isAvailable(): Promise<boolean>

  /** Identity + capabilities. Rejects `agentUnavailable` when there is no agent. */
  getInfo(): Promise<AgentInfo>

  /* -- games -------------------------------------------------------- */

  /** Titles present on this disk, joined to the catalogue by `gameId`. */
  getInstalledGames(): Promise<InstalledGame[]>

  /**
   * Starts a title and resolves once it is actually `running`.
   * Rejects `gameNotInstalled`, `gameAlreadyRunning`, or `launcherFailed`.
   */
  launchGame(gameId: ID, options?: LaunchGameOptions): Promise<GameLaunchHandle>

  /** Closes the running title. Rejects `gameNotRunning`. */
  killGame(gameId: ID): Promise<void>

  /* -- display ------------------------------------------------------ */

  /** Modes the attached monitor reports, best first. */
  getDisplayModes(): Promise<DisplayMode[]>

  /**
   * Applies a mode from `getDisplayModes()`. Rejects `invalidValue` for anything
   * the monitor did not report. Auto-reverts unless confirmed (see
   * `AppliedDisplayMode.revertAt`).
   */
  setDisplayMode(mode: DisplayMode, options?: SetDisplayModeOptions): Promise<AppliedDisplayMode>

  /** Keeps the last provisional mode. No-op when nothing is pending. */
  confirmDisplayMode(): Promise<void>

  /** Panel brightness, `0`–`100`. Rejects `unsupported` on fixed-output panels. */
  setBrightness(percent: number): Promise<number>

  /* -- gpu profiles -------------------------------------------------- */

  /** Driver presets available on this GPU. `[]` when `nvidiaProfiles` is false. */
  getNvidiaProfiles(): Promise<NvidiaProfile[]>

  /**
   * Applies a preset by id and returns the refreshed list. Rejects
   * `unsupported` on non-NVIDIA seats and `invalidValue` for unknown ids.
   */
  applyNvidiaProfile(profileId: ID): Promise<NvidiaProfile[]>

  /* -- native panels ------------------------------------------------ */

  /**
   * Opens a vendor/OS panel on top of the launcher. Rejects `unsupported` when
   * the target is absent from `capabilities.nativePanels` — the UI must show
   * "unavailable on this PC" rather than a fake success (F5.4).
   */
  openNativePanel(target: NativePanelTarget): Promise<void>

  /* -- telemetry ---------------------------------------------------- */

  /**
   * One live reading for the overlay and the admin fleet view. Polled while a
   * session is active; the caller owns the interval so there is exactly one.
   */
  getTelemetry(): Promise<MachineTelemetry>

  /* -- workstation -------------------------------------------------- */

  /** Locks Windows itself, so leaving the launcher cannot expose the desktop. */
  lockWorkstation(reason?: LockReason): Promise<void>

  /** Releases a lock this launcher owns. Rejects `permissionDenied` otherwise. */
  unlockWorkstation(): Promise<void>

  /** Reboots the seat. Rejects `blockedByPolicy` during a paid session. */
  restartMachine(options?: RestartOptions): Promise<void>
}

/**
 * Capabilities of a seat with no agent. Used as the render input whenever
 * `isAvailable()` is `false`, so "no agent" is a normal, fully-typed UI state.
 */
export const NO_AGENT_CAPABILITIES: AgentCapabilities = {
  launchGames: false,
  displayModes: false,
  brightness: false,
  telemetry: false,
  nvidiaProfiles: false,
  workstationLock: false,
  restart: false,
  nativePanels: [],
}
