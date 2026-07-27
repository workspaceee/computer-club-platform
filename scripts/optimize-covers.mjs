/**
 * F7.1 — asset pipeline for `public/covers/`.
 *
 * The image generator only emits squares, so a 16:9 prompt comes back as a
 * 1024x1024 PNG with the letterbox *baked into the pixels*. The first version of
 * this script cropped 16:9 out of the geometric centre of that square, which is
 * the wrong frame — the centre of the square is the centre of `art + bands`, so
 * part of each band survived and every tile shipped a black stripe.
 *
 * So the order here is: find the real art, *then* frame it. The detection lives
 * in `scripts/lib/letterbox.mjs`, shared with the promo pipeline (F7.3), which
 * needs exactly the same treatment — one copy of the thresholds, one knob.
 *
 *   1. Detect the baked bands from raw pixels (`detectArtBox`).
 *   2. Crop 16:9 out of the detected art box, biased slightly above centre —
 *      the prompts put the subject above the middle and keep the bottom edge
 *      dark, which is where the title scrim goes.
 *   3. Resize to 800x450 webp: 2x the largest rendered tile (`h-40 w-full`,
 *      ~400px wide in the 4-column grid) and ~30x lighter than the PNG.
 *   4. Assert that no band line survived on a shipped edge — the check the first
 *      version lacked, and what turns "looks right" into "verified".
 *
 * The PNGs are source assets, not deliverables: 73 MB of them is not going into
 * the repository, so they are deleted after a verified run and only the webp
 * outputs are committed. To re-run against fresh sources, drop the PNGs back
 * into `public/covers/` (or point `COVERS_SRC` at wherever they live) and run
 * `node scripts/optimize-covers.mjs`.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { ASSERT_LEVEL, detectArtBox, edgeReadings, frameAspect } from './lib/letterbox.mjs'

const SRC_DIR = process.env.COVERS_SRC
  ? path.resolve(process.env.COVERS_SRC)
  : path.join(process.cwd(), 'public', 'covers')
const OUT_DIR = path.join(process.cwd(), 'public', 'covers')

const OUT_WIDTH = 800
const OUT_HEIGHT = 450
const QUALITY = 82
/** Fraction of the leftover height taken off the top (0.5 = centred). */
const CROP_BIAS = 0.4

async function main() {
  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.png')).sort()
  if (files.length === 0) {
    console.log(`[covers] no source PNGs in ${SRC_DIR} — nothing to do`)
    return
  }
  await mkdir(OUT_DIR, { recursive: true })

  let sourceBytes = 0
  let outputBytes = 0
  const untouched = []
  const suspect = []

  for (const file of files) {
    const input = await readFile(path.join(SRC_DIR, file))
    sourceBytes += input.byteLength

    const box = await detectArtBox(input)
    const window = frameAspect(box, 16 / 9, CROP_BIAS)

    const top = box.top
    const bottom = box.sourceHeight - (box.top + box.height)
    const sides = box.sourceWidth - box.width
    if (top === 0 && bottom === 0 && sides === 0) untouched.push(file)

    const edges = edgeReadings(box, window)
    if (edges.some((v) => v <= ASSERT_LEVEL)) suspect.push(`${file} (edges ${edges.join('/')})`)

    const buffer = await sharp(input)
      .extract({ left: window.left, top: window.top, width: window.width, height: window.height })
      .resize(OUT_WIDTH, OUT_HEIGHT, { fit: 'cover' })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer()

    await writeFile(path.join(OUT_DIR, file.replace(/\.png$/, '.webp')), buffer)
    outputBytes += buffer.byteLength

    console.log(
      `[covers] ${file.padEnd(18)} bands t${String(top).padStart(3)} b${String(bottom).padStart(3)} ` +
        `x${String(sides).padStart(3)} -> crop ${window.width}x${window.height}@${window.left},${window.top} ` +
        `-> ${(buffer.byteLength / 1024).toFixed(0)} KB`,
    )
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  console.log(
    `[covers] ${files.length} files: ${mb(sourceBytes)} MB PNG -> ${mb(outputBytes)} MB webp ` +
      `(avg ${(outputBytes / files.length / 1024).toFixed(0)} KB)`,
  )
  if (untouched.length > 0) {
    // Not an error — a generator run without baked bands is fine. Worth naming
    // so a silent detection failure never hides behind a clean summary.
    console.log(`[covers] no bands detected in ${untouched.length}: ${untouched.join(', ')}`)
  }
  if (suspect.length > 0) {
    console.log(`[covers] WARNING black edge survived the crop in: ${suspect.join(', ')}`)
  }
}

main().catch((error) => {
  console.error('[covers] failed', error)
  process.exit(1)
})
