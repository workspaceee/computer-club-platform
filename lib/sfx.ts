/**
 * F8.2 — the one place a sound is played.
 *
 * Every cue in the product goes through `sfx.play(id)`. Nothing else in the app
 * may construct an `Audio`, and nothing else may know a path: the catalogue
 * (`lib/assets/sfx.ts`) owns the ids, this module owns the playback. That single
 * entry point is what makes the three rules that follow enforceable rather than
 * advisory — a mute switch (F8.3), the in-game silence (F8.4) and the autoplay
 * gate (F8.5) each need exactly one gate to sit in.
 *
 * Three decisions worth stating, because each one is a bug the naive version has:
 *
 *   **Decoded once, up front.** `new Audio(src).play()` on demand asks the
 *   browser to fetch and decode *while* the thing it is reacting to is already on
 *   screen, so the click lands 80–200 ms after the toast — long enough to feel
 *   like it belongs to the next action. Cues are fetched and decoded into
 *   `AudioBuffer`s by `preload()`, after which starting one costs a node.
 *
 *   **The same cue never stacks on itself.** Realtime pushes arrive in bursts:
 *   three friend requests in one frame used to mean three `notify`s a few
 *   milliseconds apart, which is not three notifications, it is one distorted
 *   one at triple amplitude. A cue is suppressed while its own previous voice is
 *   still ringing (plus a small gap), so a burst is heard as a single event.
 *   Different cues may overlap, up to `MAX_VOICES`.
 *
 *   **Silence is a valid outcome, and it is reported.** `play()` returns *why*
 *   nothing was heard (`'muted' | 'in-game' | 'suppressed' | 'blocked' |
 *   'unsupported' | 'unavailable'`) instead of throwing or lying. The dev console
 *   reads that, and so do F8.3/F8.4 — "no sound" must be debuggable without a
 *   spectrum analyser, and audio must never be able to break a screen.
 *
 * Two gates decide whether a cue is heard at all, and their order is the policy:
 * `muted` is checked first and applies to **everything**, `in-game` second and
 * spares the `critical` pair. The player switching sound off outranks our idea of
 * what is important; a running game does not.
 *
 * Web Audio only, with no `<audio>` fallback. Overlap suppression, per-cue gain
 * and a hard voice cap all need a mixer; an element pool would be a second,
 * differently-broken implementation of this file for browsers the stations do not
 * run. Where `AudioContext` is missing the launcher is simply silent — the
 * interface never *depends* on a cue, which is a property F8.1 designed for.
 */
import { SFX, SFX_IDS, isCriticalSfx, type SfxId } from '@/lib/assets/sfx'

/* ------------------------------------------------------------------ *
 * Policy
 * ------------------------------------------------------------------ */

/**
 * How many cues may sound at once.
 *
 * Three, not "as many as arrive": beyond that the set stops reading as
 * individual events and starts reading as a glitch, and the sum of the peaks
 * leaves the quiet band F8.1 measured out. A `critical` cue (F8.4) is never the
 * one dropped — it evicts the oldest non-critical voice instead.
 */
export const MAX_VOICES = 3

/**
 * Extra silence a cue keeps for itself after it ends, before it may retrigger.
 *
 * Its own duration is the real guard; this is the margin for events that arrive
 * a frame or two apart (a double-fired handler, a re-render, two pushes in the
 * same tick), which are the same event as far as a listener is concerned.
 */
export const RETRIGGER_GAP_MS = 90

/**
 * How late a cue may still be played after being requested.
 *
 * Only reachable when something fires before `preload()` has landed. The files
 * are local and tiny, so the decode normally arrives within a frame or two; past
 * this point the sound would arrive detached from what caused it, and a late cue
 * is worse than a missing one.
 */
export const LATE_PLAY_MS = 600

/**
 * Default level: **on, at a middle level** (F8.3).
 *
 * Compounds with the files themselves peaking at −20…−14 dBFS, so half of the
 * scale is not "half as loud as a game" — it is a cue that is clearly audible
 * from the seat and still does not carry to the next one. The earlier 0.35 was
 * quiet enough that a station nobody had touched read as broken sound rather
 * than as discreet sound, and the fix for "too loud" is a slider the player can
 * see; there is no fix for a cue nobody notices.
 *
 * `lib/store/slices/settings.ts` derives its default percent from this constant,
 * so the launcher's stored value and the mixer's fallback cannot drift apart.
 */
