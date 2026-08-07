/**
 * F7.4 — enforcement for the asset convention in `docs/DESIGN.md` §13.
 *
 * A convention nobody can check is a convention that rots. Every rule in §13 is
 * mechanically verifiable, so this script verifies all of them and exits non-zero
 * on the first violation. Run it after any `optimize-*.mjs`, and before a merge
 * that touches `public/`.
 *
 *   node scripts/verify-assets.mjs
 *
 * What it does NOT do: judge whether a picture is *good*. It checks the contract
 * — geometry, format, weight, naming, and that every file has a consumer.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import sharp from 'sharp'

import { blurFingerprint, coveredPaths } from './lib/blur-manifest.mjs'
import {
  SFX,
  SAMPLE_RATE as SFX_RATE,
  MAX_DURATION_S as SFX_MAX_S,
  MAX_KB as SFX_MAX_KB,
  sfxPath,
  sfxIds,
} from './lib/sfx-manifest.mjs'

/**
 * The four generated families. `dim` is exact because the pipelines letterbox to
 * a fixed frame — a stray size means someone hand-dropped a file past the script.
 *
 * `maxKB` is a per-file ceiling, deliberately set a little above the current
 * worst case rather than at it: it should catch a 400 KB mistake, not fail the
 * build because a new cover is 3 KB busier than the old record holder. Current
 * observed maxima are in the comments so drift is visible when this is read.
 */
const FAMILIES = [
  { dir: 'covers',   w: 800,  h: 450, maxKB: 90,  alpha: false, pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, script: 'optimize-covers.mjs' },   // worst today 65 KB
  { dir: 'products', w: 512,  h: 512, maxKB: 60,  alpha: false, pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, script: 'optimize-products.mjs' }, // worst today 35 KB
  { dir: 'promo',    w: 1024, h: 576, maxKB: 80,  alpha: false, pattern: /^promo(-[a-z0-9]+)+$/,     script: 'optimize-promo.mjs' },    // worst today 52 KB
  { dir: 'attract',  w: 1024, h: 576, maxKB: 100, alpha: false, pattern: /^frame-[1-9][0-9]*$/,      script: 'optimize-chrome.mjs' },   // worst today 69 KB
]

/** Brand chrome: one-off geometry, so each file is pinned individually. */
const CHROME = [
  { file: 'imba-logo-full.webp', w: 1024, h: 463, maxKB: 80, alpha: true },
  { file: 'imba-mark.webp',      w: 512,  h: 616, maxKB: 80, alpha: true },
  { file: 'imba-wordmark.webp',  w: 1024, h: 549, maxKB: 40, alpha: true },
  // The one backdrop a guest reads text over on a full-height panel, so it is
  // encoded at its source's native width instead of the 1024 the attract frames
  // use, and the ceiling is raised to match. Worst today 95 KB.
  { file: 'lock-bg.webp',        w: 1664, h: 936, maxKB: 130, alpha: false },
]

/**
 * The F7.5 fallback plate. Pinned separately from brand chrome because it is not
 * brand: it stands in for a promo banner, an attract frame or the lock wallpaper,
 * so it carries the widest 16:9 geometry of those families and no mark at all.
 *
 * The ceiling is deliberately tight (20 KB against 4 KB today). A plate that grew
 * to cover-size weight would be a picture someone had drawn on it, and a
 * recognisable plate reads as a real campaign on every surface it replaces.
 */
const PLATE = [{ file: 'fallback.webp', w: 1024, h: 576, maxKB: 20, alpha: false }]

/**
 * Favicon-class files Next.js and the browser reference by convention rather than
 * by an import we could grep for. Exempt from the orphan check, not from weight.
 */
const CONVENTIONAL = new Set([
  'icon.svg',
  'apple-icon.png',
  'icon-dark-32x32.png',
  'icon-light-32x32.png',
])

/** Shipped with the scaffold, referenced by nothing. Tolerated, capped, not grown. */
const SCAFFOLD = new Set([
  'placeholder-logo.png',
  'placeholder-logo.svg',
  'placeholder-user.jpg',
  'placeholder.jpg',
  'placeholder.svg',
])

