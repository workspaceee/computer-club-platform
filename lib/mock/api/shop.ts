// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/shop/*`, `/api/orders/*`, `/api/tab/*` and `/api/wallet/*`. Everything
// money touches lives here, and every rule the real backend will own is enforced
// here too:
//
//  * prices are read from the store, never sent by the client — the cart posts
//    `{ productId, qty }` and the server prices it (`quoteCart`);
//  * balances are checked before a write, so `insufficientFunds`, `outOfStock`
//    and `creditLimit` are real server errors the UI must render;
//  * every money movement writes a `Transaction`, so the wallet history is a
//    ledger rather than a number the UI decremented.
import { mutate, newId, query, required, ApiError } from '@/lib/mock/api/client'
import { db, getOpenTab, getPlayer, getProduct, getTransactions } from '@/lib/mock/db'
import type { Product, ProductCategory, ShopEntry } from '@/lib/types/catalog'
import type { Cents, ID } from '@/lib/types/common'
import type { Order, OrderItem, OrderPaymentMethod, OrderStatus } from '@/lib/types/order'
import type { Pass, PassPurchase } from '@/lib/types/pass'
import type { Tab, TabItem, Transaction } from '@/lib/types/tab'
import type { Wallet } from '@/lib/types/user'

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

/** Same summary the counter menu prints, so passes read the same everywhere. */
function describePass(pass: Pass): string {
  const parts: string[] = []
  if (pass.timeWindow) {
    parts.push(
      `${pass.timeWindow.from} – ${pass.timeWindow.to}${pass.unlimitedInWindow ? ' unlimited' : ''}`,
    )
  }
  if (pass.bonusMinutes > 0) parts.push(`+${pass.bonusMinutes} min bonus`)
  if (pass.zoneScope.length > 0) parts.push(`${pass.zoneScope.join(', ').toUpperCase()} zone only`)
  if (pass.validDays.length > 0) parts.push('Weekends only')
  if (parts.length === 0) parts.push('Any zone, any time')
  return parts.join(' · ')
}

export interface ProductQuery {
  category?: ProductCategory | 'all'
  search?: string
  /** Hide anything the counter has run out of. */
  inStockOnly?: boolean
}

/** `GET /api/shop/products` — the bar menu, filtered server-side. */
export function fetchProducts(params: ProductQuery = {}): Promise<Product[]> {
  return query('shop.fetchProducts', () => {
    const { category = 'all', search = '', inStockOnly = false } = params
    const needle = search.trim().toLowerCase()
    return db.products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false
      if (inStockOnly && !product.inStock) return false
      if (needle && !product.name.toLowerCase().includes(needle)) return false
      return true
    })
  })
}

/** `GET /api/shop/products/:id` */
export function fetchProduct(productId: ID): Promise<Product> {
  return query('shop.fetchProduct', () => required(getProduct(productId)))
}

/**
 * `GET /api/shop/items` — bar, kitchen and merch.
 *
 * Returns the catalogue rows as they are. The grid used to be handed a stripped
 * copy that dropped `image`, so the product photography was unreachable from the
 * UI no matter what the shop screen tried to render (F7.2).
 */
export function fetchShopItems(): Promise<Product[]> {
  return query('shop.fetchShopItems', () =>
    db.products.filter((p) => p.category !== 'membership' && p.category !== 'time'),
  )
}

/**
 * `GET /api/shop/time` — time passes on sale to this member.
 *
 * A pass is not a `Product` (no stock, no shelf), so it is presented as the
 * narrower `ShopEntry` the grid actually consumes rather than being faked into
 * the product shape with invented stock numbers.
 */
export function fetchShopTime(): Promise<ShopEntry[]> {
  return query('shop.fetchShopTime', () =>
    db.passes
      .filter((p) => p.active && p.visibleTo === 'everyone')
      .map((pass) => ({
        id: pass.id,
        name: pass.name,
        category: 'time' as const,
        priceCents: pass.priceCents,
        tag: pass.id === 'pass-5h' ? 'Popular' : undefined,
        description: describePass(pass),
        /**
         * What the closing notice is decided from (C2.11).
         *
         * Derived here, from the pass row, rather than in the grid: whether a
         * pass is *meant* to span the club's edge is a property of the product,
         * and a UI that inferred it from `id === 'pass-night'` would start
         * lying the day an admin adds a second night pass.
         */
        time: {
          minutes: pass.hours * 60 + pass.bonusMinutes,
          crossesClosing: pass.timeWindow !== null || pass.unlimitedInWindow,
        },
        // A pass is always purchasable while it is active; there is nothing to
        // run out of.
        inStock: true,
        image: '',
      })),
  )
}

