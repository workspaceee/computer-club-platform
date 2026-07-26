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

export const GAMES: Game[] = [
  { id: 'cs2', name: 'Counter-Strike 2', category: 'Shooter', rating: 4.8, players: 1234, cover: ['#f0a500', '#3a2c00'], launcher: 'Steam' },
  { id: 'valorant', name: 'Valorant', category: 'Shooter', rating: 4.7, players: 1102, cover: ['#ff4655', '#1f181b'], launcher: 'Riot' },
  { id: 'dota2', name: 'Dota 2', category: 'MOBA', rating: 4.6, players: 987, cover: ['#a72420', '#241110'], launcher: 'Steam' },
  { id: 'fortnite', name: 'Fortnite', category: 'Battle Royale', rating: 4.5, players: 1540, cover: ['#7b3ff2', '#181430'], launcher: 'Epic' },
  { id: 'lol', name: 'League of Legends', category: 'MOBA', rating: 4.6, players: 1320, cover: ['#0596aa', '#031a24'], launcher: 'Riot' },
  { id: 'apex', name: 'Apex Legends', category: 'Battle Royale', rating: 4.5, players: 876, cover: ['#da292a', '#241012'], launcher: 'EA App' },
  { id: 'pubg', name: 'PUBG: Battlegrounds', category: 'Battle Royale', rating: 4.2, players: 654, cover: ['#f2a900', '#2b1f00'], launcher: 'Steam' },
  { id: 'ow2', name: 'Overwatch 2', category: 'Shooter', rating: 4.3, players: 720, cover: ['#f99e1a', '#241705'], launcher: 'Battle.net' },
  { id: 'rocket', name: 'Rocket League', category: 'Sports', rating: 4.6, players: 610, cover: ['#1f8fff', '#04182b'], launcher: 'Epic' },
  { id: 'gtav', name: 'Grand Theft Auto V', category: 'RPG', rating: 4.7, players: 990, cover: ['#6cbf3f', '#0f1f0a'], launcher: 'Rockstar' },
  { id: 'minecraft', name: 'Minecraft', category: 'RPG', rating: 4.8, players: 1180, cover: ['#5aa03c', '#12210c'], launcher: 'Mojang' },
  { id: 'rust', name: 'Rust', category: 'RPG', rating: 4.1, players: 430, cover: ['#ce422b', '#241009'], launcher: 'Steam' },
  { id: 'tarkov', name: 'Escape from Tarkov', category: 'Shooter', rating: 4.4, players: 380, cover: ['#8a8f5c', '#1c1d12'], launcher: 'BSG' },
  { id: 'warthunder', name: 'War Thunder', category: 'Strategy', rating: 4.2, players: 340, cover: ['#4a6a2f', '#101709'], launcher: 'Gaijin' },
  { id: 'wot', name: 'World of Tanks', category: 'Strategy', rating: 4.0, players: 300, cover: ['#a07d3e', '#211a0d'], launcher: 'Wargaming' },
  { id: 'fifa25', name: 'EA Sports FC 25', category: 'Sports', rating: 4.3, players: 560, cover: ['#00b140', '#04220f'], launcher: 'EA App' },
  { id: 'warzone', name: 'Call of Duty: Warzone', category: 'Battle Royale', rating: 4.4, players: 810, cover: ['#f2a900', '#241a00'], launcher: 'Battle.net' },
  { id: 'r6', name: 'Rainbow Six Siege', category: 'Shooter', rating: 4.5, players: 640, cover: ['#ff8c00', '#241500'], launcher: 'Ubisoft' },
  { id: 'dbd', name: 'Dead by Daylight', category: 'Strategy', rating: 4.2, players: 290, cover: ['#b3122a', '#210409'], launcher: 'Steam' },
  { id: 'bg3', name: "Baldur's Gate 3", category: 'RPG', rating: 4.9, players: 470, cover: ['#b8863b', '#211705'], launcher: 'Steam' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', category: 'RPG', rating: 4.6, players: 520, cover: ['#fcee0a', '#242200'], launcher: 'GOG' },
  { id: 'elden', name: 'Elden Ring', category: 'RPG', rating: 4.9, players: 610, cover: ['#c8a24a', '#211a0b'], launcher: 'Steam' },
  { id: 'hearthstone', name: 'Hearthstone', category: 'Strategy', rating: 4.1, players: 260, cover: ['#e08a2b', '#241405'], launcher: 'Battle.net' },
  { id: 'sc2', name: 'StarCraft II', category: 'Strategy', rating: 4.4, players: 240, cover: ['#2f7fd1', '#04182b'], launcher: 'Battle.net' },
]

export const TOP_GAMES: Game[] = [
  GAMES[0],
  GAMES[1],
  GAMES[3],
  GAMES[20],
  GAMES[22],
]

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, nickname: 'ProGamer97', hours: 42, coins: 9876 },
  { rank: 2, nickname: 'SkillMaster', hours: 39, coins: 8765 },
  { rank: 3, nickname: 'TacticalNinja', hours: 35, coins: 7654 },
  { rank: 4, nickname: 'NoScopeKing', hours: 31, coins: 6543 },
  { rank: 5, nickname: 'DemoPlayer', hours: 28, coins: 5432, isCurrentUser: true },
  { rank: 6, nickname: 'ClutchQueen', hours: 25, coins: 4890 },
  { rank: 7, nickname: 'AimBotAndy', hours: 22, coins: 4210 },
  { rank: 8, nickname: 'FragMachine', hours: 20, coins: 3980 },
  { rank: 9, nickname: 'RushBravo', hours: 18, coins: 3540 },
  { rank: 10, nickname: 'SilentWolf', hours: 16, coins: 3120 },
]

