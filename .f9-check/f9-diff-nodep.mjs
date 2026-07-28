/**
 * Same report as `f9-diff.mjs`, but with **zero dependencies** so it can run in
 * the browser sandbox, which is where the screenshots actually land.
 *
 * Why this file exists at all: `agent-browser` runs in a different sandbox from
 * the project, so `/tmp/agent-browser/*.png` is not reachable from the tree that
 * has `sharp` installed, and the PNGs are far too large to shuttle through
 * command output as base64. Node's built-in `zlib` is enough to decode what
 * Chrome writes (8-bit, non-interlaced, colour type 2 or 6), so the diff moves
 * to the images instead of the images moving to the diff.
 *
 *   node f9-diff-nodep.mjs before.png after.png
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'

/** Minimal RGB PNG writer, so the diff map can be looked at instead of guessed. */
function encode(path, width, height, rgb) {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 6 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

function decode(path) {
  const buf = readFileSync(path)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path}: not a PNG`)
  let off = 8
  let width = 0
  let height = 0
  let depth = 0
  let color = 0
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]
      color = data[9]
      if (depth !== 8 || (color !== 2 && color !== 6)) {
        throw new Error(`${path}: unsupported PNG (depth ${depth}, colour ${color})`)
      }
      if (data[12] !== 0) throw new Error(`${path}: interlaced PNG unsupported`)
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    off += 12 + len
  }
  const bpp = color === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]
    const row = raw.subarray(p, p + stride)
    p += stride
    const cur = out.subarray(y * stride, y * stride + stride)
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      let v = row[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const pp = a + b - c
        const pa = Math.abs(pp - a)
        const pb = Math.abs(pp - b)
        const pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = v & 0xff
    }
  }
  return { width, height, bpp, data: out }
}

const [pa, pb, thresholdArg] = process.argv.slice(2)
// Pixels whose max channel delta is at or below this are reported separately:
// a 1–2 LSB drift is Chrome's own compositing, not a design change.
const threshold = thresholdArg ? Number(thresholdArg) : 2
const A = decode(pa)
const B = decode(pb)
if (A.width !== B.width || A.height !== B.height) {
  console.log(`SIZE MISMATCH ${A.width}x${A.height} vs ${B.width}x${B.height}`)
  process.exit(2)
}

const { width, height } = A
const rows = new Uint32Array(height)
const cols = new Uint32Array(width)
let diff = 0
let over = 0
let maxDelta = 0
let minX = width
let maxX = -1
let minY = height
let maxY = -1
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const ia = (y * width + x) * A.bpp
    const ib = (y * width + x) * B.bpp
    const d = Math.max(
      Math.abs(A.data[ia] - B.data[ib]),
      Math.abs(A.data[ia + 1] - B.data[ib + 1]),
      Math.abs(A.data[ia + 2] - B.data[ib + 2]),
    )
    if (d > 0) {
      diff++
      if (d > maxDelta) maxDelta = d
      if (d > threshold) {
        over++
        rows[y]++
        cols[x]++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
}

const total = width * height
const pct = (n) => ((n / total) * 100).toFixed(4)
console.log(`${pa.split('/').pop()} vs ${pb.split('/').pop()}  ${width}x${height}`)
console.log(`  any delta:   ${diff} px (${pct(diff)} %), max channel delta ${maxDelta}`)
console.log(`  delta > ${threshold}:   ${over} px (${pct(over)} %)`)
if (over) {
  console.log(`  bounding box: x ${minX}..${maxX}, y ${minY}..${maxY}`)
  const bands = []
  let start = -1
  for (let y = 0; y <= height; y++) {
    const hit = y < height && rows[y] > 0
    if (hit && start < 0) start = y
    if (!hit && start >= 0) {
      let px = 0
      for (let i = start; i < y; i++) px += rows[i]
      bands.push(`y ${start}..${y - 1} (${px} px)`)
      start = -1
    }
  }
  console.log(`  bands (${bands.length}): ${bands.slice(0, 24).join(', ')}`)
  const strips = []
  let s2 = -1
  for (let x = 0; x <= width; x++) {
    const hit = x < width && cols[x] > 0
    if (hit && s2 < 0) s2 = x
    if (!hit && s2 >= 0) {
      strips.push(`x ${s2}..${x - 1}`)
      s2 = -1
    }
  }
  console.log(`  strips (${strips.length}): ${strips.slice(0, 24).join(', ')}`)

  // A map is written whenever anything exceeds the threshold: "12 px differ"
  // is not evidence, a picture of *which* 12 px is. Changed pixels are drawn
  // red over a dimmed copy of A so the location stays readable.
  const map = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ia = (y * width + x) * A.bpp
      const im = (y * width + x) * 3
      const d = Math.max(
        Math.abs(A.data[ia] - B.data[(y * width + x) * B.bpp]),
        Math.abs(A.data[ia + 1] - B.data[(y * width + x) * B.bpp + 1]),
        Math.abs(A.data[ia + 2] - B.data[(y * width + x) * B.bpp + 2]),
      )
      if (d > threshold) {
        map[im] = 255
        map[im + 1] = 0
        map[im + 2] = 0
      } else {
        map[im] = A.data[ia] >> 2
        map[im + 1] = A.data[ia + 1] >> 2
        map[im + 2] = A.data[ia + 2] >> 2
      }
    }
  }
  const mapPath = pb.replace(/\.png$/, '') + '.diffmap.png'
  encode(mapPath, width, height, map)
  console.log(`  map: ${mapPath}`)

  /* Chrome's fs is not this sandbox's fs, so the map PNG above cannot be
   * opened for review here — print the same information as text. Each cell is
   * one 40x40 block of the frame; the digit is log-scaled hit density, so a
   * single moved element reads as a shape rather than as a percentage. */
  const cell = 40
  const gw = Math.ceil(width / cell)
  const gh = Math.ceil(height / cell)
  const grid = new Uint32Array(gw * gh)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ia = (y * width + x) * A.bpp
      const ib = (y * width + x) * B.bpp
      const d = Math.max(
        Math.abs(A.data[ia] - B.data[ib]),
        Math.abs(A.data[ia + 1] - B.data[ib + 1]),
        Math.abs(A.data[ia + 2] - B.data[ib + 2]),
      )
      if (d > threshold) grid[Math.floor(y / cell) * gw + Math.floor(x / cell)]++
    }
  }
  const ramp = ' .:-=+*#%@'
  console.log(`  grid (${cell}px cells, ' '=0 .. '@'=full):`)
  for (let gy = 0; gy < gh; gy++) {
    let line = ''
    for (let gx = 0; gx < gw; gx++) {
      const v = grid[gy * gw + gx]
      line += v === 0 ? ' ' : ramp[Math.min(9, 1 + Math.floor(Math.log2(v)))]
    }
    console.log(`    ${String(gy * cell).padStart(4)} |${line}|`)
  }
}