/** `GET /api/shop/memberships` */
export function fetchShopMemberships(): Promise<Product[]> {
  return query('shop.fetchShopMemberships', () =>
    db.products
      .filter((p) => p.category === 'membership')
      // The tab header already says "Memberships"; repeating it in every tier
      // name just makes three cards read "… Membership".
      .map((product) => ({ ...product, name: product.name.replace(' Membership', '') })),
  )
}

/** `GET /api/shop/passes` — the full pass definitions, for the buy-time sheet. */
export function fetchPasses(): Promise<Pass[]> {
  return query('shop.fetchPasses', () => db.passes.filter((p) => p.active))
}

/* ------------------------------------------------------------------ *
 * Cart pricing
 * ------------------------------------------------------------------ */

/** What the client is allowed to send: ids and quantities, never prices. */
export interface CartLine {
  productId: ID
  qty: number
}

export interface QuoteLine extends CartLine {
  name: string
  /** Unit price as the server sees it right now. */
  priceCents: Cents
  lineTotalCents: Cents
  /** `true` when stock cannot cover `qty` — the UI disables checkout on it. */
  unavailable: boolean
}

export interface CartQuote {
  lines: QuoteLine[]
  subtotalCents: Cents
  totalCents: Cents
  /** Payment methods this basket may actually use, given balance and settings. */
  allowedMethods: OrderPaymentMethod[]
  quotedAt: string
}

function priceCart(lines: CartLine[], userId: ID | null): CartQuote {
  const quoted: QuoteLine[] = lines.map((line) => {
    const product = required(getProduct(line.productId))
    const qty = Math.max(1, Math.floor(line.qty))
    return {
      productId: product.id,
      qty,
      name: product.name,
      priceCents: product.priceCents,
      lineTotalCents: product.priceCents * qty,
      unavailable: !product.inStock || product.stock < qty,
    }
  })

  const subtotalCents = quoted.reduce((sum, line) => sum + line.lineTotalCents, 0)
  const wallet = userId ? getPlayer(userId)?.wallet : undefined
  const settings = db.clubSettings

  const allowedMethods: OrderPaymentMethod[] = ['cash']
  if (wallet && wallet.moneyCents >= subtotalCents) allowedMethods.unshift('wallet')
  if (userId && settings.barOrdersEnabled && tabHeadroom(userId) >= subtotalCents) {
    allowedMethods.push('tab')
  }
  if (settings.cardPaymentsEnabled) allowedMethods.push('card')

  return { lines: quoted, subtotalCents, totalCents: subtotalCents, allowedMethods, quotedAt: db.now }
}

/**
 * Credit left before the member hits the club's tab limit. Only the signed-in
 * member has a tab in the mock, so anyone else gets the full limit.
 */
function tabHeadroom(userId: ID): Cents {
  const owed = userId === db.currentUserId ? (getOpenTab(db.currentSessionId)?.totalCents ?? 0) : 0
  return Math.max(0, db.clubSettings.creditLimitCents - owed)
}

/**
 * `POST /api/shop/quote`. The single source of prices: the UI renders this
 * response instead of summing the cart itself, which is what stops the client
 * and the server ever disagreeing about a total.
 */
export function quoteCart(lines: CartLine[], userId: ID | null = db.currentUserId): Promise<CartQuote> {
  return query('shop.quoteCart', () => priceCart(lines, userId))
}

/* ------------------------------------------------------------------ *
 * Wallet & ledger
 * ------------------------------------------------------------------ */

function recordTransaction(entry: Omit<Transaction, 'id' | 'currency' | 'createdAt'>): Transaction {
  const transaction: Transaction = {
    id: newId('tx'),
    currency: db.club.currency,
    createdAt: db.now,
    ...entry,
  }
  db.transactions.push(transaction)
  return transaction
}

/** `GET /api/wallet/transactions` — newest first, the ledger the UI lists. */
export function fetchTransactions(userId: ID = db.currentUserId): Promise<Transaction[]> {
  return query('shop.fetchTransactions', () => getTransactions(userId))
}

export interface TopUpPayload {
  amountCents: Cents
  method: Extract<OrderPaymentMethod, 'cash' | 'card'>
}

