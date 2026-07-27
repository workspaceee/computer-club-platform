/**
 * F7.5 — the single declaration of *which* assets get an LQIP, plus the
 * fingerprint that tells whether the generated map still matches them.
 *
 * Both `scripts/generate-blur.mjs` (writer) and `scripts/verify-assets.mjs`
 * (checker) import this. Two hand-kept copies of the covered set would drift,
 * and drift is the actual bug: an LQIP baked from a previous edit of a banner is
 * not a missing image, it is a *wrong* image shown with full confidence.
 *
 * ## Why a fingerprint and not mtimes
 *
 * The obvious staleness test is "is the map older than the art". It is wrong
 * here: a fresh `git clone` stamps every file with the checkout time, so the
 * comparison is a coin flip that fails CI on a tree nobody has touched. Content
 * hashes have neither problem — they change when, and only when, the bytes that
 * the LQIP was derived from change.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const PUBLIC = 'public'

/**
 * Directories rendered full-bleed — every webp inside gets an LQIP.
 *
 * `covers/` and `products/` are deliberately absent: those surfaces paint a
 * designed layer under the art (hashed gradient + initials, category icon), so a
 * blur would be 103 extra data URLs in the client bundle buying nothing. See the
 * docblock of `generate-blur.mjs` for the full reasoning.
 */
export const BLUR_DIRS = ['promo', 'attract']

/** Root-level one-offs, listed by name because `public/` also holds icons. */
export const BLUR_FILES = ['lock-bg.webp', 'fallback.webp']

/**
 * Public paths that must have an LQIP, in a stable order (directories in
 * declaration order, names sorted; root files sorted last). The order is part of
 * the contract — it keeps the generated module diff-free across re-runs and makes
 * the fingerprint reproducible.
 */
export function coveredPaths() {
  const out = []
  for (const dir of BLUR_DIRS) {
    const abs = path.join(PUBLIC, dir)
    if (!existsSync(abs)) continue
    for (const name of readdirSync(abs)
      .filter((n) => n.endsWith('.webp'))
      .sort()) {
      out.push(`/${dir}/${name}`)
    }
  }
  for (const name of [...BLUR_FILES].sort()) out.push(`/${name}`)
  return out
}

/**
 * Short content hash over the covered set: every path *and* its bytes. Renaming a
 * file changes it, editing a file changes it, adding or removing one changes it.
 * 12 hex chars is plenty — this guards against staleness, not tampering.
 */
export function blurFingerprint(paths = coveredPaths()) {
  const h = createHash('sha256')
  for (const p of paths) {
    h.update(p)
    h.update('\0')
    const abs = path.join(PUBLIC, p)
    h.update(existsSync(abs) ? createHash('sha256').update(readFileSync(abs)).digest() : 'missing')
  }
  return h.digest('hex').slice(0, 12)
}
