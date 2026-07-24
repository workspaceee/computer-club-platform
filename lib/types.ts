export type GameCategory =
  | 'Shooter'
  | 'MOBA'
  | 'Battle Royale'
  | 'Sports'
  | 'Racing'
  | 'Strategy'
  | 'MMO'
  | 'RPG'

export interface Game {
  id: string
  name: string
  category: GameCategory
  rating: number
  players: number
  /** two tailwind color stops for the gradient cover */
  cover: [string, string]
  launcher: string
}

export interface LeaderboardEntry {
  rank: number
  nickname: string
  hours: number
  coins: number
  isCurrentUser?: boolean
}

export interface Prize {
  coins: number
  reward: string
  icon: string
}

export interface HouseAccount {
  id: string
  label: string
  status: 'available' | 'in-use'
  linkedUser?: string
}

export interface ShopItem {
  id: string
  name: string
  price: number
  tag?: string
  description?: string
}

export interface CartItem extends ShopItem {
  qty: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  condition: string
  icon: string
  unlocked: boolean
}

export interface ActivityEvent {
  id: string
  type: 'game' | 'purchase' | 'achievement'
  label: string
  time: string
}

export interface UserProfile {
  nickname: string
  email: string
  level: number
  xp: number
  xpMax: number
  coins: number
  memberSince: string
  totalHours: number
  gamesPlayed: number
  sessions: number
  achievementsUnlocked: number
  achievementsTotal: number
}