const problems = []
const notes = []
const fail = (m) => problems.push(m)
const kb = (bytes) => Math.round(bytes / 1024)

/** Every source file that could plausibly reference an asset path. */
function sourceText() {
  const roots = ['app', 'components', 'lib', 'hooks', 'scripts']
  let text = ''
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(tsx?|mjs|css)$/.test(entry.name)) text += readFileSync(full, 'utf8')
    }
  }
  roots.forEach(walk)
  return text
}

const SRC = sourceText()

/**
 * True when the codebase can reach this asset. A family member counts as reached
 * if its own name appears, or if some template literal builds the whole family's
 * path (`/covers/${game.id}.webp`) — the latter is how all four families are
 * actually consumed, so we look for the directory prefix inside a template.
 */
function isReferenced(publicPath, dir) {
  if (SRC.includes(publicPath)) return true
  if (dir && new RegExp(`/${dir}/\\$\\{`).test(SRC)) return true
  return false
}

for (const fam of FAMILIES) {
  const dir = join('public', fam.dir)
  if (!existsSync(dir)) {
    fail(`missing directory public/${fam.dir}/ — expected, produced by scripts/${fam.script}`)
    continue
  }

  const files = readdirSync(dir)
  if (files.length === 0) fail(`public/${fam.dir}/ is empty`)

  const templated = new RegExp(`/${fam.dir}/\\$\\{`).test(SRC)
  let total = 0

  for (const file of files) {
    const rel = `public/${fam.dir}/${file}`
    const ext = extname(file)
    const stem = basename(file, ext)

    if (ext !== '.webp') {
      fail(`${rel}: extension "${ext}" — the family ships .webp only (§13.2). Source art does not live in public/.`)
      continue
    }
    if (!fam.pattern.test(stem)) {
      fail(`${rel}: name "${stem}" breaks the family pattern ${fam.pattern} (§13.4)`)
    }

    const bytes = statSync(rel).size
    total += bytes
    if (kb(bytes) > fam.maxKB) {
      fail(`${rel}: ${kb(bytes)} KB exceeds the ${fam.maxKB} KB ceiling for ${fam.dir}/ (§13.3). Re-run scripts/${fam.script}.`)
    }

    const meta = await sharp(rel).metadata()
    if (meta.width !== fam.w || meta.height !== fam.h) {
      fail(`${rel}: ${meta.width}×${meta.height}, family is fixed at ${fam.w}×${fam.h} (§13.1). Re-run scripts/${fam.script} instead of hand-dropping files.`)
    }
    if (meta.hasAlpha !== fam.alpha) {
      fail(`${rel}: alpha=${meta.hasAlpha}, expected ${fam.alpha} (§13.2)`)
    }
    if (!templated && !isReferenced(`/${fam.dir}/${file}`, fam.dir)) {
      fail(`${rel}: nothing in the codebase references it (§13.5)`)
    }
  }

  notes.push(`${fam.dir}/: ${files.length} files, ${kb(total)} KB total, ${fam.w}×${fam.h}`)
}

for (const item of [...CHROME, ...PLATE]) {
  const rel = `public/${item.file}`
  if (!existsSync(rel)) {
    // The plate is the one asset whose absence breaks the *fallback* path, so it
    // is called out by name rather than folded into the chrome message.
    fail(
      item.file === 'fallback.webp'
        ? `missing ${rel} — the F7.5 fallback plate; without it AssetImage has nothing to draw (§13.8)`
        : `missing ${rel} — brand chrome, produced by scripts/optimize-chrome.mjs`,
    )
    continue
  }
  const bytes = statSync(rel).size
  if (kb(bytes) > item.maxKB) {
    fail(`${rel}: ${kb(bytes)} KB exceeds its ${item.maxKB} KB ceiling (§13.3)`)
  }
  const meta = await sharp(rel).metadata()
  if (meta.width !== item.w || meta.height !== item.h) {
    fail(`${rel}: ${meta.width}×${meta.height}, pinned at ${item.w}×${item.h} (§13.1)`)
  }
  if (meta.hasAlpha !== item.alpha) {
    fail(`${rel}: alpha=${meta.hasAlpha}, expected ${item.alpha} (§13.2)`)
  }
  if (!isReferenced(`/${item.file}`)) {
    fail(`${rel}: nothing references it (§13.5)`)
  }
}