export const DEFAULT_SFX_VOLUME = 0.5

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/**
 * What actually happened. Every non-`played` value is a *designed* silence, so
 * a call site (or the dev console) can tell a policy from a fault.
 */
export type SfxOutcome =
  /** Heard. */
  | 'played'
  /** Will be heard shortly — requested before its buffer was decoded. */
  | 'deferred'
  /** This cue is already ringing, or the voice cap is full. */
  | 'suppressed'
  /** Muted, or volume at zero (F8.3). */
  | 'muted'
  /**
   * A game holds the machine and this cue is not `critical` (F8.4).
   *
   * Named separately from `'muted'` on purpose: nobody switched sound off, the
   * launcher simply has no right to speak over a match. Support reading a log
   * must be able to tell "the player muted us" from "we stayed out of the way".
   */
  | 'in-game'
  /** The browser has not granted playback yet — no gesture so far (F8.5). */
  | 'blocked'
  /** No Web Audio in this browser. The launcher stays silent, on purpose. */
  | 'unsupported'
  /** The file failed to load or decode, or arrived too late to be honest. */
  | 'unavailable'

export interface SfxPlayOptions {
  /**
   * Per-cue multiplier on top of the user's volume, `0…1`. For the rare place
   * that needs a cue softer than the set (a preview in settings, a repeat of
   * something already acknowledged). Never above 1: the ceiling belongs to F8.1.
   */
  gain?: number
  /**
   * Let this cue stack on itself. Escape hatch for a deliberate double-hit;
   * still bound by `MAX_VOICES`. Default `false`, which is the whole point.
   */
  allowOverlap?: boolean
}

/** One `play()` call and its outcome. Kept for the dev console and for support. */
export interface SfxAttempt {
  seq: number
  id: SfxId
  outcome: SfxOutcome
  /** `Date.now()` at the call. */
  at: number
}

/** Immutable view of the engine, for `useSyncExternalStore`. */
export interface SfxSnapshot {
  /** Does this browser have Web Audio at all? */
  supported: boolean
  /** Has the browser granted playback (the context is running)? F8.5. */
  armed: boolean
  /** Did the last attempt get refused by the autoplay policy? */
  blocked: boolean
  muted: boolean
  /** `0…1`, the user's level (F8.3). */
  volume: number
  /** A game holds the machine: only `critical` cues may sound (F8.4). */
  gameRunning: boolean
  /** Cues decoded and ready. */
  loaded: number
  /** Cues that failed to load — silent, never fatal. */
  failed: number
  /** Size of the catalogue, so a caller needs no second source for the total. */
  total: number
  /** Every cue accounted for (decoded or known-failed). */
  ready: boolean
  /** Cues sounding right now. */
  voices: number
  /** Most recent attempts, newest first. */
  history: readonly SfxAttempt[]
}

/** How many attempts to remember. Enough to read a burst, not a log file. */
const HISTORY_LIMIT = 16

/* ------------------------------------------------------------------ *
 * Engine state
 * ------------------------------------------------------------------ */

type AudioContextCtor = new () => AudioContext

