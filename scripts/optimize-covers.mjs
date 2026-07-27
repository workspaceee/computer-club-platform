/**
 * F7.1 — asset pipeline for `public/covers/`.
 *
 * The image generator emits 1024x1024 PNGs at ~1 MB each. A 67-title catalogue
 * of those is ~70 MB shipped to a launcher that renders 20+ tiles at once, so
 * the raw output is a source asset, not a deliverable. This script turns it
 * into what the UI actually needs:
 *
 *   - 16:9 crop, because every surface that mounts `GameCover` is landscape
 *     (`h-40 w-full` tiles, full-bleed hero). The window is taken slightly
 *     above the vertical centre: the prompts put the subject above the middle
 *     and keep the bottom edge dark, so this keeps the focal point and the
 *     scrim room for the title.
 *   - 960x540 webp, which is 2x the largest rendered tile and ~25x lighter.
 *
 * Idempotent: re-running only rewrites the webp outputs. Run with
 * `node scripts/optimize-covers.mjs` after adding new PNGs.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const COVERS_DIR = path.join(process.cwd(), 'public', 'covers')
const OUT_WIDTH = 960
const OUT_HEIGHT = 540
/** Fraction of the leftover height taken off the top (0.5 = centred). */
const CROP_BIAS = 0.36

async function main() {
  const files = (await readdir(COVERS_DIR)).filter((f) => f.endsWith('.png')).sort()
  if (files.length === 0) {
    console.log('[covers] no source PNGs found')
    return
  }

  let sourceBytes = 0
  let outputBytes = 0

  for (const file of files) {
    const src = path.join(COVERS_DIR, file)
    const out = src.replace(/\.png$/, '.webp')
    const input = await readFile(src)
    sourceBytes += input.byteLength

    const image = sharp(input)
    const { width = 0, height = 0 } = await image.metadata()
    const cropHeight = Math.min(height, Math.round((width / 16) * 9))
    const top = Math.round((height - cropHeight) * CROP_BIAS)

    const buffer = await image
      .extract({ left: 0, top, width, height: cropHeight })
      .resize(OUT_WIDTH, OUT_HEIGHT, { fit: 'cover' })
      .webp({ quality: 80, effort: 5 })
      .toBuffer()

    await writeFile(out, buffer)
    outputBytes += buffer.byteLength
    console.log(`[covers] ${file} -> ${path.basename(out)} ${(buffer.byteLength / 1024).toFixed(0)} KB`)
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  console.log(
    `[covers] ${files.length} files: ${mb(sourceBytes)} MB PNG -> ${mb(outputBytes)} MB webp ` +
      `(avg ${(outputBytes / files.length / 1024).toFixed(0)} KB)`,
  )
  await stat(COVERS_DIR)
}

main().catch((error) => {
  console.error('[covers] failed', error)
  process.exit(1)
})
