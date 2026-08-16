// Decorative mock QR code (deterministic pattern, not a real code).
//
// `payload` does not make it scannable — nothing here encodes anything. It only
// makes the pattern a *function of the challenge*, so "show a new code" visibly
// draws a different square (C1.5). Before this, refreshing an expired handshake
// redrew the exact same pixels and the screen looked frozen.
const CELLS = 21

/** Stable 32-bit hash of the payload — same string, same square, every render. */
function seedOf(payload: string): number {
  let hash = 2166136261
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash % 100000) + 1
}

function seeded(i: number, seed: number) {
  const x = Math.sin((i + seed) * 12.9898) * 43758.5453
  return x - Math.floor(x) > 0.5
}

export function MockQr({ size = 180, payload = '' }: { size?: number; payload?: string }) {
  const cell = size / CELLS
  const seed = seedOf(payload)
  const squares: { x: number; y: number }[] = []
  for (let r = 0; r < CELLS; r++) {
    for (let c = 0; c < CELLS; c++) {
      if (seeded(r * CELLS + c, seed)) squares.push({ x: c, y: r })
    }
  }

  const finder = (ox: number, oy: number) => (
    <>
      <rect x={ox * cell} y={oy * cell} width={cell * 7} height={cell * 7} fill="#0f0f10" />
      <rect x={(ox + 1) * cell} y={(oy + 1) * cell} width={cell * 5} height={cell * 5} fill="#fff" />
      <rect x={(ox + 2) * cell} y={(oy + 2) * cell} width={cell * 3} height={cell * 3} fill="#0f0f10" />
    </>
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      // Decorative for a screen reader: the same handshake is on screen as the
      // typeable station code, which is the form a non-visual user can act on.
      aria-hidden
      className="rounded-lg bg-white p-2"
    >
      {squares.map((s, i) => (
        <rect key={i} x={s.x * cell} y={s.y * cell} width={cell} height={cell} fill="#0f0f10" />
      ))}
      {finder(0, 0)}
      {finder(CELLS - 7, 0)}
      {finder(0, CELLS - 7)}
    </svg>
  )
}