interface Voice {
  id: SfxId
  critical: boolean
  source: AudioBufferSourceNode
  startedAt: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null

const buffers = new Map<SfxId, AudioBuffer>()
const failures = new Set<SfxId>()
/** In-flight or settled load per cue, so N callers cause one fetch. */
const loads = new Map<SfxId, Promise<AudioBuffer | null>>()

/** `performance.now()` before which a cue may not sound again. */
const quietUntil = new Map<SfxId, number>()
let voices: Voice[] = []

let volume = DEFAULT_SFX_VOLUME
let muted = false
/**
 * F8.4's one flag. `false` until something tells the engine a title took the
 * machine — the default has to be "the launcher is what the player is looking
 * at", because that is the state every screen renders in.
 */
let gameRunning = false
let seq = 0

const listeners = new Set<() => void>()

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

const supported = (() => {
  // Evaluated lazily on first access rather than at import time, because this
  // module is imported from files that also render on the server.
  let cached: boolean | null = null
  return () => {
    if (cached === null) cached = audioContextCtor() !== null
    return cached
  }
})()

/* ------------------------------------------------------------------ *
 * Snapshot
 * ------------------------------------------------------------------ */

/**
 * The snapshot is cached and only replaced when something changes, because
 * `useSyncExternalStore` compares by identity — rebuilding it per read would
 * re-render every subscriber on every frame.
 */
let snapshot: SfxSnapshot = {
  supported: false,
  armed: false,
  blocked: false,
  muted: false,
  volume: DEFAULT_SFX_VOLUME,
  gameRunning: false,
  loaded: 0,
  failed: 0,
  total: SFX_IDS.length,
  ready: false,
  voices: 0,
  history: [],
}

function publish(patch: Partial<SfxSnapshot>): void {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener()
}

/** Recomputes the derived counters and notifies. Cheap; called on every change. */
function sync(extra: Partial<SfxSnapshot> = {}): void {
  const loaded = buffers.size
  const failed = failures.size
  publish({
    supported: supported(),
    armed: ctx?.state === 'running',
    muted,
    volume,
    gameRunning,
    loaded,
    failed,
    total: SFX_IDS.length,
    ready: loaded + failed === SFX_IDS.length,
    voices: voices.length,
    ...extra,
  })
}

function record(id: SfxId, outcome: SfxOutcome): SfxOutcome {
  seq += 1
  const attempt: SfxAttempt = { seq, id, outcome, at: Date.now() }
  sync({
    history: [attempt, ...snapshot.history].slice(0, HISTORY_LIMIT),
    // One refusal is the whole story for F8.5; anything that plays clears it.
    blocked: outcome === 'blocked' ? true : outcome === 'played' ? false : snapshot.blocked,
  })
  return outcome
}

/* ------------------------------------------------------------------ *
 * Context + loading
 * ------------------------------------------------------------------ */

/**
 * Creates the context on first need.
 *
 * Constructing it before a gesture is legal — it simply starts `suspended`, and
 * `decodeAudioData` works there, which is what lets the whole set be decoded
 * during boot and armed later (F8.5).
 */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = audioContextCtor()
  if (!Ctor) {
    sync()
    return null
  }
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : volume
  master.connect(ctx.destination)
  ctx.addEventListener?.('statechange', () => sync())
  sync()
  return ctx
}

function load(id: SfxId): Promise<AudioBuffer | null> {
  const existing = loads.get(id)
  if (existing) return existing

  const context = ensureContext()
  if (!context) return Promise.resolve(null)

  const promise = (async () => {
    try {
      const res = await fetch(SFX[id].src)
      if (!res.ok) throw new Error(`${res.status}`)
      const buffer = await context.decodeAudioData(await res.arrayBuffer())
      buffers.set(id, buffer)
      failures.delete(id)
      sync()
      return buffer
    } catch {
      // A missing cue is a quiet interface, never a broken screen. The set is
      // verified on disk by `pnpm assets:verify`, so reaching here means the
      // network or the decoder failed at runtime — retryable, hence the
      // `loads` entry is dropped.
      failures.add(id)
      loads.delete(id)
      sync()
      return null
    }
  })()

  loads.set(id, promise)
  return promise
}

/**
 * Fetch and decode the whole set. Idempotent; call it once from the shell.
 *
 * Sequential on purpose: seven files at ~15 KB are not worth seven parallel
 * requests competing with the covers and the fonts during boot, and none of them
 * is needed in the first second.
 */
async function preload(): Promise<void> {
  if (!ensureContext()) return
  for (const id of SFX_IDS) await load(id)
}

/* ------------------------------------------------------------------ *
 * Playback
 * ------------------------------------------------------------------ */

function dropVoice(voice: Voice): void {
  voices = voices.filter((v) => v !== voice)
  sync()
}

