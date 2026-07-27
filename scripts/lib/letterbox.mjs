/**
 * Baked-letterbox detection, shared by the `covers` (F7.1) and `promo` (F7.3)
 * pipelines.
 *
 * The image generator only emits squares, so any wide prompt comes back as a
 * 1024x1024 PNG with the letterbox *baked into the pixels*: black bands above
 * and below the art. Cropping a wide window out of the geometric centre of that
 * square is the wrong frame — the centre of the square is the centre of
 * `art + bands`, so part of each band survives and every tile ships a black
 * stripe. The fix is to find the real art first, then frame it.
 *
 * This lived inline in `scripts/optimize-covers.mjs` until the promo banners
 * needed exactly the same treatment. It is one module rather than two copies so
 * the thresholds below stay a single knob — two drifting copies of
 * `DETECT_LEVEL` is how one pipeline quietly starts shipping stripes.
 *
 * `sharp().trim()` is not usable here. The art itself is deliberately near-black
 * at the edges (dark, contrasty, room for a scrim), so a tolerance wide enough
 * to catch the bands also eats the vignette, and one narrow enough to spare the
 * vignette leaves a stripe. And `trim` gives up at the first non-matching pixel,
 * which several of these files have *inside* the band.
 */
import sharp from 'sharp'

/**
 * A line whose 99th percentile brightness is at or below `DETECT_LEVEL` is
 * treated as band while scanning in from an edge.
 *
 * The *percentile* rather than the max because the bands are not clean black:
 * they carry the generator's dithering plus stray lit pixels (and in one file a
 * bright artefact line along the very bottom edge), and a max-based test reads
 * those as art and stops the scan inside the band. The *level* at 24/255 because
 * band noise is not uniform across a set — most bands sit under 13, but
 * `pathofexile2`'s drifts up to 23 towards the bottom edge, and a threshold that
 * splits per-file is a threshold that ships a stripe in one of them. Trimming a
 * genuinely near-black *art* line by the same rule costs nothing: it is black on
 * screen either way, and the crop window is taken from whatever is left.
 *
 * `ASSERT_LEVEL` is the strict "this is a baked band" level used only by the
 * post-crop check in the callers. Separating the two keeps that check honest: at
 * the detection level it would flag the dark bottom of a legitimately dark image.
 */
const DETECT_LEVEL = 24
export const ASSERT_LEVEL = 16
const PERCENTILE = 0.99
/**
 * Content runs shorter than this are noise inside a band, not the start of the
 * art. Guards the scan against the stray bright line mentioned above.
 */
const MIN_CONTENT_RUN = 8
/** Never trim more than this share of a side — a floor under a very dark image. */
const MAX_TRIM_RATIO = 0.4

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

/**
 * The art rectangle inside an image that has baked letterbox/pillarbox bands.
 * Returns the box plus the source size and the raw profiles, so a caller can run
 * its own post-crop edge assertion without a second decode.
 */
export async function detectArtBox(input) {
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

/**
 * Largest window of `aspect` inside the art box.
 *
 * `bias` is the share of the leftover height taken off the top (0.5 centres it);
 * the prompts put the subject above the middle and keep the bottom edge dark,
 * which is where the scrim and the copy go, so both callers pass less than 0.5.
 */
export function frameAspect(box, aspect, bias = 0.5) {
  if (box.width / box.height > aspect) {
    const width = Math.round(box.height * aspect)
    return {
      left: box.left + Math.round((box.width - width) / 2),
      top: box.top,
      width,
      height: box.height,
    }
  }
  const height = Math.round(box.width / aspect)
  return {
    left: box.left,
    top: box.top + Math.round((box.height - height) * bias),
    width: box.width,
    height,
  }
}

/**
 * `true` when the crop kept a band line on one of the four shipped edges — the
 * assertion that turns "looks right" into "verified". Returns the four edge
 * readings so the caller can name them in a warning.
 */
export function edgeReadings(box, window) {
  return [
    box.rows[window.top],
    box.rows[window.top + window.height - 1],
    box.cols[window.left],
    box.cols[window.left + window.width - 1],
  ]
}
