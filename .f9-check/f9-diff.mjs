/**
 * Pixel diff for the F9 block check (temporary harness, deleted after the run).
 *   node .f9-check/f9-diff.mjs before.png after.png [out-diff.png]
 * Prints differing pixel count, share, max channel delta, bounding box and the
 * vertical bands where the difference lives.
 */
import sharp from 'sharp'

const [a, b, out] = process.argv.slice(2)
const load = async (p) => {
  const img = sharp(p)
  const { width, height } = await img.metadata()
  const data = await img.ensureAlpha().raw().toBuffer()
  return { width, height, data }
}

const A = await load(a)
const B = await load(b)
if (A.width !== B.width || A.height !== B.height) {
  console.log(`SIZE MISMATCH ${A.width}x${A.height} vs ${B.width}x${B.height}`)
  process.exit(2)
}

const { width, height } = A
let diff = 0
let maxDelta = 0
const rows = new Array(height).fill(0)
let minX = width
let maxX = -1
let minY = height
let maxY = -1
const mask = out ? Buffer.alloc(width * height * 3) : null

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    const d = Math.max(
      Math.abs(A.data[i] - B.data[i]),
      Math.abs(A.data[i + 1] - B.data[i + 1]),
      Math.abs(A.data[i + 2] - B.data[i + 2]),
    )
    if (d > 0) {
      diff++
      rows[y]++
      if (d > maxDelta) maxDelta = d
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (mask) {
      const o = (y * width + x) * 3
      if (d > 0) {
        mask[o] = 255
        mask[o + 1] = 0
        mask[o + 2] = 0
      } else {
        const g = Math.round(A.data[i] * 0.3 + A.data[i + 1] * 0.5 + A.data[i + 2] * 0.2)
        mask[o] = mask[o + 1] = mask[o + 2] = g
      }
    }
  }
}

const total = width * height
console.log(`${a.split('/').pop()} vs ${b.split('/').pop()}  ${width}x${height}`)
console.log(
  `  differing pixels: ${diff} / ${total} (${((diff / total) * 100).toFixed(4)} %), max channel delta ${maxDelta}`,
)
if (diff) {
  console.log(`  bounding box: x ${minX}..${maxX}, y ${minY}..${maxY}`)
  const bands = []
  let start = -1
  for (let y = 0; y <= height; y++) {
    const hit = y < height && rows[y] > 0
    if (hit && start < 0) start = y
    if (!hit && start >= 0) {
      const px = rows.slice(start, y).reduce((s, n) => s + n, 0)
      bands.push(`y ${start}..${y - 1} (${px} px)`)
      start = -1
    }
  }
  console.log(`  bands (${bands.length}): ${bands.join(', ')}`)
}
if (mask) {
  await sharp(mask, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(out)
  console.log(`  diff map: ${out}`)
}