/** `POST /api/wallet/topup` — counter or card top-up. */
export function topUpWallet(
  payload: TopUpPayload,
  userId: ID = db.currentUserId,
): Promise<Wallet> {
  return mutate('shop.topUpWallet', () => {
    if (payload.amountCents <= 0) {
      throw new ApiError('validation', { amountCents: 'validation' })
    }
    if (payload.method === 'card' && !db.clubSettings.cardPaymentsEnabled) {
      throw new ApiError('forbidden')
    }

    const player = required(getPlayer(userId))
    player.wallet.moneyCents += payload.amountCents
    recordTransaction({
      userId,
      type: 'topup',
      amount: payload.amountCents,
      refType: 'topup',
      refId: null,
      staffId: payload.method === 'cash' ? 'staff-1' : null,
    })
    return player.wallet
  })
}

/* ------------------------------------------------------------------ *
 * Tab
 * ------------------------------------------------------------------ */

/** `GET /api/tab` — the open tab for a session, or `null` when nothing is owed. */
export function fetchTab(sessionId: ID = db.currentSessionId): Promise<Tab | null> {
  return query('shop.fetchTab', () => getOpenTab(sessionId) ?? null)
}

function appendTabItem(tab: Tab, item: Omit<TabItem, 'id' | 'tabId'>): TabItem {
  const line: TabItem = { id: newId('tab-item'), tabId: tab.id, ...item }
  tab.items.push(line)
  tab.totalCents += line.priceCents * line.qty
  return line
}

function openTabFor(sessionId: ID): Tab {
  const existing = getOpenTab(sessionId)
  if (existing) return existing
  const tab: Tab = {
    id: newId('tab'),
    sessionId,
    status: 'open',
    totalCents: 0,
    items: [],
    settledBy: null,
    settledAt: null,
  }
  db.tabs.push(tab)
  return tab
}

export interface SettleTabResult {
  tab: Tab
  wallet: Wallet
}

/**
 * `POST /api/tab/:id/settle`. Wallet settlement is refused when the balance is
 * short, because a tab that half-settles is worse than one that stays open.
 */
export function settleTab(
  method: Extract<OrderPaymentMethod, 'wallet' | 'cash' | 'card'> = 'wallet',
  sessionId: ID = db.currentSessionId,
): Promise<SettleTabResult> {
  return mutate('shop.settleTab', () => {
    const tab = required(getOpenTab(sessionId))
    const player = required(getPlayer(db.currentUserId))

    if (method === 'wallet' && player.wallet.moneyCents < tab.totalCents) {
      throw new ApiError('insufficientFunds')
    }
    if (method === 'wallet') player.wallet.moneyCents -= tab.totalCents

    tab.status = 'settled'
    tab.settledAt = db.now
    tab.settledBy = method === 'wallet' ? db.currentUserId : 'staff-1'

    recordTransaction({
      userId: db.currentUserId,
      type: 'tab_settle',
      amount: -tab.totalCents,
      refType: 'tab',
      refId: tab.id,
      staffId: method === 'wallet' ? null : 'staff-1',
    })

    return { tab, wallet: player.wallet }
  })
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

/** ETA the kitchen quotes: a flat base plus a minute per extra item. */
function estimateEta(lines: QuoteLine[]): number {
  const units = lines.reduce((sum, line) => sum + line.qty, 0)
  return 4 + Math.max(0, units - 1)
}

export interface CreateOrderPayload {
  lines: CartLine[]
  paymentMethod: OrderPaymentMethod
  sessionId?: ID
  machineId?: ID
}

export interface CreateOrderResult {
  order: Order
  wallet: Wallet | null
  tab: Tab | null
}

/**
 * `POST /api/orders`. Prices the basket again at write time — a quote is a
 * quote, not a promise — then charges, decrements stock and creates the order.
 */
export function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  return mutate('shop.createOrder', () => {
    if (payload.lines.length === 0) throw new ApiError('validation')
    if (!db.clubSettings.barOrdersEnabled) throw new ApiError('forbidden')

    const sessionId = payload.sessionId ?? db.currentSessionId
    const machineId = payload.machineId ?? db.currentMachineId
    const userId = db.currentUserId
    const quote = priceCart(payload.lines, userId)

    if (quote.lines.some((line) => line.unavailable)) throw new ApiError('outOfStock')
    if (!quote.allowedMethods.includes(payload.paymentMethod)) {
      throw new ApiError(payload.paymentMethod === 'tab' ? 'creditLimit' : 'insufficientFunds')
    }

    const player = required(getPlayer(userId))
    const orderId = newId('ord')
    const items: OrderItem[] = quote.lines.map((line) => ({
      orderId,
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      priceSnapshotCents: line.priceCents,
    }))

    // Stock comes off the shelf as the order is accepted, not when it is served.
    for (const line of quote.lines) {
      const product = required(getProduct(line.productId))
      product.stock = Math.max(0, product.stock - line.qty)
      product.inStock = product.stock > 0
    }

    let tab: Tab | null = null
    if (payload.paymentMethod === 'wallet') {
      player.wallet.moneyCents -= quote.totalCents
      recordTransaction({
        userId,
        type: 'spend_money',
        amount: -quote.totalCents,
        refType: 'order',
        refId: orderId,
        staffId: null,
      })
    } else if (payload.paymentMethod === 'tab') {
      tab = openTabFor(sessionId)
      for (const line of items) {
        appendTabItem(tab, {
          kind: 'product',
          refId: line.productId,
          label: line.name,
          qty: line.qty,
          priceCents: line.priceSnapshotCents,
        })
      }
      recordTransaction({
        userId,
        type: 'debt',
        amount: quote.totalCents,
        refType: 'order',
        refId: orderId,
        staffId: null,
      })
    }

    const order: Order = {
      id: orderId,
      userId,
      guestId: null,
      sessionId,
      machineId,
      items,
      totalCents: quote.totalCents,
      paymentMethod: payload.paymentMethod,
      status: 'new',
      createdAt: db.now,
      etaMinutes: estimateEta(quote.lines),
    }
    db.orders.unshift(order)

    db.activity.unshift({
      id: newId('act'),
      type: 'purchase',
      label: items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(', '),
      time: 'Just now',
    })

    return { order, wallet: player.wallet, tab }
  })
}

