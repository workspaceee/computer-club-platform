/**
 * F7.1 — asset pipeline for `public/covers/`.
 *
 * The image generator only emits squares, so a 16:9 prompt comes back as a
 * 1024x1024 PNG with the letterbox *baked into the pixels*: black bands above
 * and below the art. The first version of this script cropped 16:9 out of the
 * geometric centre of that square, which is the wrong frame — the centre of the
 * square is the centre of `art + bands`, so part of each band survived and
 * every tile shipped a black stripe.
 *
 * So the order here is: find the real art, *then* frame it.
 *
 *   1. Detect the baked bands from raw pixels (see `detectArtBox`).
 *   2. Crop 16:9 out of the detected art box, biased slightly above centre —
 *      the prompts put the subject above the middle and keep the bottom edge
 *      dark, which is where the title scrim goes.
 *   3. Resize to 800x450 webp: 2x the largest rendered tile (`h-40 w-full`,
 *      ~400px wide in the 4-column grid) and ~30x lighter than the PNG.
 *
 * `sharp().trim()` is not usable for step 1. The art itself is deliberately
 * near-black at the edges (dark, contrasty, room for a scrim), so a tolerance
 * wide enough to catch the bands also eats the vignette, and one narrow enough
 * to spare the vignette leaves a stripe. And `trim` gives up at the first
 * non-matching pixel, which several of these files have *inside* the band.
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

const SRC_DIR = process.env.COVERS_SRC
  ? path.resolve(process.env.COVERS_SRC)
  : path.join(process.cwd(), 'public', 'covers')
const OUT_DIR = path.join(process.cwd(), 'public', 'covers')

const OUT_WIDTH = 800
const OUT_HEIGHT = 450
const QUALITY = 82

/**
 * A line whose 99th percentile brightness is at or below `DETECT_LEVEL` is
 * treated as band while scanning in from an edge.
 *
 * The *percentile* rather than the max because the bands are not clean black:
 * they carry the generator's dithering plus stray lit pixels (and in one file a
 * bright artefact line along the very bottom edge), and a max-based test reads
 * those as art and stops the scan inside the band. The *level* at 24/255 because
 * band noise is not uniform across the set — most bands sit under 13, but
 * `pathofexile2`'s drifts up to 23 towards the bottom edge, and a threshold that
 * splits per-file is a threshold that ships a stripe in one of them. Trimming a
 * genuinely near-black *art* line by the same rule costs nothing: it is black on
 * screen either way, and the 16:9 window is taken from whatever is left.
 *
 * `ASSERT_LEVEL` is the strict "this is a baked band" level used only by the
 * post-crop check. Separating the two keeps that check honest: at the detection
 * level it would flag the dark bottom of a legitimately dark cover.
 */
const DETECT_LEVEL = 24
const ASSERT_LEVEL = 16
const PERCENTILE = 0.99
/**
 * Content runs shorter than this are noise inside a band, not the start of the
 * art. Guards the scan against the stray bright line mentioned above.
 */
const MIN_CONTENT_RUN = 8
/** Never trim more than this share of a side — a floor under a very dark cover. */
const MAX_TRIM_RATIO = 0.4
/** Fraction of the leftover height taken off the top (0.5 = centred). */
const CROP_BIAS = 0.4

/**
 * Per-line 99th percentile of the max channel, computed with 256-bin histograms
 * (a sort per line would be ~70M comparisons per image).
 *
 * Max channel, not luminance: a saturated dark red (60, 8, 8) is art, and its
 * luminance would read as band-black.
 */
function brightnessProfiles(data, width, height, channels) {
  const rowHist = new Uint32Array(height * 256)
  const colHist = new Uint32Array(width * 256)

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * channels
      const max = Math.max(data[i], data[i + 1], data[i + 2])
      rowHist[y * 256 + max]++
      colHist[x * 256 + max]++
    }
  }

  const percentile = (hist, index, total) => {
    const rank = Math.floor(total * PERCENTILE)
    let seen = 0
    for (let v = 0; v < 256; v++) {
      seen += hist[index * 256 + v]
      if (seen > rank) return v
    }
    return 255
  }

  const rows = new Uint8Array(height)
  for (let y = 0; y < height; y++) rows[y] = percentile(rowHist, y, width)
  const cols = new Uint8Array(width)
  for (let x = 0; x < width; x++) cols[x] = percentile(colHist, x, height)

  return { rows, cols }
}

/**
 * First and last content line, ignoring content runs too short to be art.
 * Returns `{ start, size }` in line units.
 */
function contentRange(profile, count) {
  const isContent = (i) => profile[i] > DETECT_LEVEL
  const limit = Math.floor(count * MAX_TRIM_RATIO)

  /** Advance past band lines and short noise islands, walking with `step`. */
  const firstRealContent = (from, step) => {
    let i = from
    for (let guard = 0; guard <= limit; ) {
      while (i >= 0 && i < count && !isContent(i)) {
        i += step
        guard++
        if (guard > limit) return from
      }
      if (i < 0 || i >= count) return from
      // Measure the run: a genuine art edge continues, noise does not.
      let run = 0
      let j = i
      while (j >= 0 && j < count && isContent(j) && run < MIN_CONTENT_RUN) {
        j += step
        run++
      }
      if (run >= MIN_CONTENT_RUN) return i
      i = j
      guard += run
    }
    return from
  }

  const start = firstRealContent(0, 1)
  const end = firstRealContent(count - 1, -1)
  return end > start ? { start, size: end - start + 1 } : { start: 0, size: count }
}

/** The art rectangle inside a square that has baked letterbox/pillarbox bands. */
async function detectArtBox(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const { rows, cols } = brightnessProfiles(data, width, height, channels)

  const vertical = contentRange(rows, height)
  const horizontal = contentRange(cols, width)

  return {
    left: horizontal.start,
    top: vertical.start,
    width: horizontal.size,
    height: vertical.size,
    sourceWidth: width,
    sourceHeight: height,
    rows,
    cols,
  }
}

/** Largest 16:9 window inside the art box, biased above centre. */
function frame16x9(box) {
  const target = 16 / 9
  if (box.width / box.height > target) {
    const width = Math.round(box.height * target)
    return {
      left: box.left + Math.round((box.width - width) / 2),
      top: box.top,
      width,
      height: box.height,
    }
  }
  const height = Math.round(box.width / target)
  return {
    left: box.left,
    top: box.top + Math.round((box.height - height) * CROP_BIAS),
    width: box.width,
    height,
  }
}

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
    const window = frame16x9(box)

    const top = box.top
    const bottom = box.sourceHeight - (box.top + box.height)
    const sides = box.sourceWidth - box.width
    if (top === 0 && bottom === 0 && sides === 0) untouched.push(file)

    // Post-crop check: the two rows that will become the top and bottom edge of
    // the shipped tile must not be band. This is the assertion the first version
    // of the script lacked — it is what turns "looks right" into "verified".
    const edges = [
      box.rows[window.top],
      box.rows[window.top + window.height - 1],
      box.cols[window.left],
      box.cols[window.left + window.width - 1],
    ]
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
