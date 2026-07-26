import { db, getFriends, getLeaderboard, getMinutesBanked, getZoneOccupancy } from '@/lib/mock/db'

export async function GET() {
  const bad: string[] = []
  if (db.machines.length !== 40) bad.push('machines != 40')
  if (db.games.length < 60) bad.push('games < 60')
  if (new Set(db.games.map((g) => g.id)).size !== db.games.length) bad.push('dup game ids')
  if (new Set(db.products.map((p) => p.id)).size !== db.products.length) bad.push('dup product ids')
  for (const m of db.machines) if (!db.zones.some((z) => z.id === m.zoneId)) bad.push(`orphan zone ${m.id}`)
  for (const t of db.tabs) {
    const sum = t.items.reduce((s, i) => s + i.priceCents * i.qty, 0)
    if (sum !== t.totalCents) bad.push(`tab ${t.id} total ${t.totalCents} != ${sum}`)
  }
  for (const o of db.orders) {
    const sum = o.items.reduce((s, i) => s + i.priceSnapshotCents * i.qty, 0)
    if (sum !== o.totalCents) bad.push(`order ${o.id} total mismatch`)
    for (const i of o.items) if (!db.products.some((p) => p.id === i.productId)) bad.push(`orphan product ${i.productId}`)
  }
  for (const s of db.sessions) if (!db.machines.some((m) => m.id === s.machineId)) bad.push(`orphan machine ${s.id}`)
  for (const e of db.tournamentEntries) if (!db.tournaments.some((t) => t.id === e.tournamentId)) bad.push('orphan tournament')
  for (const t of db.tournaments) if (!db.games.some((g) => g.id === t.gameId)) bad.push(`orphan game ${t.gameId}`)
  for (const p of db.players.values()) if (!Number.isInteger(p.wallet.moneyCents)) bad.push(`float cents ${p.user.id}`)
  for (const p of db.products) if (!Number.isInteger(p.priceCents)) bad.push(`float price ${p.id}`)

  return Response.json({
    ok: bad.length === 0,
    bad,
    counts: {
      machines: db.machines.length,
      games: db.games.length,
      products: db.products.length,
      passes: db.passes.length,
      players: db.players.size,
      tiers: db.battlePassTiers.length,
      tournaments: db.tournaments.length,
      transactions: db.transactions.length,
    },
    occupancy: getZoneOccupancy(),
    top3: getLeaderboard().slice(0, 3),
    friends: getFriends().length,
    minutesBanked: getMinutesBanked(),
  })
}