/** `GET /api/orders` — this member's orders, newest first. */
export function fetchOrders(userId: ID = db.currentUserId): Promise<Order[]> {
  return query('shop.fetchOrders', () =>
    db.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  )
}

/** `GET /api/orders/active` — the runner's queue, for the status strip. */
export function fetchActiveOrders(userId: ID = db.currentUserId): Promise<Order[]> {
  const live: OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering']
  return query('shop.fetchActiveOrders', () =>
    db.orders.filter((o) => o.userId === userId && live.includes(o.status)),
  )
}

/** `GET /api/orders/:id` */
export function fetchOrder(orderId: ID): Promise<Order> {
  return query('shop.fetchOrder', () => required(db.orders.find((o) => o.id === orderId)))
}

/**
 * `POST /api/orders/:id/cancel`. Only before the kitchen starts: once it is
 * `preparing` the food exists, so the answer is `conflict`, not a refund.
 */
export function cancelOrder(orderId: ID): Promise<Order> {
  return mutate('shop.cancelOrder', () => {
    const order = required(db.orders.find((o) => o.id === orderId))
    if (order.status !== 'new' && order.status !== 'accepted') throw new ApiError('conflict')

    order.status = 'cancelled'
    order.etaMinutes = null

    for (const item of order.items) {
      const product = getProduct(item.productId)
      if (!product) continue
      product.stock += item.qty
      product.inStock = true
    }

    if (order.paymentMethod === 'wallet' && order.userId) {
      const player = getPlayer(order.userId)
      if (player) player.wallet.moneyCents += order.totalCents
      recordTransaction({
        userId: order.userId,
        type: 'topup',
        amount: order.totalCents,
        refType: 'order',
        refId: order.id,
        staffId: null,
        note: 'refund',
      })
    }

    if (order.paymentMethod === 'tab') {
      const tab = getOpenTab(order.sessionId)
      if (tab) {
        const removed = tab.items.filter(
          (item) => item.kind === 'product' && order.items.some((i) => i.productId === item.refId),
        )
        for (const item of removed) {
          tab.totalCents -= item.priceCents * item.qty
          tab.items.splice(tab.items.indexOf(item), 1)
        }
        tab.totalCents = Math.max(0, tab.totalCents)
      }
    }

    return order
  })
}

/* ------------------------------------------------------------------ *
 * Passes
 * ------------------------------------------------------------------ */

export interface PurchasePassPayload {
  passId: ID
  method: Extract<OrderPaymentMethod, 'wallet' | 'tab' | 'cash' | 'card'>
}

export interface PurchasePassResult {
  purchase: PassPurchase
  wallet: Wallet
  tab: Tab | null
  /** Total minutes banked after the purchase — the value the timer reads. */
  minutesBanked: number
}

