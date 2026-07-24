// Isolated mock data-access layer. Swap these implementations for real
// FastAPI + MongoDB calls later without touching any UI code.
import {
  ACHIEVEMENTS,
  ACTIVITY,
  DEMO_USER,
  GAMES,
  HOUSE_ACCOUNTS,
  LEADERBOARD,
  PRIZES,
  SHOP_ITEMS,
  SHOP_MEMBERSHIPS,
  SHOP_TIME,
  TOP_GAMES,
} from '@/lib/mock/data'
import type {
  Achievement,
  ActivityEvent,
  Game,
  HouseAccount,
  LeaderboardEntry,
  Prize,
  ShopItem,
  UserProfile,
} from '@/lib/types'

function delay<T>(value: T, min = 300, max = 800): Promise<T> {
  const ms = Math.floor(min + Math.random() * (max - min))
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function fetchGames(): Promise<Game[]> {
  return delay(GAMES)
}

export function fetchTopGames(): Promise<Game[]> {
  return delay(TOP_GAMES)
}

export function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return delay(LEADERBOARD, 200, 400)
}

export function fetchPrizes(): Promise<Prize[]> {
  return delay(PRIZES)
}

export function fetchHouseAccounts(): Promise<HouseAccount[]> {
  return delay(HOUSE_ACCOUNTS, 200, 500)
}

export function fetchShopTime(): Promise<ShopItem[]> {
  return delay(SHOP_TIME)
}

export function fetchShopMemberships(): Promise<ShopItem[]> {
  return delay(SHOP_MEMBERSHIPS)
}

export function fetchShopItems(): Promise<ShopItem[]> {
  return delay(SHOP_ITEMS)
}

export function fetchAchievements(): Promise<Achievement[]> {
  return delay(ACHIEVEMENTS)
}

export function fetchActivity(): Promise<ActivityEvent[]> {
  return delay(ACTIVITY)
}

export function fetchProfile(): Promise<UserProfile> {
  return delay(DEMO_USER, 200, 500)
}

export interface LoginPayload {
  identifier: string
  password: string
}

/** Any password except literal "fail" succeeds after a mock delay. */
export function login({ identifier, password }: LoginPayload): Promise<UserProfile> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (password.toLowerCase() === 'fail') {
        reject(new Error('Invalid credentials. Please try again.'))
        return
      }
      const nickname = identifier.includes('@')
        ? identifier.split('@')[0]
        : identifier || 'Player'
      resolve({ ...DEMO_USER, nickname, email: identifier })
    }, 2000)
  })
}

export function launchGame(): Promise<void> {
  return delay(undefined, 3000, 3000)
}

export function processPayment(): Promise<void> {
  return delay(undefined, 2000, 2000)
}
