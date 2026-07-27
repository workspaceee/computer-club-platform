// MOCK ONLY — replaced in Stage 5 by the real transport to the Windows agent.
//
// A believable stand-in for the native agent (F5.2). It exists so every
// hardware-facing screen can be built, demoed and screenshotted before a single
// line of C# is written, and so the UI is forced to deal with real-world
// behaviour: latency, multi-step launches, hardware that refuses, telemetry that
// drifts, and seats where the agent simply is not there (F5.4).
//
// Rules:
//  1. Only `bridge.ts` types cross the boundary. The UI imports `mockAgent`
//     through `AgentBridge`, never these internals.
//  2. State lives in this module, not in the store: a real agent owns the
//     hardware state and the UI only mirrors it.
//  3. Failures are `AgentError` with a code the dictionaries translate. No prose.
import {
  AgentError,
  NATIVE_PANEL_TARGETS,
  NO_AGENT_CAPABILITIES,
  type AgentBridge,
  type AgentCapabilities,
  type AgentInfo,
  type AppliedDisplayMode,
  type GameLauncher,
  type GameLaunchHandle,
  type GameLaunchPhase,
  type InstalledGame,
  type LaunchGameOptions,
  type LockReason,
  type NativePanelTarget,
  type NvidiaProfile,
  type RestartOptions,
  type SetDisplayModeOptions,
} from '@/lib/agent/bridge'
import { db, getMachine } from '@/lib/mock/db'
import type { DisplayMode, MachineTelemetry } from '@/lib/types/machine'
import type { ID } from '@/lib/types/common'

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

/** mulberry32 — same seed, same demo, so screenshots are reproducible. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = makeRng(0x5e47)

function between(min: number, max: number): number {
  return min + rng() * (max - min)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms * config.latencyFactor)))
}

/** Local ISO stamp for agent-side events (the PC's clock, not the server's). */
function nowIso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

/* ------------------------------------------------------------------ *
 * Tunables — driven by the dev panel and by tests
 * ------------------------------------------------------------------ */

interface MockAgentConfig {
  /** `false` reproduces a seat with no agent installed (F5.4). */
  available: boolean
  /** `0` = instant for tests, `1` = the demo feel, `4` = a tired old PC. */
  latencyFactor: number
  /** Chance a `launchGame` call dies half-way with `launcherFailed`. */
  launchFailureRate: number
  /** Overrides applied on top of the capabilities derived from the seat specs. */
  capabilityOverrides: Partial<AgentCapabilities>
}

const config: MockAgentConfig = {
  available: true,
  latencyFactor: 1,
  launchFailureRate: 0,
  capabilityOverrides: {},
}

/* ------------------------------------------------------------------ *
 * Hardware profile derived from the seat
 * ------------------------------------------------------------------ */

/** Monitor ladders keyed by the panel the seat actually has. */
const MODE_LADDERS = {
  qhd360: buildModes([
    [2560, 1440, [360, 240, 165, 144, 120, 60]],
    [1920, 1080, [360, 240, 144, 60]],
    [1280, 960, [240, 144, 60]],
    [1280, 720, [240, 144, 60]],
  ]),
  fhd240: buildModes([
    [1920, 1080, [240, 165, 144, 120, 60]],
    [1680, 1050, [144, 60]],
    [1440, 1080, [240, 144, 60]],
    [1280, 960, [240, 144, 60]],
    [1024, 768, [144, 60]],
  ]),
  uhd120: buildModes([
    [3840, 2160, [120, 60]],
    [2560, 1440, [120, 60]],
    [1920, 1080, [120, 60]],
  ]),
} as const

function buildModes(rows: Array<[number, number, number[]]>): DisplayMode[] {
  return rows.flatMap(([width, height, rates]) =>
    rates.map((refreshHz) => ({ width, height, refreshHz })),
  )
}

interface HardwareProfile {
  isConsole: boolean
  isNvidia: boolean
  modes: DisplayMode[]
  /** FPS a AAA title reaches on this GPU — telemetry is scaled off it. */
  fpsCeiling: number
  /** Idle package temperatures, in °C. */
  idleCpuTempC: number
  idleGpuTempC: number
}

