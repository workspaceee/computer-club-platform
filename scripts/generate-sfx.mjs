/**
 * F8.1 — the interface sound set, rendered from `scripts/lib/sfx-manifest.mjs`.
 *
 *   node scripts/generate-sfx.mjs        # or: pnpm assets:sfx
 *
 * Writes `public/sfx/<id>.wav` for every entry in the manifest: 24 kHz, 16-bit,
 * mono PCM. The recipes, the loudness ceilings and the reasoning behind both
 * live in the manifest — this file is only the synthesiser.
 *
 * Idempotent and deterministic: no dither, no noise, no timestamps in the
 * container, so a re-run on an unchanged manifest produces byte-identical files
 * and no git diff. That is what makes `pnpm assets:verify` able to treat these
 * binaries as *derived* artefacts instead of trusting whatever was committed.
 *
 * ## The signal chain, and why each stage is there
 *
 *   additive partials → per-note envelope → sum → one-pole low-pass
 *   → peak-normalise to `peakDb` → 3 ms edge fades → 16-bit PCM
 *
 * - **Envelope.** A 6 ms raised-cosine attack instead of an instant start: a
 *   hard-edged onset clicks, and a click is the one artefact that reads as
 *   "broken hardware" rather than "quiet sound". The decay is exponential *and*
 *   multiplied by a polynomial tail so the note reaches exact zero at its end
 *   instead of being cut off while still ringing.
 * - **Low-pass.** Pure sines are glassy at 800 Hz and up. One pole at 4.5 kHz
 *   is enough to make the set sound like an object rather than a test tone.
 * - **Peak normalisation.** The manifest's `peakDb` becomes an exact measured
 *   peak, so "quiet" is a checkable property of the file (verify-assets reads
 *   it back) and not a promise about a mixing session nobody can repeat.
 * - **Edge fades.** Guarantees the first and last sample are zero even after
 *   normalisation, so retriggering a cue mid-tail cannot pop.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { SFX, SAMPLE_RATE, LOWPASS_HZ, MAX_DURATION_S, sfxPath } from './lib/sfx-manifest.mjs'

const OUT_DIR = join('public', 'sfx')
const ATTACK_S = 0.006
const EDGE_FADE_S = 0.003

/** Raised-cosine ramp in [0,1]. Used for the attack and the safety fades. */
const ramp = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)))

/**
 * One note as a float array added into `buf`.
 *
 * `decay` is the exponential rate (1/s); the `(1 - t/dur) ** 0.7` factor is the
 * tail that lands the note on exact zero at `dur`.
 */
function addNote(buf, note) {
  const start = Math.round(note.at * SAMPLE_RATE)
  const len = Math.round(note.dur * SAMPLE_RATE)
  const partials = [[1, 1], ...(note.partials ?? [])]

  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE
    const env =
      ramp(t / ATTACK_S) * Math.exp(-t * note.decay) * Math.pow(1 - i / len, 0.7)

    let sample = 0
    for (const [mult, level] of partials) {
      sample += level * Math.sin(2 * Math.PI * note.freq * mult * t)
    }

    const at = start + i
    if (at < buf.length) buf[at] += sample * env * note.gain
  }
}

/** One-pole low-pass, in place. Softens the sine edge without ringing. */
function lowpass(buf, hz) {
  const dt = 1 / SAMPLE_RATE
  const rc = 1 / (2 * Math.PI * hz)
  const a = dt / (rc + dt)
  let prev = 0
  for (let i = 0; i < buf.length; i++) {
    prev += a * (buf[i] - prev)
    buf[i] = prev
  }
}

/** Scale so the measured peak is exactly `peakDb` dBFS. */
function normalise(buf, peakDb) {
  let peak = 0
  for (const s of buf) peak = Math.max(peak, Math.abs(s))
  if (peak === 0) throw new Error('silent buffer — check the recipe')
  const target = Math.pow(10, peakDb / 20)
  const k = target / peak
  for (let i = 0; i < buf.length; i++) buf[i] *= k
}

/** Force the first and last few milliseconds to zero. No clicks, ever. */
function edgeFades(buf) {
  const n = Math.round(EDGE_FADE_S * SAMPLE_RATE)
  for (let i = 0; i < n; i++) {
    const g = ramp(i / n)
    buf[i] *= g
    buf[buf.length - 1 - i] *= g
  }
}

/** Canonical 44-byte-header RIFF/PCM file. Nothing optional, nothing dated. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    // Clamp before quantising: normalisation puts the peak well under 1, but a
    // recipe edit should distort audibly rather than wrap around to full scale.
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)

  return Buffer.concat([header, data])
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

console.log(`F8.1 interface sounds → ${OUT_DIR}/ (${SAMPLE_RATE} Hz, 16-bit mono)\n`)

for (const spec of SFX) {
  if (spec.dur > MAX_DURATION_S) {
    throw new Error(`${spec.id}: ${spec.dur}s exceeds the ${MAX_DURATION_S}s ceiling (§13.9)`)
  }
  for (const note of spec.notes) {
    if (note.at + note.dur > spec.dur + 1e-9) {
      throw new Error(`${spec.id}: a note runs past the declared duration — it would be cut off`)
    }
  }

  const buf = new Float64Array(Math.round(spec.dur * SAMPLE_RATE))
  spec.notes.forEach((note) => addNote(buf, note))
  lowpass(buf, LOWPASS_HZ)
  normalise(buf, spec.peakDb)
  edgeFades(buf)

  const bytes = wav(buf)
  writeFileSync(join('public', sfxPath(spec.id)), bytes)

  console.log(
    `  ${spec.id.padEnd(14)} ${String(Math.round(spec.dur * 1000)).padStart(3)} ms  ` +
      `${String(spec.peakDb).padStart(3)} dBFS  ${String(Math.round(bytes.length / 1024)).padStart(2)} KB` +
      `${spec.critical ? '  [critical: may interrupt a game]' : ''}`,
  )
}

console.log(`\n✓ ${SFX.length} files. Run \`pnpm assets:verify\` to check them.`)
