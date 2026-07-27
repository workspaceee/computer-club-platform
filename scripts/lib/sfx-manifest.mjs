/**
 * F8.1 — the single declaration of the interface sound set.
 *
 * Shared by `scripts/generate-sfx.mjs` (which renders these files) and
 * `scripts/verify-assets.mjs` (which checks the rendered files against the same
 * numbers), for exactly the reason `blur-manifest.mjs` exists: two hand-kept
 * lists drift, and the drift is the bug.
 *
 * ## Why the club has synthesised sounds and not a sample pack
 *
 * A cyber club is already loud: seven mechanical keyboards, a bar blender and
 * somebody's Discord. A launcher that answers with a downloaded "notification
 * ding" adds one more voice to that room, and a *game-like* one adds insult:
 * the player came here to hear the game, not the shell around it. So every cue
 * here is additive synthesis — a sine fundamental with two weak harmonics and a
 * fast decay. Short, dry, no reverb, no sweep, no percussion.
 *
 * The recipes below are therefore the specification, in the literal sense: the
 * bytes in `public/sfx/` are their output, and re-running the generator on an
 * unchanged manifest produces an identical file (no dither, no randomness).
 *
 * ## Why WAV, and why 24 kHz mono
 *
 * `.wav` is the only container this repo can produce honestly — the toolchain
 * has no mp3/ogg/opus encoder, and a "compressed" file we cannot regenerate is
 * a binary blob nobody can audit. It costs nothing here: at 24 kHz / 16-bit /
 * mono a 300 ms cue is ~14 KB, so the whole set is smaller than one game cover
 * (see §13.3 — the budget is measured against 5 MB of `public/`). It also
 * decodes instantly and identically in every browser, which matters for a cue
 * that must fire *on* the click.
 *
 * 24 kHz is deliberate, not lazy: nothing in the set has energy above ~6 kHz
 * (the softening low-pass sits at 4.5 kHz), so 48 kHz would double the bytes to
 * store silence in the top octave. Mono is deliberate too — the kiosk's UI cues
 * must not appear to come from one side of a headset.
 *
 * ## Loudness
 *
 * `peakDb` is a *ceiling on how loud a cue is allowed to be*, in dBFS, applied
 * as exact peak normalisation. Everything sits between −20 and −14 dBFS, i.e.
 * clearly below game audio, because the launcher is never the main voice in the
 * room. Only the two cues that are allowed to interrupt a running game (F8.4)
 * get the loud end of that range, and even they stay under −14.
 *
 * `critical: true` marks those two. It is the data F8.4's rule reads: during a
 * live game nothing plays except the end-of-time warning and an admin's
 * message. The flag lives with the asset because it is a property *of the cue*,
 * not of a call site.
 */

/** 16-bit mono. See the docblock: the top octave would be silence anyway. */
export const SAMPLE_RATE = 24000

/** Softening one-pole low-pass, Hz. Removes the glassy edge of raw sines. */
export const LOWPASS_HZ = 4500

/**
 * Nothing in the set may be longer than this. A UI cue that outlives the
 * animation it accompanies stops being feedback and becomes a jingle.
 */
export const MAX_DURATION_S = 0.45

/**
 * Per-file weight ceiling. At 24 kHz/16-bit/mono the arithmetic is fixed
 * (48 KB per second), so this is really a restatement of MAX_DURATION_S — kept
 * anyway so a hand-dropped stereo or 48 kHz file fails on weight too, not only
 * on its header.
 */
export const MAX_KB = 24

/**
 * The set. `notes` are additive: `at` and `dur` in seconds, `freq` in Hz,
 * `gain` relative (normalisation makes absolutes meaningless), `partials` are
 * `[multiplier, level]` pairs on top of the fundamental.
 *
 * Pitches are drawn from one scale (a C-minor-ish set) so the cues sound like
 * one instrument rather than seven downloads.
 */