function hardware(): HardwareProfile {
  const machine = getMachine(db.currentMachineId)
  const gpu = machine?.specs.gpu ?? 'NVIDIA RTX 4070 12GB'
  const monitor = machine?.specs.monitor ?? ''
  const refreshHz = machine?.specs.refreshHz ?? 240
  const isConsole = /PS5|RDNA/i.test(gpu)
  const is4090 = gpu.includes('4090')
  const is4080 = gpu.includes('4080')

  const modes = isConsole
    ? MODE_LADDERS.uhd120
    : /QHD|1440/i.test(monitor) || refreshHz >= 300
      ? MODE_LADDERS.qhd360
      : MODE_LADDERS.fhd240

  return {
    isConsole,
    isNvidia: /NVIDIA/i.test(gpu),
    modes: modes.slice(),
    fpsCeiling: isConsole ? 120 : is4090 ? 420 : is4080 ? 340 : 260,
    idleCpuTempC: isConsole ? 40 : 38,
    idleGpuTempC: isConsole ? 42 : 35,
  }
}

const hw = hardware()

function capabilities(): AgentCapabilities {
  const panels: NativePanelTarget[] = hw.isConsole
    ? []
    : NATIVE_PANEL_TARGETS.filter(
        (target) => target !== 'nvidia-control-panel' || hw.isNvidia,
      )

  return {
    launchGames: true,
    displayModes: !hw.isConsole,
    // The FHD office panels in the Arena have no DDC/CI brightness control.
    brightness: !hw.isConsole,
    telemetry: true,
    nvidiaProfiles: hw.isNvidia && !hw.isConsole,
    workstationLock: !hw.isConsole,
    restart: true,
    nativePanels: panels,
    ...config.capabilityOverrides,
  }
}

/* ------------------------------------------------------------------ *
 * Installed games
 * ------------------------------------------------------------------ */

/** Catalogue launcher label → the `GameLauncher` union the agent speaks. */
const LAUNCHER_MAP: Record<string, GameLauncher> = {
  Steam: 'steam',
  Epic: 'epic',
  Riot: 'riot',
  'Battle.net': 'battlenet',
  'EA App': 'ea',
  Ubisoft: 'ubisoft',
}

/** Titles the club keeps on every disk — always ready, never mid-update. */
const ALWAYS_INSTALLED = new Set(['cs2', 'valorant', 'dota2', 'lol', 'fortnite', 'apex'])
/** Deliberately not on this disk, so "install required" has to be designed. */
const NEVER_INSTALLED = new Set(['tarkov', 'ffxiv', 'starfield', 'cities2', 'pes'])
/** Mid-patch on purpose — must not be presented as playable. */
const UPDATING = new Set(['bo6', 'warzone', 'fifa25'])

function buildInstalled(): Map<ID, InstalledGame> {
  const seedRng = makeRng(0x1d09)
  const map = new Map<ID, InstalledGame>()

  for (const game of db.games) {
    const installed = ALWAYS_INSTALLED.has(game.id)
      ? true
      : NEVER_INSTALLED.has(game.id)
        ? false
        : seedRng() < 0.78
    const playedDaysAgo = Math.floor(seedRng() * 40)

    map.set(game.id, {
      gameId: game.id,
      launcher: LAUNCHER_MAP[game.launcher] ?? 'standalone',
      installed,
      sizeBytes: installed ? Math.round((8 + seedRng() * 140) * 1024 ** 3) : null,
      needsUpdate: installed && UPDATING.has(game.id),
      lastPlayedAt: installed && seedRng() < 0.5 ? nowIso(-playedDaysAgo * 86_400_000) : null,
    })
  }

  return map
}

const installedGames = buildInstalled()

/* ------------------------------------------------------------------ *
 * NVIDIA driver presets
 * ------------------------------------------------------------------ */