/* ------------------------------------------------------------------ *
 * F8.1 — the interface sound set (§13.9)
 *
 * Sounds are held to the same contract as pictures, and for a sharper reason:
 * a too-loud or too-long cue is not a bad *look*, it is the thing that makes a
 * room mute the launcher permanently — and nobody files that as a bug. So
 * "quiet" and "short" are measured off the bytes on disk, not promised.
 *
 * The header is parsed by hand (44-byte canonical RIFF, which is exactly what
 * the generator writes) rather than with a library: one dependency for four
 * integers, in a check that exists to catch hand-dropped files, is a worse
 * trade than twenty lines here.
 * ------------------------------------------------------------------ */
const SFX_CATALOG = join('lib', 'assets', 'sfx.ts')

/** Canonical PCM header → `{ channels, rate, bits, samples }`, or an error string. */
function readWav(buf) {
  if (buf.length < 44) return 'file is shorter than a WAV header'
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return 'not a RIFF/WAVE file'
  }
  if (buf.toString('ascii', 12, 16) !== 'fmt ' || buf.toString('ascii', 36, 40) !== 'data') {
    return 'non-canonical chunk layout — regenerate with scripts/generate-sfx.mjs'
  }
  if (buf.readUInt16LE(20) !== 1) return 'not uncompressed PCM'

  const bits = buf.readUInt16LE(34)
  const dataBytes = buf.readUInt32LE(40)
  if (44 + dataBytes !== buf.length) return 'data chunk size disagrees with the file size'

  return {
    channels: buf.readUInt16LE(22),
    rate: buf.readUInt32LE(24),
    bits,
    samples: dataBytes / (bits / 8),
    peak: (() => {
      let peak = 0
      for (let i = 44; i + 1 < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)))
      return peak / 32767
    })(),
    firstSample: buf.readInt16LE(44),
    lastSample: buf.readInt16LE(buf.length - 2),
  }
}