/**
 * `POST /api/shop/passes/:id/buy`. Minutes are granted by the server
 * (`hours × 60 + bonusMinutes`) so the client never computes entitlement.
 */
export function purchasePass(payload: PurchasePassPayload): Promise<PurchasePassResult> {
  return mutate('shop.purchasePass', () => {
    const pass = required(db.passes.find((p) => p.id === payload.passId && p.active))
    const userId = db.currentUserId
    const player = required(getPlayer(userId))

    if (payload.method === 'wallet' && player.wallet.moneyCents < pass.priceCents) {
      throw new ApiError('insufficientFunds')
    }
    if (payload.method === 'tab' && tabHeadroom(userId) < pass.priceCents) {
      throw new ApiError('creditLimit')
    }
    if (payload.method === 'card' && !db.clubSettings.cardPaymentsEnabled) {
      throw new ApiError('forbidden')
    }

    const minutesTotal = pass.hours * 60 + pass.bonusMinutes
    const purchase: PassPurchase = {
      id: newId('pp'),
      userId,
      passId: pass.id,
      minutesTotal,
      minutesLeft: minutesTotal,
      expiresAt: null,
      paidVia: payload.method === 'tab' ? 'staff' : payload.method,
      staffId: payload.method === 'wallet' || payload.method === 'card' ? null : 'staff-1',
      createdAt: db.now,
    }
    db.passPurchases.push(purchase)

    let tab: Tab | null = null
    if (payload.method === 'wallet') {
      player.wallet.moneyCents -= pass.priceCents
      recordTransaction({
        userId,
        type: 'spend_money',
        amount: -pass.priceCents,
        refType: 'pass',
        refId: pass.id,
        staffId: null,
      })
    } else if (payload.method === 'tab') {
      tab = openTabFor(db.currentSessionId)
      appendTabItem(tab, {
        kind: 'pass',
        refId: pass.id,
        label: pass.name,
        qty: 1,
        priceCents: pass.priceCents,
      })
      recordTransaction({
        userId,
        type: 'debt',
        amount: pass.priceCents,
        refType: 'pass',
        refId: pass.id,
        staffId: null,
      })
    }

    recordTransaction({
      userId,
      type: 'time_grant',
      amount: minutesTotal,
      refType: 'pass',
      refId: purchase.id,
      staffId: purchase.staffId,
    })

    if (pass.coinsReward > 0) {
      player.wallet.coins += pass.coinsReward
      recordTransaction({
        userId,
        type: 'earn_coins',
        amount: pass.coinsReward,
        refType: 'pass',
        refId: purchase.id,
        staffId: null,
      })
    }

    const minutesBanked = db.passPurchases
      .filter((p) => p.userId === userId)
      .reduce((sum, p) => sum + p.minutesLeft, 0)

    return { purchase, wallet: player.wallet, tab, minutesBanked }
  })
}

/* ------------------------------------------------------------------ *
 * Mixed checkout
 * ------------------------------------------------------------------ */

export interface CheckoutResult {
  totalCents: Cents
  /** Present only when the basket contained bar or merch items. */
  order: Order | null
  /** One purchase per time pass in the basket. */
  purchases: PassPurchase[]
  minutesBanked: number
  wallet: Wallet
  tab: Tab | null
}

/**
 * `POST /api/shop/checkout`. The shop cart mixes bar items with time passes, so
 * one call settles both: products become an `Order` for the runner, passes
 * become minutes on the clock. The total is computed here from stored prices —
 * the card form only shows what this returns.
 */