const nvidiaProfiles: NvidiaProfile[] = [
  {
    id: 'gpu-esports',
    nameKey: 'esports',
    settings: [
      { key: 'lowLatencyMode', value: 'ultra' },
      { key: 'powerMode', value: 'maxPerformance' },
      { key: 'verticalSync', value: 'off' },
      { key: 'textureFiltering', value: 'performance' },
    ],
    active: true,
    recommended: true,
  },
  {
    id: 'gpu-balanced',
    nameKey: 'balanced',
    settings: [
      { key: 'lowLatencyMode', value: 'on' },
      { key: 'powerMode', value: 'optimal' },
      { key: 'verticalSync', value: 'adaptive' },
      { key: 'antiAliasing', value: 'application' },
    ],
    active: false,
    recommended: false,
  },
  {
    id: 'gpu-quality',
    nameKey: 'quality',
    settings: [
      { key: 'lowLatencyMode', value: 'off' },
      { key: 'powerMode', value: 'optimal' },
      { key: 'antiAliasing', value: 'enhance' },
      { key: 'textureFiltering', value: 'quality' },
    ],
    active: false,
    recommended: false,
  },
  {
    id: 'gpu-streaming',
    nameKey: 'streaming',
    settings: [
      { key: 'lowLatencyMode', value: 'on' },
      { key: 'powerMode', value: 'maxPerformance' },
      { key: 'encoder', value: 'nvencHevc' },
      { key: 'frameCap', value: '144' },
    ],
    active: false,
    recommended: false,
  },
]

/* ------------------------------------------------------------------ *
 * Mutable agent state
 * ------------------------------------------------------------------ */

const seat = db.machineSettings.find((s) => s.machineId === db.currentMachineId)

interface RunningGame {
  launchId: ID
  gameId: ID
  pid: number
  startedAt: string
}

const state = {
  brightness: seat?.brightness ?? 80,
  displayMode: seat?.displayMode ?? hw.modes[0],
  /** Mode to restore if the player never confirms — the anti-brick guard. */
  pendingRevert: null as { previous: DisplayMode; timer: ReturnType<typeof setTimeout> } | null,
  running: null as RunningGame | null,
  locked: false,
  lockReason: null as LockReason | null,
  restartScheduledAt: null as string | null,
  connectedAt: null as string | null,
  /** Telemetry walks from its previous reading, so graphs look continuous. */
  telemetry: null as MachineTelemetry | null,
}

let launchSeq = 0

function requireAvailable(): void {
  if (!config.available) throw new AgentError('agentUnavailable')
}

function requireCapability(key: keyof AgentCapabilities, target?: NativePanelTarget): void {
  requireAvailable()
  if (!capabilities()[key]) throw new AgentError('unsupported', { target })
}

/* ------------------------------------------------------------------ *
 * Telemetry simulation
 * ------------------------------------------------------------------ */

/** How hard a title leans on the GPU — drives temps, load and the FPS it hits. */
const GAME_LOAD: Record<string, { fps: number; gpu: number }> = {
  cs2: { fps: 1, gpu: 0.62 },
  valorant: { fps: 1, gpu: 0.5 },
  lol: { fps: 0.95, gpu: 0.42 },
  dota2: { fps: 0.85, gpu: 0.6 },
  fortnite: { fps: 0.6, gpu: 0.82 },
  apex: { fps: 0.65, gpu: 0.8 },
  cyberpunk: { fps: 0.28, gpu: 0.98 },
  elden: { fps: 0.24, gpu: 0.9 },
  bg3: { fps: 0.3, gpu: 0.88 },
}