if (!existsSync(join('public', 'sfx'))) {
  fail('missing directory public/sfx/ — the F8.1 sound set, produced by scripts/generate-sfx.mjs')
} else {
  const onDisk = readdirSync(join('public', 'sfx'))
  const declared = new Set(sfxIds().map((id) => `${id}.wav`))

  for (const file of onDisk) {
    if (!declared.has(file)) {
      fail(
        `public/sfx/${file}: not in scripts/lib/sfx-manifest.mjs — every cue is generated, ` +
          `so a file the manifest does not know about cannot be reproduced (§13.9)`,
      )
    }
  }

  let totalBytes = 0
  for (const spec of SFX) {
    const rel = join('public', sfxPath(spec.id))
    if (!existsSync(rel)) {
      fail(`missing ${rel} — declared in the manifest; run \`pnpm assets:sfx\` (§13.9)`)
      continue
    }

    const bytes = readFileSync(rel)
    totalBytes += bytes.length
    if (kb(bytes.length) > SFX_MAX_KB) {
      fail(`${rel}: ${kb(bytes.length)} KB exceeds the ${SFX_MAX_KB} KB ceiling (§13.9)`)
    }

    const wav = readWav(bytes)
    if (typeof wav === 'string') {
      fail(`${rel}: ${wav} (§13.9)`)
      continue
    }

    if (wav.channels !== 1 || wav.rate !== SFX_RATE || wav.bits !== 16) {
      fail(
        `${rel}: ${wav.channels}ch ${wav.rate} Hz ${wav.bits}-bit, the set is fixed at ` +
          `mono ${SFX_RATE} Hz 16-bit (§13.9). Re-run scripts/generate-sfx.mjs instead of ` +
          `hand-dropping files.`,
      )
    }

    const seconds = wav.samples / wav.rate
    if (seconds > SFX_MAX_S + 0.001) {
      fail(
        `${rel}: ${Math.round(seconds * 1000)} ms exceeds the ${Math.round(SFX_MAX_S * 1000)} ms ` +
          `ceiling — past that a cue stops being feedback and becomes a jingle (§13.9)`,
      )
    }
    if (Math.abs(seconds - spec.dur) > 0.002) {
      fail(
        `${rel}: ${Math.round(seconds * 1000)} ms on disk, manifest declares ` +
          `${Math.round(spec.dur * 1000)} ms — the file predates the recipe; run \`pnpm assets:sfx\` (§13.9)`,
      )
    }

    // Loudness. The manifest ceiling is applied by exact peak normalisation, so
    // a mismatch means the bytes were not produced by the current recipe.
    const peakDb = 20 * Math.log10(wav.peak || 1e-9)
    if (peakDb > -12) {
      fail(
        `${rel}: peak ${peakDb.toFixed(1)} dBFS — interface cues stay below −12 dBFS, ` +
          `the launcher is never the loudest voice in the room (§13.9)`,
      )
    } else if (Math.abs(peakDb - spec.peakDb) > 0.5) {
      fail(
        `${rel}: peak ${peakDb.toFixed(1)} dBFS but the manifest declares ${spec.peakDb} — ` +
          `run \`pnpm assets:sfx\` (§13.9)`,
      )
    }

    // Silent edges: a cue retriggered mid-tail must not click, and a click on a
    // kiosk reads as broken hardware rather than as a quiet sound.
    if (wav.firstSample !== 0 || wav.lastSample !== 0) {
      fail(
        `${rel}: starts at ${wav.firstSample} and ends at ${wav.lastSample}, both must be 0 — ` +
          `a hard edge clicks (§13.9)`,
      )
    }

    if (!isReferenced(`/sfx/${spec.id}.wav`, 'sfx')) {
      fail(`${rel}: nothing in the codebase references it (§13.5)`)
    }
  }

  // Catalogue parity: the ids the product can *ask* for must be exactly the ids
  // that exist. A cue in the catalogue with no file is a silent 404 on click;
  // a file with no catalogue entry is weight nobody can play.
  if (!existsSync(SFX_CATALOG)) {
    fail(`missing ${SFX_CATALOG} — the module that gives the sound set a consumer (§13.9)`)
  } else {
    const catalog = readFileSync(SFX_CATALOG, 'utf8')
    const listed = [...catalog.matchAll(/'\/sfx\/([a-z0-9-]+)\.wav'/g)].map((m) => m[1])
    for (const id of sfxIds()) {
      if (!listed.includes(id)) fail(`${SFX_CATALOG}: no entry for "${id}" (§13.9)`)
    }
    for (const id of listed) {
      if (!sfxIds().includes(id)) {
        fail(`${SFX_CATALOG}: entry "${id}" has no file in public/sfx/ — a silent click (§13.9)`)
      }
    }
  }

  const critical = SFX.filter((s) => s.critical).map((s) => s.id)
  notes.push(
    `sfx/: ${SFX.length} files, ${kb(totalBytes)} KB total, mono ${SFX_RATE} Hz 16-bit, ` +
      `≤${Math.round(SFX_MAX_S * 1000)} ms, peaks −20…−14 dBFS (critical: ${critical.join(', ')})`,
  )
}