export function checkoutCart(
  lines: CartLine[],
  method: Extract<OrderPaymentMethod, 'wallet' | 'card' | 'cash' | 'tab'> = 'card',
  userId: ID = db.currentUserId,
): Promise<CheckoutResult> {
  return mutate('shop.checkoutCart', () => {
    if (lines.length === 0) throw new ApiError('validation')
    if (method === 'card' && !db.clubSettings.cardPaymentsEnabled) throw new ApiError('forbidden')

    const player = required(getPlayer(userId))
    const passLines = lines.filter((line) => db.passes.some((p) => p.id === line.productId))
    const productLines = lines.filter((line) => getProduct(line.productId) !== undefined)
    if (passLines.length + productLines.length !== lines.length) throw new ApiError('notFound')

    const quote = priceCart(productLines, userId)
    if (quote.lines.some((line) => line.unavailable)) throw new ApiError('outOfStock')

    const passItems = passLines.map((line) => {
      const pass = required(db.passes.find((p) => p.id === line.productId && p.active))
      return { pass, qty: Math.max(1, Math.floor(line.qty)) }
    })
    const passTotal = passItems.reduce((sum, item) => sum + item.pass.priceCents * item.qty, 0)
    const totalCents = quote.totalCents + passTotal

    if (method === 'wallet' && player.wallet.moneyCents < totalCents) {
      throw new ApiError('insufficientFunds')
    }
    if (method === 'tab' && tabHeadroom(userId) < totalCents) throw new ApiError('creditLimit')

    let tab: Tab | null = null
    if (method === 'wallet') {
      player.wallet.moneyCents -= totalCents
      recordTransaction({
        userId,
        type: 'spend_money',
        amount: -totalCents,
        refType: 'order',
        refId: null,
        staffId: null,
      })
    } else if (method === 'tab') {
      tab = openTabFor(db.currentSessionId)
    }

    // Passes: minutes are granted per unit, so buying two 3-hour passes banks
    // two entitlements rather than one double-length one.
    const purchases: PassPurchase[] = []
    for (const { pass, qty } of passItems) {
      for (let index = 0; index < qty; index += 1) {
        const minutesTotal = pass.hours * 60 + pass.bonusMinutes
        const purchase: PassPurchase = {
          id: newId('pp'),
          userId,
          passId: pass.id,
          minutesTotal,
          minutesLeft: minutesTotal,
          expiresAt: null,
          paidVia: method === 'tab' ? 'staff' : method,
          staffId: method === 'cash' || method === 'tab' ? 'staff-1' : null,
          createdAt: db.now,
        }
        db.passPurchases.push(purchase)
        purchases.push(purchase)

        recordTransaction({
          userId,
          type: 'time_grant',
          amount: minutesTotal,
          refType: 'pass',
          refId: purchase.id,
          staffId: purchase.staffId,
        })
        if (pass.coinsReward > 0) {
          player.wallet.coins += pass.coinsReward
          recordTransaction({
            userId,
            type: 'earn_coins',
            amount: pass.coinsReward,
            refType: 'pass',
            refId: purchase.id,
            staffId: null,
          })
        }
      }
      if (tab) {
        appendTabItem(tab, {
          kind: 'pass',
          refId: pass.id,
          label: pass.name,
          qty,
          priceCents: pass.priceCents,
        })
      }
    }

    let order: Order | null = null
    if (quote.lines.length > 0) {
      const orderId = newId('ord')
      const items: OrderItem[] = quote.lines.map((line) => ({
        orderId,
        productId: line.productId,
        name: line.name,
        qty: line.qty,
        priceSnapshotCents: line.priceCents,
      }))

      for (const line of quote.lines) {
        const product = required(getProduct(line.productId))
        product.stock = Math.max(0, product.stock - line.qty)
        product.inStock = product.stock > 0
        if (tab) {
          appendTabItem(tab, {
            kind: 'product',
            refId: product.id,
            label: product.name,
            qty: line.qty,
            priceCents: product.priceCents,
          })
        }
      }

      order = {
        id: orderId,
        userId,
        guestId: null,
        sessionId: db.currentSessionId,
        machineId: db.currentMachineId,
        items,
        totalCents: quote.totalCents,
        paymentMethod: method,
        status: 'new',
        createdAt: db.now,
        etaMinutes: estimateEta(quote.lines),
      }
      db.orders.unshift(order)
    }

    db.activity.unshift({
      id: newId('act'),
      type: 'purchase',
      label:
        purchases.length > 0 && order
          ? 'Bought time and bar items'
          : purchases.length > 0
            ? `Bought ${passItems.map((i) => i.pass.name).join(', ')}`
            : (order?.items.map((i) => i.name).join(', ') ?? 'Purchase'),
      time: 'Just now',
    })

    const minutesBanked = db.passPurchases
      .filter((p) => p.userId === userId)
      .reduce((sum, p) => sum + p.minutesLeft, 0)

    return { totalCents, order, purchases, minutesBanked, wallet: player.wallet, tab }
  })
}

/** `GET /api/shop/passes/mine` — owned passes, newest first. */
export function fetchPassPurchases(userId: ID = db.currentUserId): Promise<PassPurchase[]> {
  return query('shop.fetchPassPurchases', () =>
    db.passPurchases
      .filter((p) => p.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  )
}
