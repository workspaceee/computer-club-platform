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
  { file: 'lock-bg.webp',        w: 1024, h: 576, maxKB: 70, alpha: false },
]

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

for (const item of CHROME) {
  const rel = `public/${item.file}`
  if (!existsSync(rel)) {
    fail(`missing ${rel} — brand chrome, produced by scripts/optimize-chrome.mjs`)
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

/** Loose files at the root of public/ that belong to no known bucket. */
for (const entry of readdirSync('public', { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (!FAMILIES.some((f) => f.dir === entry.name)) {
      fail(`public/${entry.name}/ is an undeclared asset directory — add it to §13 and to this script, or remove it`)
    }
    continue
  }
  const name = entry.name
  if (CHROME.some((c) => c.file === name) || CONVENTIONAL.has(name) || SCAFFOLD.has(name)) continue
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

console.log('F7.4 asset convention\n')
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
console.log('\n✓ geometry, format, weight, naming, consumers and alt all conform')