/** Loose files at the root of public/ that belong to no known bucket. */
for (const entry of readdirSync('public', { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (entry.name !== 'sfx' && !FAMILIES.some((f) => f.dir === entry.name)) {
      fail(`public/${entry.name}/ is an undeclared asset directory — add it to §13 and to this script, or remove it`)
    }
    continue
  }
  const name = entry.name
  if (
    CHROME.some((c) => c.file === name) ||
    PLATE.some((p) => p.file === name) ||
    CONVENTIONAL.has(name) ||
    SCAFFOLD.has(name)
  )
    continue
  fail(`public/${name}: undeclared root asset — declare it in §13 and in this script, or remove it (§13.5)`)
}

/**
 * Blank out comment bodies, preserving length and newlines so offsets and line
 * numbers still line up with the original text.
 *
 * Needed because this codebase documents itself heavily: `crash-screen.tsx`
 * explains in prose that "the brand mark is a plain `<img>`", and a scanner that
 * reads comments reports that sentence as an image without alt. Strings are
 * stepped over so a `//` inside a URL is not mistaken for a comment.
 */
function maskComments(text) {
  const out = text.split('')
  let i = 0
  while (i < text.length) {
    const c = text[i]
    const next = text[i + 1]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i++
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue }
        if (text[i] === quote) { i++; break }
        i++
      }
      continue
    }
    if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') { out[i] = ' '; i++ }
      continue
    }
    if (c === '/' && next === '*') {
      out[i] = ' '; out[i + 1] = ' '
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        if (text[i] !== '\n') out[i] = ' '
        i++
      }
      if (i < text.length) { out[i] = ' '; out[i + 1] = ' '; i += 2 }
      continue
    }
    i++
  }
  return out.join('')
}

/**
 * Find the opening tag of every `<Image>` / `<img>`, returning its exact source.
 *
 * A regex cannot do this: JSX props hold arbitrary expressions, and `onError={() =>`
 * puts a `>` inside the tag, so any `[^>]*` pattern truncates the match and then
 * reports a perfectly good `alt` as missing. This walks the text tracking string,
 * template-literal, comment and brace depth, and stops at the `>` that is actually
 * at depth zero.
 */
function findImageTags(text) {
  const out = []
  const re = /<(Image|img)(?=[\s/>])/g
  let m
  while ((m = re.exec(text)) !== null) {
    let i = m.index + m[0].length
    let depth = 0
    let quote = null // "'", '"', or '`'
    let comment = null // 'line' | 'block'
    for (; i < text.length; i++) {
      const c = text[i]
      const next = text[i + 1]
      if (comment === 'line') {
        if (c === '\n') comment = null
        continue
      }
      if (comment === 'block') {
        if (c === '*' && next === '/') { comment = null; i++ }
        continue
      }
      if (quote) {
        if (c === '\\') { i++; continue }
        if (c === quote) quote = null
        continue
      }
      if (c === '/' && next === '/') { comment = 'line'; i++; continue }
      if (c === '/' && next === '*') { comment = 'block'; i++; continue }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue }
      if (c === '{' || c === '(' || c === '[') { depth++; continue }
      if (c === '}' || c === ')' || c === ']') { depth--; continue }
      if (depth === 0 && c === '>') break
    }
    const source = text.slice(m.index, i + 1)
    out.push({
      name: m[1],
      source,
      line: text.slice(0, m.index).split('\n').length,
    })
    re.lastIndex = i
  }
  return out
}

/** Every <img>/<Image> in the product must resolve its accessible name (§13.6). */
const altless = []
for (const dir of ['app', 'components']) {
  const walk = (d) => {
    if (!existsSync(d)) return
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.tsx')) {
        const text = readFileSync(full, 'utf8')
        // Count element openings, not every mention of the word.
        for (const tag of findImageTags(maskComments(text))) {
          if (!/\balt\s*=/.test(tag.source)) {
            altless.push(`${full}:${tag.line} <${tag.name}> without alt (§13.6)`)
          }
        }
      }
    }
  }
  walk(dir)
}
altless.forEach(fail)

/* ------------------------------------------------------------------ *
 * F7.5 — the fallback funnel (§13.8)
 *
 * Three rules, and each one exists because the failure it prevents is
 * *invisible*: a stale blur map, a bare `next/image` or a stock placeholder
 * all render something, just the wrong thing, and only on the cold-cache
 * kiosk where nobody is looking at a console.
 * ------------------------------------------------------------------ */

/** Every policed source file, comment bodies blanked, line offsets preserved. */
function policedFiles() {
  const out = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(tsx?|css)$/.test(entry.name)) {
        out.push({ file: full, text: maskComments(readFileSync(full, 'utf8')) })
      }
    }
  }
  ;['app', 'components', 'lib', 'hooks'].forEach(walk)
  return out
}

/** The single file allowed to touch `next/image`. */
const IMAGE_FUNNEL = join('components', 'ui', 'asset-image.tsx')