function nextTelemetry(): MachineTelemetry {
  const running = state.running
  const load = running ? (GAME_LOAD[running.gameId] ?? { fps: 0.5, gpu: 0.85 }) : null

  // Target values for the current situation; the reading eases towards them.
  const targetFps = load ? hw.fpsCeiling * load.fps : 0
  const targetGpuLoad = load ? load.gpu * 100 : between(2, 9)
  const targetCpuLoad = load ? clamp(load.gpu * 70 + between(-8, 12), 12, 96) : between(3, 11)
  const targetGpuTemp = hw.idleGpuTempC + (load ? load.gpu * 44 : between(0, 4))
  const targetCpuTemp = hw.idleCpuTempC + (load ? load.gpu * 38 : between(0, 5))
  const targetPing = running ? between(6, 21) : between(4, 12)

  const previous = state.telemetry
  const ease = (from: number, to: number, factor = 0.35) => from + (to - from) * factor

  const next: MachineTelemetry = {
    fps: Math.max(0, Math.round(previous ? ease(previous.fps, targetFps) + between(-6, 6) : targetFps)),
    pingMs: Math.max(1, Math.round(previous ? ease(previous.pingMs, targetPing, 0.5) : targetPing)),
    cpuTempC: round(clamp(previous ? ease(previous.cpuTempC, targetCpuTemp, 0.2) : targetCpuTemp, 30, 97), 1),
    gpuTempC: round(clamp(previous ? ease(previous.gpuTempC, targetGpuTemp, 0.2) : targetGpuTemp, 30, 92), 1),
    cpuLoadPct: round(clamp(previous ? ease(previous.cpuLoadPct, targetCpuLoad) : targetCpuLoad, 0, 100)),
    gpuLoadPct: round(clamp(previous ? ease(previous.gpuLoadPct, targetGpuLoad) : targetGpuLoad, 0, 100)),
    // Disk barely moves during a session, so it is stable by design.
    diskUsedPct: previous?.diskUsedPct ?? round(between(63, 78)),
  }

  state.telemetry = next
  return next
}

/* ------------------------------------------------------------------ *
 * Launch choreography
 * ------------------------------------------------------------------ */

/** Steps of a start, with the share of the bar and how long each one takes. */
const LAUNCH_STEPS: Array<{
  phase: GameLaunchPhase
  step: string
  percent: number
  ms: [number, number]
}> = [
  { phase: 'queued', step: 'queued', percent: 4, ms: [120, 260] },
  { phase: 'preparing', step: 'checkingFiles', percent: 18, ms: [400, 900] },
  { phase: 'preparing', step: 'syncingCloudSaves', percent: 32, ms: [500, 1100] },
  { phase: 'startingLauncher', step: 'startingLauncher', percent: 52, ms: [800, 1800] },
  { phase: 'startingLauncher', step: 'signingIn', percent: 66, ms: [400, 900] },
  { phase: 'launching', step: 'startingGame', percent: 84, ms: [900, 2000] },
  { phase: 'launching', step: 'waitingForWindow', percent: 96, ms: [500, 1400] },
]

/* ------------------------------------------------------------------ *
 * The implementation
 * ------------------------------------------------------------------ */