export const PRIZES: Prize[] = [
  { coins: 100, reward: 'Sticker Pack', icon: 'sticker' },
  { coins: 500, reward: 'Free Hour', icon: 'clock' },
  { coins: 1000, reward: 'IMBA T-Shirt', icon: 'shirt' },
  { coins: 5000, reward: 'Gaming Mouse', icon: 'mouse' },
]

export const HOUSE_ACCOUNTS: HouseAccount[] = [
  { id: 'house-1', label: 'House Account #1', status: 'available' },
  { id: 'house-2', label: 'House Account #2', status: 'in-use' },
  { id: 'personal', label: 'Personal Steam Account', status: 'available', linkedUser: 'demo_player_steam' },
]

export const SHOP_TIME: ShopItem[] = [
  { id: 'time-1h', name: '1 Hour', price: 3, description: 'Single session top-up' },
  { id: 'time-3h', name: '3 Hours', price: 8, description: 'Great for an afternoon' },
  { id: 'time-5h', name: '5 Hours', price: 12, tag: 'Popular', description: 'Best per-hour rate' },
  { id: 'time-night', name: 'Night Pass', price: 10, description: '22:00 – 08:00 unlimited' },
]

export const SHOP_MEMBERSHIPS: ShopItem[] = [
  { id: 'mem-bronze', name: 'Bronze', price: 15, description: '10% off gaming time' },
  { id: 'mem-silver', name: 'Silver', price: 25, description: '20% off + priority PCs' },
  { id: 'mem-gold', name: 'Gold', price: 40, tag: 'Best Value', description: '35% off + VIP zone + 2x coins' },
]

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'item-energy', name: 'Energy Drink', price: 3, description: 'Ice-cold boost' },
  { id: 'item-snack', name: 'Snack Combo', price: 5, description: 'Chips + chocolate' },
  { id: 'item-tshirt', name: 'IMBA T-Shirt', price: 22, description: 'Official club merch' },
  { id: 'item-mousepad', name: 'IMBA Mousepad', price: 18, description: 'XL cloth surface' },
  { id: 'item-cap', name: 'IMBA Cap', price: 16, description: 'Snapback, red logo' },
]

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: 'First Blood', description: 'Complete your first session', condition: 'Play 1 session', icon: 'zap', unlocked: true },
  { id: 'a2', name: 'Headshot King', description: 'Top a shooter leaderboard', condition: 'Rank #1 in a shooter', icon: 'target', unlocked: true },
  { id: 'a3', name: 'Marathon', description: 'Play 5 hours in one day', condition: '5h in a day', icon: 'flame', unlocked: true },
  { id: 'a4', name: 'Big Spender', description: 'Spend 5000 coins', condition: 'Spend 5000 coins', icon: 'coins', unlocked: true },
  { id: 'a5', name: 'Night Owl', description: 'Finish a night session', condition: 'Use a Night Pass', icon: 'moon', unlocked: true },
  { id: 'a6', name: 'Collector', description: 'Own 3 pieces of merch', condition: 'Buy 3 merch items', icon: 'shirt', unlocked: false },
  { id: 'a7', name: 'Legend', description: 'Reach level 25', condition: 'Hit level 25', icon: 'crown', unlocked: false },
  { id: 'a8', name: 'Streak', description: 'Visit 7 days in a row', condition: '7-day streak', icon: 'calendar', unlocked: false },
]

export const ACTIVITY: ActivityEvent[] = [
  { id: 'e1', type: 'game', label: 'Played Counter-Strike 2', time: '2 hours ago' },
  { id: 'e2', type: 'achievement', label: 'Unlocked "Headshot King"', time: '3 hours ago' },
  { id: 'e3', type: 'purchase', label: 'Bought 5 Hours pack', time: 'Yesterday' },
  { id: 'e4', type: 'game', label: 'Played Valorant', time: 'Yesterday' },
  { id: 'e5', type: 'purchase', label: 'Redeemed 500 coins → Free Hour', time: '2 days ago' },
  { id: 'e6', type: 'achievement', label: 'Unlocked "Marathon"', time: '3 days ago' },
]

export const DEMO_USER: UserProfile = {
  nickname: 'DemoPlayer',
  email: 'demo@imba.club',
  // Member profiles carry their own interface language (F2.5). The demo member
  // is a Russian speaker, so signing in switches the shell to RU.
  lang: 'ru',
  level: 12,
  xp: 6400,
  xpMax: 10000,
  coins: 1250,
  memberSince: 'Jan 2024',
  totalHours: 148,
  gamesPlayed: 23,
  sessions: 94,
  achievementsUnlocked: 11,
  achievementsTotal: 30,
}