export const SFX = [
  {
    id: 'notify',
    dur: 0.16,
    peakDb: -20,
    critical: false,
    /** The default cue: something arrived, look when you like. */
    purpose: 'generic toast / arrival',
    notes: [
      { at: 0, dur: 0.16, freq: 784, gain: 1, partials: [[2, 0.22], [3, 0.06]], decay: 26 },
    ],
  },
  {
    id: 'success',
    dur: 0.28,
    peakDb: -20,
    critical: false,
    /** Two notes up a fourth. Rising = it worked; short = it was routine. */
    purpose: 'action confirmed, payment accepted',
    notes: [
      { at: 0,    dur: 0.14, freq: 587, gain: 0.9, partials: [[2, 0.2], [3, 0.05]], decay: 30 },
      { at: 0.08, dur: 0.20, freq: 784, gain: 1,   partials: [[2, 0.22], [3, 0.06]], decay: 22 },
    ],
  },
  {
    id: 'error',
    dur: 0.30,
    peakDb: -18,
    critical: false,
    /**
     * Two notes *down* a whole tone, low and dry. No buzz and no dissonance:
     * a failed top-up is an inconvenience, not an alarm, and a harsh error
     * sound is the first thing a room learns to hate.
     */
    purpose: 'rejected input, failed request',
    notes: [
      { at: 0,    dur: 0.16, freq: 330, gain: 1,    partials: [[2, 0.14]], decay: 24 },
      { at: 0.10, dur: 0.20, freq: 262, gain: 0.95, partials: [[2, 0.12]], decay: 18 },
    ],
  },
  {
    id: 'order-ready',
    dur: 0.40,
    peakDb: -18,
    critical: false,
    /**
     * The bar counter bell: three notes up, bell-weighted partials. The one cue
     * a guest must recognise from across the room while wearing a headset, so
     * it is the longest in the set — still under half a second.
     */
    purpose: 'bar order is ready for pickup',
    notes: [
      { at: 0,    dur: 0.12, freq: 523, gain: 0.75, partials: [[2, 0.3], [3, 0.1]], decay: 34 },
      { at: 0.09, dur: 0.14, freq: 698, gain: 0.85, partials: [[2, 0.3], [3, 0.1]], decay: 30 },
      { at: 0.18, dur: 0.22, freq: 880, gain: 1,    partials: [[2, 0.26], [3, 0.08]], decay: 20 },
    ],
  },
  {
    id: 'time-warning',
    dur: 0.34,
    peakDb: -14,
    critical: true,
    /**
     * A double knock on one pitch — the shape of "look up", not of a melody.
     * Repetition rather than pitch height carries the urgency, because this one
     * has to cut through a match without sounding like part of it.
     */
    purpose: 'session time is running out',
    notes: [
      { at: 0,    dur: 0.13, freq: 440, gain: 1, partials: [[2, 0.18], [3, 0.05]], decay: 30 },
      { at: 0.17, dur: 0.17, freq: 440, gain: 1, partials: [[2, 0.18], [3, 0.05]], decay: 26 },
    ],
  },
  {
    id: 'level-up',
    dur: 0.42,
    peakDb: -18,
    critical: false,
    /**
     * A minor-third-and-fifth arpeggio: reward without fanfare. Deliberately
     * *not* the ascending sparkle a game would use — the launcher congratulating
     * itself louder than the game does is the fastest way to feel cheap.
     */
    purpose: 'battle pass level, achievement unlocked',
    notes: [
      { at: 0,    dur: 0.12, freq: 523, gain: 0.7, partials: [[2, 0.24], [3, 0.07]], decay: 34 },
      { at: 0.08, dur: 0.12, freq: 622, gain: 0.8, partials: [[2, 0.24], [3, 0.07]], decay: 32 },
      { at: 0.16, dur: 0.26, freq: 784, gain: 1,   partials: [[2, 0.28], [3, 0.09], [4, 0.04]], decay: 16 },
    ],
  },
  {
    id: 'admin-message',
    dur: 0.30,
    peakDb: -14,
    critical: true,
    /**
     * Two notes down a fifth, warmer partials: the cadence of a person calling
     * your name rather than a machine reporting state. Loud end of the range —
     * it is one of the two cues allowed to interrupt a game, and it means a
     * human is waiting for an answer.
     */
    purpose: 'administrator is speaking to this station',
    notes: [
      { at: 0,    dur: 0.14, freq: 659, gain: 0.9, partials: [[2, 0.26], [3, 0.09]], decay: 28 },
      { at: 0.09, dur: 0.21, freq: 440, gain: 1,   partials: [[2, 0.24], [3, 0.08]], decay: 20 },
    ],
  },
]

/** `notify` → `public/sfx/notify.wav`. One place builds this path per side. */
export const sfxPath = (id) => `sfx/${id}.wav`

/** Ids only, for parity checks against `lib/assets/sfx.ts` and the directory. */
export const sfxIds = () => SFX.map((s) => s.id)