/**
 * Makes room for a cue, or refuses.
 *
 * Under the cap, anything plays. At the cap, a `critical` cue (session expiry,
 * an administrator speaking — F8.4) takes the slot of the oldest non-critical
 * voice; a non-critical one is dropped. The alternative, cutting whatever is
 * oldest, would let a decorative cue truncate the one cue the player must hear.
 */
function claimVoice(critical: boolean): boolean {
  if (voices.length < MAX_VOICES) return true
  if (!critical) return false
  const victim = voices.find((v) => !v.critical)
  if (!victim) return false
  try {
    victim.source.stop()
  } catch {
    // Already finished between the check and the stop; `onended` cleans up.
  }
  return true
}

function start(id: SfxId, buffer: AudioBuffer, options: SfxPlayOptions): SfxOutcome {
  const context = ctx
  if (!context || !master) return record(id, 'unsupported')

  const critical = isCriticalSfx(id)
  if (!claimVoice(critical)) return record(id, 'suppressed')

  const source = context.createBufferSource()
  source.buffer = buffer

  // Per-cue gain sits between the source and the master, so `options.gain` can
  // never raise a cue above the user's level — only lower it.
  const gain = context.createGain()
  gain.gain.value = Math.min(1, Math.max(0, options.gain ?? 1))
  source.connect(gain)
  gain.connect(master)

  const voice: Voice = { id, critical, source, startedAt: performance.now() }
  source.onended = () => {
    gain.disconnect()
    source.disconnect()
    dropVoice(voice)
  }

  // Reserve the cue's own airtime *before* starting, so two calls in the same
  // tick cannot both pass the check.
  quietUntil.set(id, performance.now() + buffer.duration * 1000 + RETRIGGER_GAP_MS)
  voices = [...voices, voice]
  source.start()
  return record(id, 'played')
}

/**
 * Play a cue. Safe to call from anywhere, including during render-adjacent
 * effects and from event handlers that may fire twice — that is what the
 * suppression window is for.
 *
 * Returns synchronously, and never throws: audio is the least important thing on
 * screen and must not be able to take a screen down with it.
 */
function play(id: SfxId, options: SfxPlayOptions = {}): SfxOutcome {
  if (!supported()) return record(id, 'unsupported')
  if (muted || volume <= 0) return record(id, 'muted')
  // F8.4, and it sits *here* rather than at the call sites for the same reason
  // the mute switch does: a rule spread across every screen that plays a cue is
  // a rule with a hole in it the week someone adds the eighth screen.
  if (gameRunning && !isCriticalSfx(id)) return record(id, 'in-game')

  const now = typeof performance === 'undefined' ? 0 : performance.now()
  if (!options.allowOverlap && now < (quietUntil.get(id) ?? 0)) {
    return record(id, 'suppressed')
  }

  const context = ensureContext()
  if (!context) return record(id, 'unsupported')

  if (context.state !== 'running') {
    // Not armed yet: ask, but do not queue. A cue started against a suspended
    // context would sound the moment the player finally clicks something — a
    // stranger's notification, arriving with someone else's click (F8.5).
    void context.resume().then(() => sync()).catch(() => sync())
    return record(id, 'blocked')
  }

  const buffer = buffers.get(id)
  if (buffer) return start(id, buffer, options)
  if (failures.has(id)) return record(id, 'unavailable')

  // Requested before the decode landed. Hold the cue for `LATE_PLAY_MS`, then
  // give up rather than play it out of context.
  const requestedAt = now
  void load(id).then((late) => {
    if (!late) return void record(id, 'unavailable')
    if (performance.now() - requestedAt > LATE_PLAY_MS) return void record(id, 'unavailable')
    if (muted || volume <= 0) return void record(id, 'muted')
    // Re-read, never trust the check from before the decode: a launch takes
    // seconds and this branch is what a cue fired *during* one goes through.
    if (gameRunning && !isCriticalSfx(id)) return void record(id, 'in-game')
    if (ctx?.state !== 'running') return void record(id, 'blocked')
    start(id, late, options)
  })
  return record(id, 'deferred')
}

/** Cut everything now. For locking the station and for ending a visit. */
function stopAll(): void {
  for (const voice of voices) {
    try {
      voice.source.stop()
    } catch {
      // Finished already — nothing to cut.
    }
  }
  voices = []
  quietUntil.clear()
  sync()
}

