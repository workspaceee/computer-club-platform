/**
 * F7.2 — asset pipeline for `public/products/`.
 *
 * Sibling of `scripts/optimize-covers.mjs`, and deliberately much shorter: the
 * band-detection machinery there exists because a 16:9 cover comes out of a
 * square generator with letterbox baked into the pixels. Product shots are
 * *already* the aspect the UI wants — 1024x1024 studio frames, subject centred
 * on a dark surface — so there is nothing to detect and nothing to crop. Adding
 * a detector here would only invent a way to eat the deliberate negative space
 * around a bottle.
 *
 * So the whole job is weight. 36 PNGs at ~0.7 MB each is 26 MB of source art
 * for tiles that render at ~350px in the shop grid, and `next.config.mjs` sets
 * `images.unoptimized`, which means whatever is in `public/` is exactly what the
 * kiosk downloads — there is no build step behind `next/image` to save us.
 *
 *   1. Resize to 512x512: 2x the largest rendered tile (`aspect-square` inside a
 *      3-column `max-w-6xl` grid, ~352px), so the art still holds up on a HiDPI
 *      kiosk screen.
 *   2. webp q82, same setting as the covers, for one consistent knob across the
 *      two pipelines.
 *
 * Idempotent: a webp newer than its PNG is left alone, so re-running after
 * dropping in two new shots re-encodes two files rather than all thirty-six.
 * Pass `--force` to re-encode everything (a quality change, say).
 *
 * The PNGs are source assets, not deliverables: they are deleted after a
 * verified run and only the webp outputs are committed. To re-run against fresh
 * sources, drop the PNGs back into `public/products/` (or point `PRODUCTS_SRC`
 * at wherever they live) and run `node scripts/optimize-products.mjs`.
 */
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC_DIR = process.env.PRODUCTS_SRC
  ? path.resolve(process.env.PRODUCTS_SRC)
  : path.join(process.cwd(), 'public', 'products')
const OUT_DIR = path.join(process.cwd(), 'public', 'products')

const OUT_SIZE = 512
const QUALITY = 82
const FORCE = process.argv.includes('--force')

/** `true` when the output is missing or older than the source. */
async function needsWork(srcPath, outPath) {
  if (FORCE) return true
  try {
    const [src, out] = await Promise.all([stat(srcPath), stat(outPath)])
    return out.mtimeMs < src.mtimeMs
  } catch {
    return true
  }
}

async function main() {
  let files
  try {
    files = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.png')).sort()
  } catch {
    console.log(`[products] source directory ${SRC_DIR} does not exist — nothing to do`)
    return
  }
  if (files.length === 0) {
    // The expected state of a clean checkout: the PNGs are gone and the webp
    // outputs are what the repository carries. Not an error.
    console.log(`[products] no source PNGs in ${SRC_DIR} — nothing to do`)
    return
  }
  await mkdir(OUT_DIR, { recursive: true })

  let sourceBytes = 0
  let outputBytes = 0
  let written = 0
  let skipped = 0
  const odd = []

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file)
    const outPath = path.join(OUT_DIR, file.replace(/\.png$/, '.webp'))

    if (!(await needsWork(srcPath, outPath))) {
      skipped++
      continue
    }

    const input = await readFile(srcPath)
    sourceBytes += input.byteLength

    // Named so a non-square source is reported rather than silently
    // centre-cropped by `fit: 'cover'` below.
    const { width, height } = await sharp(input).metadata()
    if (width !== height) odd.push(`${file} (${width}x${height})`)

    const buffer = await sharp(input)
      .resize(OUT_SIZE, OUT_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer()

    await writeFile(outPath, buffer)
    outputBytes += buffer.byteLength
    written++

    console.log(
      `[products] ${file.padEnd(28)} ${width}x${height} ` +
        `${(input.byteLength / 1024).toFixed(0)} KB -> ${OUT_SIZE}x${OUT_SIZE} ` +
        `${(buffer.byteLength / 1024).toFixed(0)} KB`,
    )
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(2)
  console.log(
    `[products] ${written} encoded, ${skipped} up to date: ` +
      `${mb(sourceBytes)} MB PNG -> ${mb(outputBytes)} MB webp` +
      (written > 0 ? ` (avg ${(outputBytes / written / 1024).toFixed(0)} KB)` : ''),
  )
  if (odd.length > 0) {
    console.log(`[products] WARNING non-square source, centre-cropped: ${odd.join(', ')}`)
  }
}

main().catch((error) => {
  console.error('[products] failed', error)
  process.exit(1)
})