export const mockAgent: AgentBridge = {
  /* -- handshake ---------------------------------------------------- */

  async isAvailable() {
    await sleep(between(90, 220))
    if (!config.available) return false
    state.connectedAt ??= nowIso()
    return true
  },

  async getInfo(): Promise<AgentInfo> {
    await sleep(between(120, 300))
    if (!config.available) throw new AgentError('agentUnavailable')
    state.connectedAt ??= nowIso()
    return {
      machineId: db.currentMachineId,
      version: '0.9.4-mock',
      os: hw.isConsole ? 'PS5 System Software 10.20' : 'Windows 11 Pro 24H2 (26100.2314)',
      connectedAt: state.connectedAt,
      capabilities: capabilities(),
    }
  },

  /* -- games -------------------------------------------------------- */

  async getInstalledGames() {
    requireAvailable()
    await sleep(between(240, 620))
    return Array.from(installedGames.values(), (game) => ({ ...game }))
  },

  async launchGame(gameId, options: LaunchGameOptions = {}) {
    requireCapability('launchGames')

    const entry = installedGames.get(gameId)
    if (!entry || !entry.installed || entry.needsUpdate) {
      throw new AgentError('gameNotInstalled', { detail: gameId })
    }
    if (state.running) {
      throw new AgentError('gameAlreadyRunning', { detail: state.running.gameId })
    }

    launchSeq += 1
    const launchId = `launch-${launchSeq}-${Math.random().toString(36).slice(2, 6)}`
    const emit = (phase: GameLaunchPhase, percent: number, step?: string) =>
      options.onProgress?.({ launchId, gameId, phase, percent, step })

    // Claim the seat before the first await, so two clicks cannot both start.
    state.running = { launchId, gameId, pid: 0, startedAt: nowIso() }

    try {
      for (const step of LAUNCH_STEPS) {
        if (options.signal?.aborted) throw new AgentError('agentFailed', { detail: 'aborted' })
        emit(step.phase, step.percent, step.step)
        await sleep(between(step.ms[0], step.ms[1]))
        if (rng() < config.launchFailureRate) {
          throw new AgentError('launcherFailed', { detail: `${entry.launcher}:${step.step}` })
        }
      }

      const handle: GameLaunchHandle = {
        launchId,
        gameId,
        pid: 4000 + Math.floor(rng() * 24_000),
        startedAt: nowIso(),
      }
      state.running = { ...handle, pid: handle.pid ?? 0 }
      entry.lastPlayedAt = handle.startedAt
      emit('running', 100, 'running')
      return handle
    } catch (error) {
      state.running = null
      emit('failed', 100, 'failed')
      throw error
    }
  },

  async killGame(gameId) {
    requireAvailable()
    if (!state.running || state.running.gameId !== gameId) {
      throw new AgentError('gameNotRunning', { detail: gameId })
    }
    await sleep(between(500, 1200))
    state.running = null
  },

  /* -- display ------------------------------------------------------ */

  async getDisplayModes() {
    requireCapability('displayModes')
    await sleep(between(180, 420))
    return hw.modes.map((mode) => ({ ...mode }))
  },

  async setDisplayMode(mode, options: SetDisplayModeOptions = {}): Promise<AppliedDisplayMode> {
    requireCapability('displayModes')

    const supported = hw.modes.some(
      (m) => m.width === mode.width && m.height === mode.height && m.refreshHz === mode.refreshHz,
    )
    if (!supported) throw new AgentError('invalidValue', { detail: `${mode.width}x${mode.height}@${mode.refreshHz}` })
    // Changing resolution under a running game is how you crash it.
    if (state.running) throw new AgentError('blockedByPolicy', { detail: 'gameRunning' })

    // The monitor goes black while it re-syncs — that wait is the point.
    await sleep(between(900, 1800))

    const previous = state.displayMode
    const confirmWithinSec = options.confirmWithinSec ?? 15
    state.displayMode = { ...mode }

    if (state.pendingRevert) clearTimeout(state.pendingRevert.timer)
    const timer = setTimeout(() => {
      state.displayMode = previous
      state.pendingRevert = null
    }, confirmWithinSec * 1000)
    state.pendingRevert = { previous, timer }

    return {
      mode: { ...mode },
      previous: { ...previous },
      revertAt: nowIso(confirmWithinSec * 1000),
    }
  },

  async confirmDisplayMode() {
    requireAvailable()
    await sleep(between(120, 260))
    if (!state.pendingRevert) return
    clearTimeout(state.pendingRevert.timer)
    state.pendingRevert = null
  },

  async setBrightness(percent) {
    requireCapability('brightness')
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new AgentError('invalidValue', { detail: String(percent) })
    }
    await sleep(between(120, 320))
    // The panel only accepts 5% steps, so the slider must reflect what stuck.
    state.brightness = clamp(Math.round(percent / 5) * 5, 10, 100)
    return state.brightness
  },

  /* -- gpu profiles -------------------------------------------------- */

  async getNvidiaProfiles() {
    requireCapability('nvidiaProfiles', 'nvidia-control-panel')
    await sleep(between(200, 480))
    return nvidiaProfiles.map((profile) => ({ ...profile, settings: [...profile.settings] }))
  },

  async applyNvidiaProfile(profileId) {
    requireCapability('nvidiaProfiles', 'nvidia-control-panel')
    if (!nvidiaProfiles.some((profile) => profile.id === profileId)) {
      throw new AgentError('invalidValue', { detail: profileId })
    }
    await sleep(between(700, 1600))
    for (const profile of nvidiaProfiles) profile.active = profile.id === profileId
    return nvidiaProfiles.map((profile) => ({ ...profile, settings: [...profile.settings] }))
  },

  /* -- native panels ------------------------------------------------ */

  async openNativePanel(target) {
    requireAvailable()
    if (!capabilities().nativePanels.includes(target)) {
      throw new AgentError('unsupported', { target })
    }
    // Native windows take a beat to appear; the tile stays in a pending state.
    await sleep(between(500, 1400))
    // A panel cannot own the screen while a game does — Windows just ignores it.
    if (state.running && target === 'windows-display') {
      throw new AgentError('blockedByPolicy', { target, detail: 'gameRunning' })
    }
  },

  /* -- telemetry ---------------------------------------------------- */

  async getTelemetry() {
    requireCapability('telemetry')
    await sleep(between(80, 200))
    return nextTelemetry()
  },

  /* -- workstation -------------------------------------------------- */

  async lockWorkstation(reason: LockReason = 'break') {
    requireCapability('workstationLock')
    await sleep(between(200, 500))
    state.locked = true
    state.lockReason = reason
  },

  async unlockWorkstation() {
    requireCapability('workstationLock')
    await sleep(between(200, 500))
    // Only the launcher's own lock can be released from here.
    if (!state.locked) throw new AgentError('permissionDenied', { detail: 'notLocked' })
    if (state.lockReason === 'paymentRequired') {
      throw new AgentError('blockedByPolicy', { detail: 'paymentRequired' })
    }
    state.locked = false
    state.lockReason = null
  },

  async restartMachine(options: RestartOptions = {}) {
    requireCapability('restart')
    await sleep(between(250, 600))
    // A reboot mid-session would eat paid time: staff must end the session first.
    const activeSession = db.sessions.some(
      (session) => session.machineId === db.currentMachineId && session.state === 'active',
    )
    if (activeSession && options.reason !== 'staff') {
      throw new AgentError('blockedByPolicy', { detail: 'sessionActive' })
    }
    const delaySec = options.delaySec ?? 30
    state.restartScheduledAt = nowIso(delaySec * 1000)
    state.running = null
  },
}