/**
 * Cut the decorative voices, leave the ones the player must hear (F8.4).
 *
 * The suppression windows are deliberately left alone: they belong to the cues,
 * not to the voices, and clearing them would let a burst that was already
 * collapsed into one event retrigger the moment the game exits.
 */
function stopNonCritical(): void {
  for (const voice of voices) {
    if (voice.critical) continue
    try {
      voice.source.stop()
    } catch {
      // Finished already — `onended` has it.
    }
  }
  // `voices` is not filtered here: `onended` fires for each stopped source and
  // removes it, which is also the path that disconnects its gain node.
}

/* ------------------------------------------------------------------ *
 * Settings + arming (the sockets F8.3 and F8.5 plug into)
 * ------------------------------------------------------------------ */

function applyLevel(): void {
  if (master && ctx) {
    // Ramped, not assigned: a step change in gain on a ringing voice is an
    // audible click, which would make the volume slider itself sound broken.
    const target = muted ? 0 : volume
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.015)
  }
  sync()
}

/** `0…1`, clamped. F8.3 mirrors the stored setting here. */
function setVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next))
  applyLevel()
}

function setMuted(next: boolean): void {
  muted = next
  if (muted) stopAll()
  applyLevel()
}

/**
 * F8.4 — a title took the machine, or gave it back.
 *
 * While this is `true` only `critical` cues (`time-warning`, `admin-message`)
 * are allowed through; everything else returns `'in-game'`. The exception list
 * is not written here — it is the `critical` flag in `lib/assets/sfx.ts`, so
 * adding a cue means deciding the question once, in the catalogue.
 *
 * Entering the state also **cuts what is already ringing**, and only the
 * non-critical part of it. The moment a game takes the screen is exactly the
 * moment a `notify` fired 200 ms earlier is still sounding, and a cue that
 * started legally does not become a cue the player wants to hear over their
 * match. Leaving the state cuts nothing: silence needs no cleanup.
 *
 * Idempotent — the wire that calls this re-runs on unrelated state changes, and
 * a repeated `true` must not keep chopping voices that are legally playing
 * (a `time-warning` half-way through, in particular).
 */
function setGameRunning(next: boolean): void {
  if (gameRunning === next) return
  gameRunning = next
  if (gameRunning) stopNonCritical()
  sync()
}

/**
 * Tell the browser we have a gesture (F8.5 calls this from the first real
 * interaction). Resolves to whether sound is now allowed.
 */
async function arm(): Promise<boolean> {
  const context = ensureContext()
  if (!context) return false
  if (context.state === 'running') {
    sync({ blocked: false })
    return true
  }
  try {
    await context.resume()
    // Re-read rather than trusting the resolve: a rejected gesture can resolve
    // with the context still suspended, and "running" is the only thing that
    // means sound will be heard.
    const running = (context.state as AudioContextState) === 'running'
    sync({ blocked: !running })
    return running
  } catch {
    sync({ blocked: true })
    return false
  }
}

/* ------------------------------------------------------------------ *
 * Public surface
 * ------------------------------------------------------------------ */

/**
 * The initial snapshot has to be the *server's* answer (`supported: false`,
 * nothing decoded), or the first client render would disagree with the HTML.
 * The real capability is filled in on first subscribe — which only happens in an
 * effect, in the browser — so a settings panel never reads "no Web Audio here"
 * from a value that simply had not been measured yet.
 */
let measured = false

function subscribe(listener: () => void): () => void {
  if (!measured) {
    measured = true
    sync()
  }
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = (): SfxSnapshot => snapshot

/**
 * The engine. Screens do not touch it directly — they use `useSfx()` — but the
 * shell, the settings bridge and the dev console need the imperative handle.
 */
export const sfx = {
  play,
  preload,
  stopAll,
  arm,
  setVolume,
  setMuted,
  setGameRunning,
  subscribe,
  getSnapshot,
  /** Test/dev hook: forget the suppression windows without cutting voices. */
  clearSuppression: () => quietUntil.clear(),
}

export type SfxEngine = typeof sfx
