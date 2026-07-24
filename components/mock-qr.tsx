// Decorative mock QR code (deterministic pattern, not a real code).
const CELLS = 21

function seeded(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return x - Math.floor(x) > 0.5
}

export function MockQr({ size = 180 }: { size?: number }) {
  const cell = size / CELLS
  const squares: { x: number; y: number }[] = []
  for (let r = 0; r < CELLS; r++) {
    for (let c = 0; c < CELLS; c++) {
      if (seeded(r * CELLS + c)) squares.push({ x: c, y: r })
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-2">
      {squares.map((s, i) => (
        <rect key={i} x={s.x * cell} y={s.y * cell} width={cell} height={cell} fill="#0f0f10" />
      ))}
      {finder(0, 0)}
      {finder(CELLS - 7, 0)}
      {finder(0, CELLS - 7)}
    </svg>
  )
}