for (const { file, text } of policedFiles()) {
  text.split('\n').forEach((line, i) => {
    // The scaffold's grey camera glyph is a *light* asset on a dark kiosk and
    // says "this build is unfinished". `AssetImage`'s fallback prop covers every
    // case it used to: a designed empty state, the plate, or nothing at all.
    if (line.includes('placeholder.svg')) {
      fail(`${file}:${i + 1} references placeholder.svg — use AssetImage's fallback prop (§13.8)`)
    }
  })

  if (/from\s+['"]next\/image['"]/.test(text) && file !== IMAGE_FUNNEL) {
    fail(
      `${file}: imports next/image directly — every surface goes through components/ui/asset-image.tsx, ` +
        `which is what guarantees onError and the LQIP (§13.8)`,
    )
  }
}

/**
 * The blur map must cover exactly the art it claims to, and must have been
 * generated from the bytes that are on disk right now.
 *
 * The covered set and the fingerprint both come from `scripts/lib/blur-manifest.mjs`,
 * shared with the generator: two hand-kept lists would drift, and drift is the
 * bug — an LQIP baked from a previous edit of a banner is not a missing image, it
 * is a *wrong* image shown with full confidence, for as long as decoding takes.
 */
const BLUR_MODULE = join('lib', 'assets', 'blur-data.generated.ts')

if (!existsSync(BLUR_MODULE)) {
  fail(`missing ${BLUR_MODULE} — run \`pnpm assets:blur\` (§13.8)`)
} else {
  const covered = coveredPaths()
  const blurSrc = readFileSync(BLUR_MODULE, 'utf8')
  const entries = [...blurSrc.matchAll(/^\s*'(\/[^']+)':/gm)].map((m) => m[1])
  const have = new Set(entries)

  for (const p of covered) {
    if (!have.has(p)) {
      fail(`${BLUR_MODULE}: no blur placeholder for ${p} — run \`pnpm assets:blur\` (§13.8)`)
    }
  }
  for (const p of entries) {
    if (!covered.includes(p)) {
      fail(
        `${BLUR_MODULE}: blur entry for ${p}, which no longer exists in public/ — ` +
          `run \`pnpm assets:blur\` (§13.8)`,
      )
    }
  }
  if (!/data:image\/webp;base64,/.test(blurSrc)) {
    fail(`${BLUR_MODULE}: entries are not webp data URLs — regenerate it (§13.8)`)
  }

  // Staleness, by content rather than by mtime: a fresh clone stamps every file
  // with the checkout time, so an mtime comparison would fail CI on a tree nobody
  // has touched. See scripts/lib/blur-manifest.mjs.
  const recorded = /BLUR_FINGERPRINT = '([a-f0-9]+)'/.exec(blurSrc)?.[1]
  const actual = blurFingerprint(covered)
  if (!recorded) {
    fail(`${BLUR_MODULE}: no BLUR_FINGERPRINT — regenerate it with \`pnpm assets:blur\` (§13.8)`)
  } else if (recorded !== actual) {
    fail(
      `${BLUR_MODULE}: fingerprint ${recorded} but the art hashes to ${actual} — ` +
        `the placeholders describe an older version of these files; run \`pnpm assets:blur\` (§13.8)`,
    )
  }

  notes.push(
    `blur/: ${entries.length} placeholders, ${kb(blurSrc.length)} KB module, fingerprint ${actual}`,
  )
}

console.log('F7.4 asset convention + F7.5 fallbacks + F8.1 sound set\n')
notes.forEach((n) => console.log('  ' + n))

const publicKB = (() => {
  let sum = 0
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name)
      if (e.isDirectory()) walk(f)
      else sum += statSync(f).size
    }
  }
  walk('public')
  return kb(sum)
})()
console.log(`  public/ total: ${publicKB} KB`)

if (problems.length) {
  console.error(`\n${problems.length} violation(s):`)
  problems.forEach((p) => console.error('  ✗ ' + p))
  process.exit(1)
}
console.log(
  '\n✓ geometry, format, weight, naming, consumers, alt, image funnel, blur map and sound set all conform',
)