/* ------------------------------------------------------------------ *
 * Dev / test controls
 * ------------------------------------------------------------------ */

/**
 * Handle for driving the mock from a dev panel, a story or a test.
 *
 * ```ts
 * mockAgentControls.setAvailable(false)      // the "no agent" seat (F5.4)
 * mockAgentControls.setLatencyFactor(0)      // instant, for tests
 * mockAgentControls.setCapabilities({ brightness: false })
 * ```
 */
export const mockAgentControls = {
  /** `false` makes every call reject with `agentUnavailable`. */
  setAvailable(available: boolean) {
    config.available = available
    if (!available) {
      state.connectedAt = null
      state.telemetry = null
      state.running = null
    }
  },
  /** `0` removes all artificial delay. */
  setLatencyFactor(factor: number) {
    config.latencyFactor = Math.max(0, factor)
  },
  /** `0`–`1` chance that a launch dies part-way with `launcherFailed`. */
  setLaunchFailureRate(rate: number) {
    config.launchFailureRate = clamp(rate, 0, 1)
  },
  /** Force capabilities off (or on) regardless of the seat's specs. */
  setCapabilities(overrides: Partial<AgentCapabilities>) {
    config.capabilityOverrides = { ...config.capabilityOverrides, ...overrides }
  },
  reset() {
    config.available = true
    config.latencyFactor = 1
    config.launchFailureRate = 0
    config.capabilityOverrides = {}
    if (state.pendingRevert) clearTimeout(state.pendingRevert.timer)
    state.pendingRevert = null
    state.running = null
    state.locked = false
    state.lockReason = null
    state.restartScheduledAt = null
    state.telemetry = null
  },
  /** Snapshot for a debug overlay — read-only mirror of the agent's state. */
  inspect() {
    return {
      available: config.available,
      capabilities: config.available ? capabilities() : NO_AGENT_CAPABILITIES,
      brightness: state.brightness,
      displayMode: state.displayMode,
      pendingRevert: state.pendingRevert !== null,
      running: state.running,
      locked: state.locked,
      lockReason: state.lockReason,
      restartScheduledAt: state.restartScheduledAt,
    }
  },
}
