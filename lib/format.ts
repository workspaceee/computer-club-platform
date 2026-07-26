export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

export function formatCoins(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Single source of truth for money output (F1.18).
 *
 * Every price, balance and debt in the product is EUR with two decimals and a
 * leading symbol. `en-IE` gives "€12.50" — euro symbol first, dot decimal —
 * which matches the tactical/monospace look of the launcher better than the
 * locale-specific "12,50 €" form.
 */
export function formatEUR(
  amount: number,
  { decimals = 2, symbol = true }: { decimals?: number; symbol?: boolean } = {},
): string {
  const abs = Math.abs(amount)
  return new Intl.NumberFormat('en-IE', {
    style: symbol ? 'currency' : 'decimal',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs)
}
