/**
 * F7.4 — asset pipeline for the app chrome: full-bleed backdrops and brand marks.
 *
 * `optimize-covers` / `optimize-products` / `optimize-promo` each own one folder
 * of *content* art. What was left over after F7.1–F7.3 is the chrome — the
 * pictures that are part of the shell rather than the catalogue:
 *
 *   public/attract/frame-1..3.png   1024x1024, ~1.2 MB each
 *   public/lock-bg.png              1024x1024, 1.17 MB
 *   public/imba-logo-full.png       1946x880,  224 KB
 *   public/imba-mark.png            732x880,   167 KB
 *   public/imba-wordmark.png        1182x634,  44 KB
 *
 * They were the last PNGs being *served* rather than kept as sources, and with
 * `images.unoptimized: true` in `next.config.mjs` there is no runtime resizer
 * behind them: the kiosk downloads these exact bytes. 4.9 MB of shell before a
 * single cover loads.
 *
 * Two transforms, chosen by what the file is:
 *
 *  - **Backdrops** (`BACKDROPS`) are cropped to 16:9 and encoded at 1024x576.
 *    The crop is not a design decision — `lock-screen` and `attract-mode` both
 *    render these with `object-cover` in a 16:9 box, so the browser was already
 *    throwing away the top and bottom of a square frame on every paint. Baking
 *    the same crop ships the pixels that are actually visible and nothing else.
 *    The target width is per-file and follows the source: 1024 for the square
 *    attract frames, 1664 for the wide `lock-bg` render. Never above native —
 *    upscaling adds bytes and no detail.
 *
 *  - **Marks** (`MARKS`) keep their aspect ratio and their alpha, and are only
 *    capped in width to roughly 2x the largest box they render in (§13 of
 *    `docs/DESIGN.md`). `imba-logo-full` draws at 320 px on the attract screen,
 *    so 1024 px of source is already generous on a HiDPI panel.
 *
 * Like its siblings the script is idempotent and source-driven: the PNGs are
 * inputs, the webp files are the deliverables, and a clean checkout has no
 * inputs at all — then this prints `nothing to do` and exits 0 so CI stays
 * green. To re-run against fresh art, drop the PNGs back into `public/` and
 * run `node scripts/optimize-chrome.mjs`.
 *
 * Verify with `node scripts/check-assets.mjs`, which fails if any of these
 * outputs drift from the sizes and budgets promised in `docs/DESIGN.md`.
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

/**
 * Full-bleed art rendered with `object-cover` in a 16:9 box.
 *
 * The defaults describe the attract frames: 1024 px is their generator's native
 * width, and asking for more would upscale. A file may override any of them,
 * because "native width" is a property of the source, not of the family —
 * `lock-bg` comes from a 1679 px render, and clamping it to 1024 threw away a
 * third of the detail it actually had. It is also the one backdrop a guest
 * stares at while typing a PIN on a full-height panel, so it is encoded at its
 * own native width and a higher quality, and carries a larger ceiling in §13.3
 * to match. Weight is spent where it is looked at.
 */
const BACKDROPS = {
  width: 1024,
  height: 576,
  quality: 82,
  /** Fraction of the leftover height taken off the top (0.5 = centred). */
  bias: 0.5,
  files: [
    'attract/frame-1.png',
    'attract/frame-2.png',
    'attract/frame-3.png',
    { file: 'lock-bg.png', width: 1664, height: 936, quality: 88 },
  ],
}

/** Logos: aspect ratio and alpha are load-bearing, width is not. */
const MARKS = {
  quality: 90,
  files: [
    { file: 'imba-logo-full.png', maxWidth: 1024 },
    { file: 'imba-mark.png', maxWidth: 512 },
    { file: 'imba-wordmark.png', maxWidth: 1024 },
  ],
}

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

