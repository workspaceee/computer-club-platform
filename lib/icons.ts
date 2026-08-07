/**
 * F7.6 — единый словарь иконок продукта.
 *
 * Правило одно: **одна иконка = одно значение**. Экран не выбирает глиф, он
 * выбирает смысл (`icons.retry`, `icons.timer`), а какой глиф стоит за смыслом —
 * решается здесь и только здесь. Отсюда следствия, ради которых файл существует:
 *
 * - `lucide-react` импортируется **в одном месте**. Ни один экран не тянет глиф
 *   напрямую, поэтому «на главной колесо `RotateCcw`, а в баннере `RefreshCw`»
 *   перестаёт быть возможным состоянием кода, а не только не рекомендуется.
 * - Смысл переименовать дешевле, чем найти. «Повторить» живёт в четырёх местах
 *   (ошибка загрузки, крэш-экран, оффлайн-баннер, консоль агента) — смена глифа
 *   это одна строка тут, а не четыре правки и один пропущенный экран.
 * - Дубли ловятся машинно: `pnpm icons:verify` падает, если два смысла указывают
 *   на один глиф (в том числе через алиасы `lucide` вида `XCircle`/`CircleX`),
 *   если глиф импортирован в обход этого файла или если смысл больше никем не
 *   используется. Таблица смыслов — в `docs/DESIGN.md` §14.
 *
 * Кегль иконка не решает: мелкие — `size={…}` по месту, крупные плиты пустых
 * состояний и категорий рисует `IconTile` (§10).
 */
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Clock,
  CloudOff,
  Coffee,
  Coins,
  Cookie,
  Cpu,
  CreditCard,
  Crown,
  CupSoda,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Gamepad2,
  Gauge,
  Gift,
  Globe,
  Headphones,
  Home,
  Inbox,
  Info,
  Keyboard,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Medal,
  Mic,
  Minus,
  Monitor,
  Moon,
  Mouse,
  MousePointer2,
  Pizza,
  PlugZap,
  Play,
  Plus,
  Power,
  QrCode,
  Receipt,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Sticker,
  Swords,
  Tag,
  Target,
  Timer,
  TimerOff,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  UserCog,
  UserRound,
  UserX,
  UtensilsCrossed,
  Users,
  Volume2,
  Wallet,
  Wifi,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type { LucideIcon }

/**
 * Словарь смыслов. Ключ — то, что говорит интерфейс; значение — глиф.
 * Значения не повторяются: повтор означает, что два смысла на экране выглядят
 * одинаково, и `icons:verify` такой коммит не пропустит.
 */
export const icons = {
  // ── статусы операций (канон — тостер: он единственное место, где все четыре
  //    тона стоят рядом, поэтому именно его набор стал общим)
  success: CheckCircle2, // операция завершилась: тост, экран оплаты
  error: XCircle, // отказ: не загрузилось, упало, крэш-экран
  warning: AlertTriangle, // предупреждение, но не отказ: функция ограничена
  info: Info, // нейтральное сообщение
  pending: Loader2, // идёт работа (всегда с `animate-spin`)
  retry: RotateCcw, // «Повторить» — единственный глиф повтора в продукте
  restart: Power, // перезагрузить оболочку целиком (эскалация после retry)
  check: Check, // пункт списка выполнен / вариант выбран

  // ── связь и железо станции
  offline: CloudOff, // нет связи с сервером клуба
  agentOffline: PlugZap, // нет связи с локальным агентом станции
  network: Wifi, // сеть, пинг
  performance: Gauge, // производительность, FPS, панель драйвера
  display: Monitor, // дисплей, герцовка
  hardware: Cpu, // GPU/CPU станции
  status: Activity, // сводное состояние станции
  mouse: Mouse, // мышь как устройство
  keyboard: Keyboard, // клавиатура как устройство
  headphones: Headphones, // выход звука
  microphone: Mic, // вход звука

  // ── навигация и действия
  close: X,
  back: ChevronLeft,
  forward: ChevronRight, // «дальше», в том числе CTA промо
  expand: ChevronDown, // раскрыть список/меню
  search: Search,
  add: Plus, // добавить: время, товар, количество
  remove: Minus, // убавить количество
  delete: Trash2,
  save: Save,
  signOut: LogOut,
  settings: Settings,
  language: Globe, // язык и регион
  volume: Volume2,
  controls: MousePointer2, // раздел «Управление», курсор, «подвигай мышью»
  empty: Inbox, // пусто по данным
  notifications: Bell, // входящие клуба: колокольчик и панель уведомлений
  support: LifeBuoy, // помощь, поддержка
  home: Home,
  play: Play, // запустить игру
  demo: Rocket, // быстрый вход в демо-сессию

  // ── доступ и защита
  lock: Lock, // заблокировано или защищено: пароль, станция, ачивка
  secure: ShieldCheck, // соединение/платёж подтверждён
  reveal: Eye,
  conceal: EyeOff,
  qr: QrCode,
  biometry: Fingerprint,
  email: Mail,

  // ── люди
  player: User, // участник клуба, профиль
  staff: UserCog, // администратор смены
  guest: UserRound, // гость без профиля
  accountMissing: UserX, // игрового аккаунта нет / не привязан
  community: Users, // друзья, игроки онлайн
  level: ChevronsUp, // уровень профиля

  // ── игра и прогресс
  games: Gamepad2, // раздел игр, игровая активность
  rating: Star, // рейтинг игры
  tournament: Swords, // турнир
  rewards: Trophy, // награды, лидерборд
  achievement: Award, // достижение, бейдж
  premium: Crown, // членство/премиум-тир
  tierBase: Shield, // базовый тир
  tierMid: Medal, // средний тир
  streak: Flame, // серия
  accuracy: Target, // точность
  energy: Zap, // энергия, буст
  season: Sparkles, // сезон, Battle Pass
  night: Moon, // ночной пасс, ночное окно

  // ── время
  calendar: CalendarDays, // дата, календарный период, событие
  clock: Clock, // накопленные часы, расписание, история
  timer: Timer, // игровое время: остаток, покупка, продление
  sessionEnded: TimerOff, // время вышло

  // ── деньги и магазин
  coins: Coins, // баланс IMBA Coins
  wallet: Wallet, // раздел кошелька
  bill: Receipt, // открытый счёт гостя
  payment: CreditCard, // оплата
  shop: ShoppingBag, // раздел магазина, покупка, товар без фото
  cart: ShoppingCart, // корзина
  gift: Gift, // подарок, приз
  sale: Tag, // скидка, акция
  trend: TrendingUp, // рост показателя
  deltaUp: ArrowUpRight, // дельта вверх
  deltaDown: ArrowDownRight, // дельта вниз

  // ── ассортимент бара (категории товаров)
  drinks: CupSoda,
  coffee: Coffee,
  snacks: Cookie,
  food: Pizza,
  combo: UtensilsCrossed,
  merch: Shirt,
  sticker: Sticker,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof icons