async function readSource(relative) {
  const srcPath = path.join(PUBLIC_DIR, relative)
  const outPath = srcPath.replace(/\.png$/, '.webp')
  try {
    await stat(srcPath)
  } catch {
    return null
  }
  if (!(await needsWork(srcPath, outPath))) return { skip: true }
  return { srcPath, outPath, input: await readFile(srcPath) }
}

/** Centre-weighted window of the requested aspect, clamped to the source. */
function cropWindow(sourceWidth, sourceHeight, aspect, bias) {
  let width = sourceWidth
  let height = Math.round(width / aspect)
  if (height > sourceHeight) {
    height = sourceHeight
    width = Math.round(height * aspect)
  }
  return {
    left: Math.round((sourceWidth - width) / 2),
    top: Math.round((sourceHeight - height) * bias),
    width,
    height,
  }
}

async function main() {
  let sourceBytes = 0
  let outputBytes = 0
  let written = 0
  let skipped = 0
  let missing = 0

  for (const entry of BACKDROPS.files) {
    // A bare string means "family defaults"; an object overrides some of them.
    const relative = typeof entry === 'string' ? entry : entry.file
    const width = entry.width ?? BACKDROPS.width
    const height = entry.height ?? BACKDROPS.height
    const quality = entry.quality ?? BACKDROPS.quality

    const source = await readSource(relative)
    if (source === null) {
      missing++
      continue
    }
    if (source.skip) {
      skipped++
      continue
    }
    const { input, outPath } = source
    sourceBytes += input.byteLength

    const meta = await sharp(input).metadata()
    const window = cropWindow(meta.width, meta.height, width / height, BACKDROPS.bias)
    const buffer = await sharp(input)
      .extract(window)
      // `kernel: 'lanczos3'` is sharp's default, spelled out because for these
      // near-1:1 resizes it is the whole point: the crop is only a few pixels
      // wider than the target, so the encode must not soften what it resamples.
      .resize(width, height, { fit: 'cover', kernel: 'lanczos3' })
      .webp({ quality, effort: 6 })
      .toBuffer()

    await writeFile(outPath, buffer)
    outputBytes += buffer.byteLength
    written++
    console.log(
      `[chrome] ${relative.padEnd(24)} ${meta.width}x${meta.height} ` +
        `-> crop ${window.width}x${window.height}@${window.left},${window.top} ` +
        `-> ${width}x${height} q${quality} ${(buffer.byteLength / 1024).toFixed(0)} KB`,
    )
  }

  for (const { file, maxWidth } of MARKS.files) {
    const source = await readSource(file)
    if (source === null) {
      missing++
      continue
    }
    if (source.skip) {
      skipped++
      continue
    }
    const { input, outPath } = source
    sourceBytes += input.byteLength

    const meta = await sharp(input).metadata()
    const buffer = await sharp(input)
      // `withoutEnlargement` so a smaller future mark is not blown up to the cap.
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: MARKS.quality, effort: 5, alphaQuality: 100 })
      .toBuffer()
    const out = await sharp(buffer).metadata()

    await writeFile(outPath, buffer)
    outputBytes += buffer.byteLength
    written++
    console.log(
      `[chrome] ${file.padEnd(24)} ${meta.width}x${meta.height} alpha=${meta.hasAlpha} ` +
        `-> ${out.width}x${out.height} ${(buffer.byteLength / 1024).toFixed(0)} KB`,
    )
  }

  if (written === 0 && skipped === 0) {
    // The expected state of a clean checkout: sources are gone, the webp
    // deliverables are what the repository carries. Not an error.
    console.log(`[chrome] no source PNGs in ${PUBLIC_DIR} — nothing to do`)
    return
  }

  const kb = (n) => (n / 1024).toFixed(0)
  console.log(
    `[chrome] ${written} encoded, ${skipped} up to date, ${missing} absent: ` +
      `${kb(sourceBytes)} KB PNG -> ${kb(outputBytes)} KB webp`,
  )
}

main().catch((error) => {
  console.error('[chrome] failed', error)
  process.exit(1)
})
