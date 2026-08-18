# IMBA Cyber Club — Контракт API (F3.8)

> **Назначение.** Этот документ — обязательство. Мок-слой `lib/mock/api/*` уже
> реализует всё перечисленное ниже; Этап 4 обязан реализовать это **один-в-один**,
> с теми же путями, теми же полями и теми же кодами ошибок. Тогда переключение
> клиента с мока на реальный бэкенд — это замена импортов в `lib/mock/api.ts`,
> а не переписывание UI.
>
> Источник истины по формам данных — `lib/types/*`. Здесь указаны имена типов,
> а не их развёрнутые поля: дублировать структуры в Markdown значит гарантированно
> их рассинхронить.

---

## 0. Общие правила

### 0.1 Инварианты

| Правило | Почему |
| --- | --- |
| **Деньги — целые центы** (`Cents`). Никогда float, никогда строка. | `0.1 + 0.2 !== 0.3`. Форматирование — только на клиенте (`lib/money.ts`). |
| **Время — целые секунды/минуты** (`Seconds`, `Minutes`). | Дробная секунда даёт таймер, залипший на «29:59». |
| **Остаток сессии считается от `expiresAt`**, абсолютного серверного времени. | Локальный декремент уплывает при сворачивании окна и засыпании ПК (`lib/time.ts`). |
| **Все временные метки — ISO-8601 строки** (`ISODateTime`), не `Date`. | JSON не умеет `Date`; клиент парсит сам. |
| **Сервер не возвращает текст для пользователя.** Только `code`. | Копирайт живёт в словарях (`lib/i18n`, F2.2); три языка. |
| **Цена пересчитывается на записи**, а не берётся из запроса. | Клиентская цена — предложение, а не факт. Иначе подмена цены в devtools. |
| **Идемпотентность мутаций через `Idempotency-Key`.** | Двойной клик по «Оплатить» не должен списать дважды. |

### 0.2 Аутентификация

Все эндпоинты кроме `POST /api/auth/*` требуют сессионную cookie
(`HttpOnly`, `Secure`, `SameSite=Lax`). Отсутствие — `401 unauthorized`.
Гостевая сессия (`POST /api/auth/guest`) получает ту же cookie с урезанным
скоупом: гостю недоступны кошелёк, лояльность и социальные эндпоинты.

Мок эмулирует это через `requireAuth()` в `lib/mock/api/client.ts`.

### 0.3 Формат ошибки

```json
{
  "error": {
    "code": "insufficientFunds",
    "fields": { "amount": "validation" }
  }
}
```

`fields` присутствует только при `code: "validation"`. Соответствие кода и
HTTP-статуса зафиксировано в `ApiErrorCode` / `STATUS`:

| `code` | HTTP | Когда |
| --- | --- | --- |
| `generic` | 500 | Непредвиденный сбой. |
| `network` | — | Клиентский код: запрос не дошёл. |
| `timeout` | 504 | Апстрим не ответил. |
| `notFound` | 404 | Записи нет или она не принадлежит вызывающему. |
| `unauthorized` | 401 | Нет сессии. |
| `forbidden` | 403 | Сессия есть, прав нет (гость в кошельке, чужой тикет). |
| `conflict` | 409 | Состояние не позволяет: заказ уже готовится, тикет уже открыт. |
| `validation` | 422 | Форма не прошла проверку, см. `fields`. |
| `invalidCredentials` | 401 | Неверный e-mail или пароль. |
| `sessionExpired` | 410 | Игровая сессия закончилась. |
| `insufficientFunds` | 402 | Не хватает денег в кошельке. |
| `insufficientCoins` | 402 | Не хватает коинов. |
| `outOfStock` | 409 | Товара или приза нет на складе. |
| `creditLimit` | 402 | Превышен лимит долга по табу. |

### 0.4 Транспорт и задержки

Мок отвечает за 200–600 мс и умеет принудительно падать
(`mockFaults.fail('shop.createOrder', 'outOfStock')`), чтобы error-состояния UI
проверялись без бэкенда. Реальный API этого не воспроизводит — но UI, написанный
против мока, уже переживает и медленный ответ, и ошибку.

Списки возвращаются либо массивом (короткие, полностью фиксированные наборы),
либо в конверте `Page<T>` (`items`, `total`, `nextCursor`) там, где пагинация
появится: каталог игр, лента активности, транзакции.

---

## 1. Auth — `lib/mock/api/auth.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | `LoginPayload` | `AuthResult` | `invalidCredentials`, `validation`, `forbidden` (аккаунт заблокирован) |
| GET | `/api/auth/nickname` | `?value=` | `NicknameCheck` | — |
| POST | `/api/auth/register/start` | `StartRegistrationPayload` | `RegistrationChallenge` | `validation` (`nickname`, `email`, `password`, `confirmPassword`, `acceptedRules`) |
| POST | `/api/auth/register/resend` | `{ challengeId }` | `RegistrationChallenge` | `notFound`, `rateLimited` |
| POST | `/api/auth/register/confirm` | `{ challengeId, code }` | `AuthResult` | `notFound`, `timeout` (код истёк), `invalidCode`, `rateLimited` (попытки сожжены), `validation` (ник/e-mail заняли за это время) |
| POST | `/api/auth/password/reset` | `{ email }` | `PasswordResetChallenge` | `validation`, `rateLimited` |
| POST | `/api/auth/password/reset/resend` | `{ challengeId }` | `PasswordResetChallenge` | `notFound`, `rateLimited` |
| POST | `/api/auth/password/reset/verify` | `{ challengeId, code }` | `PasswordResetVerification` | `notFound`, `timeout`, `invalidCode`, `rateLimited` |
| POST | `/api/auth/password/reset/complete` | `CompletePasswordResetPayload` | `AuthResult` | `notFound`, `unauthorized`, `validation` |
| POST | `/api/auth/demo` | — | `AuthResult` | — |
| POST | `/api/auth/guest` | — | `GuestSessionResult` | `conflict` (нет свободных мест) |
| POST | `/api/auth/qr` | — | `QrChallenge` | — |
| GET | `/api/auth/qr/:id` | — | `AuthResult` | `notFound`, `timeout` (истёк) |
| POST | `/api/auth/logout` | — | `204` | — |

`AuthResult` несёт профиль, снапшот сессии и язык интерфейса игрока — вход одним
запросом, чтобы лаунчер не собирал первый экран из четырёх вызовов.
`QrChallenge.expiresAt` — 120 секунд.

**Оба одноразовых кода (регистрация C1.4 и восстановление C1.3) живут по одним
правилам:** 6 цифр, TTL 600 с, кулдаун ресенда 60 с, 5 попыток до сжигания
челленджа. Челленджи отдают клиенту **длительности** (`expiresInSec`,
`resendAfterSec`), а не таймстемпы: у ПК в клубе могут быть неверные системные
час������, и UI обязан считать дедлайн от момента получения ответа. Ни код, ни
счётчик попыток, ни пароль в ответе не появляются — в моке они лежат в серверной
`Map`, а поле `devCode` существует **только** потому, что прототип не отправляет
писем, и реальный API его не возвращает.

**Регистрация — двухфазная, и аккаунт создаёт ровно один вызов.**
`register/start` открывает челлендж и ничего не пишет; участник появляется
только в `register/confirm`. Поэтому ушедший со шага кода игрок не оставляет ни
половинчатой записи, ни занятого ника. `acceptedRules` проверяется **на сервере**:
галочка правил — запись согласия, и выключенная кнопка на клиенте её не
доказывает. `GET /api/auth/nickname` — чтение, а не резервация: два игрока,
набирающие одно имя, оба услышат «свободно», и проигравший узнаёт об этом на
`register/confirm`, который судит имя заново и возвращает `validation` с полем
`nickname`, а не общий отказ. Конфликт e-mail, в отличие от восстановления,
сообщается прямо: форма, принявшая занятый адрес, создала бы аккаунт, которым
нельзя пользоваться.

---

## 2. Profile — `lib/mock/api/profile.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/me` | — | `UserProfile` | `unauthorized` |
| GET | `/api/me/wallet` | — | `Wallet` | `unauthorized`, `forbidden` (гость) |
| GET | `/api/me/preferences` | — | `UserPreferences` | `unauthorized` |
| PATCH | `/api/me/preferences` | `Partial<UserPreferences>` | `UserPreferences` | `validation` |
| PUT | `/api/me/preferences/locale` | `{ locale: Lang }` | `UserPreferences` | `validation` |
| PUT | `/api/me/privacy` | `PrivacySettings` | `UserPreferences` | `validation` |

`PATCH` частичный, но возвращает **целую** запись: клиент не склеивает состояние
руками. Уровень и XP считает сервер (`xpForLevel`), клиент только рисует полосу.

---

## 3. Session — `lib/mock/api/session.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/session/current` | — | `SessionSnapshot` | `sessionExpired` |
| GET | `/api/session/:id` | — | `Session` | `notFound` |
| GET | `/api/session/history` | — | `Session[]` | `unauthorized` |
| POST | `/api/session/heartbeat` | `{ anchorId, elapsedSinceAnchor }` | `SessionSnapshot` | `sessionExpired` |
| POST | `/api/session/open` | `{ userId? \| guestId?, billingMode, minutes?, machineId? }` | `SessionSnapshot` | `conflict` (место занято), `validation` (обе личности или ни одной) |
| POST | `/api/session/pause` | `{ sessionId? }` | `SessionSnapshot` | `conflict` |
| POST | `/api/session/resume` | `{ sessionId? }` | `SessionSnapshot` | `conflict` |
| POST | `/api/session/end` | `{ sessionId? }` | `EndSessionResult` | `conflict` |
| POST | `/api/session/extend` | `{ passPurchaseId, minutes }` | `SessionSnapshot` | `notFound`, `validation`, `conflict` |
| GET | `/api/session/warning` | — | `SessionWarning \| null` | — |
| GET | `/api/machine/settings` | — | `MachineSettings` | `notFound` |
| PATCH | `/api/machine/settings` | `Partial<MachineSettings>` | `MachineSettings` | `validation` |
| GET | `/api/machine/telemetry` | — | `MachineTelemetry` | `notFound` |

**`SessionSnapshot` — самый важный контракт продукта.** Он содержит и `expiresAt`
(абсолютный дедлайн, `null` на паузе), и `serverTime` того же ответа. Клиент
считает остаток как `(expiresAt − serverTime) − сколько он держит снапшот`
(`remainingSeconds()` в `lib/time.ts`), поэтому ПК с неверными системными часами
показывает верный отсчёт. `secondsLeft` дублирует остаток на момент ответа — для
паузы, где дедлайна нет.

`EndSessionResult` возвращает и закрытую сессию, и незакрытый таб: сессия,
законченная с долгом, обязана показать игроку счёт, а не просто выкинуть на лок-скрин.

**`POST /api/session/open` — сервер, а не клиент, решает, кто садится (C1.7).**
Лок-скрин сначала читает `GET /api/club/station/holder`, но это только для того,
чтобы **назвать** занявшего: два прихода на одно место оба прочитают `null` до
того, как кто-то из них что-то записал, поэтому отказ обязан приходить с записи.
Живая строка на месте не всегда отказ — ровно два случая её **перехватывают**:
тот же участник (после «Lock PC» на паузе остаётся его сессия) и гость после
гостя (у прихода нет аккаунта для сверки, а открытый таб принадлежит месту,
MVP §8.2). Всё остальное — `conflict`. Биллинг следует из личности:
`userId` → `prepaid`, `guestId` → `postpaid` (MVP §3.2), клиент его не выбирает.

Место освобождает только `end`; `pause` его **держит** — это и есть смысл
«Lock PC», и поэтому `holder` отдаёт `paused` наравне с `active`. Отказ записи на
выходе (`end`, `pause`) клиент глотает: остаться занятым — безопасная сторона
ошибки, её снимает админ ключом, а зависший спиннер «выходим…» не снимает никто.

---

## 4. Catalog — `lib/mock/api/catalog.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/games` | `GameQuery` | `GameListResult` | `validation` |
| GET | `/api/games/:id` | — | `Game` | `notFound` |
| GET | `/api/games/featured` | — | `Game[]` | — |
| GET | `/api/games/categories` | — | `{ category, count }[]` | — |
| GET | `/api/games/recent` | `?limit` | `Game[]` | `unauthorized` |
| GET | `/api/games/launches` | — | `GameLaunch[]` | `unauthorized` |
| POST | `/api/games/:id/launch` | — | `GameLaunch` | `notFound`, `sessionExpired` |
| GET | `/api/club` | — | `Club` | — |
| GET | `/api/club/settings` | — | `ClubSettings` | — |
| GET | `/api/club/zones` | — | `Zone[]` | — |
| GET | `/api/club/machines` | `?zoneId` | `Machine[]` | — |
| GET | `/api/club/machines/:id` | — | `Machine` | `notFound` |
| GET | `/api/club/occupancy` | `?zoneId` | `OccupancySummary` | — |
| GET | `/api/club/accounts` | — | `HouseAccount[]` | `forbidden` |

Поиск, фильтр по категории, сортировка и пагинация — **на серве��е**.
Кли��нт не фильтрует 60+ игр в памяти, иначе на 600 играх это перестанет работать.
`OccupancySummary` считается сервером: ни один компоне��т не ��ересчитывает места сам.

---

## 5. Shop / Wallet / Tab / Orders — `lib/mock/api/shop.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/shop/products` | `ProductQuery` | `Product[]` | — |
| GET | `/api/shop/products/:id` | — | `Product` | `notFound` |
| GET | `/api/shop/items` | — | `ShopItem[]` | — |
| GET | `/api/shop/time` | — | `ShopItem[]` | — |
| GET | `/api/shop/memberships` | — | `ShopItem[]` | — |
| GET | `/api/shop/passes` | — | `Pass[]` | — |
| GET | `/api/shop/passes/mine` | — | `PassPurchase[]` | `unauthorized` |
| POST | `/api/shop/quote` | `CartLine[]` | `CartQuote` | `notFound`, `outOfStock` |
| POST | `/api/shop/checkout` | `CheckoutPayload` | `CheckoutResult` | `insufficientFunds`, `creditLimit`, `outOfStock`, `validation` |
| POST | `/api/shop/passes/:id/buy` | `PurchasePassPayload` | `PurchasePassResult` | `insufficientFunds`, `creditLimit`, `notFound` |
| GET | `/api/wallet/transactions` | — | `Transaction[]` | `unauthorized` |
| POST | `/api/wallet/topup` | `{ amountCents, method }` | `Transaction` | `validation`, `forbidden` |
| GET | `/api/tab` | `?sessionId` | `Tab \| null` | — |
| POST | `/api/tab/:id/settle` | `{ method }` | `SettleTabResult` | `insufficientFunds`, `conflict` |
| POST | `/api/orders` | `CreateOrderPayload` | `CreateOrderResult` | `outOfStock`, `insufficientFunds`, `creditLimit` |
| GET | `/api/orders` | — | `Order[]` | `unauthorized` |
| GET | `/api/orders/active` | — | `Order[]` | `unauthorized` |
| GET | `/api/orders/:id` | — | `Order` | `notFound` |
| POST | `/api/orders/:id/cancel` | — | `Order` | `conflict` (уже готовится) |

**`POST /api/shop/quote` — единственный источник цен.** UI показывает ровно то,
что вернул расчёт: сумму позиций, скидку по членству, итог и доступные способы
оплаты (`CartQuote.paymentOptions`). Клиент не умножает цену на количество сам.

**Оплата пересчитывается на записи.** `checkout` и `createOrder` заново считают
корзину и сравнивают с тем, что прислал клиент; расхождение — `conflict`.
Способ `tab` дополнительно проверяет остаток кредитного лимита (`creditLimit`),
`wallet` — баланс (`insufficientFunds`). Отказ не применяет ничего: транзакция
целиком либо не случилась (в моке это гарантирует `mutate()`).

Корзина магазина смешивает бар и тайм-пассы, поэтому `checkout` умеет за один
вызов создать заказ, начислить минуты и записать обе транзакции.

---

## 6. Loyalty — `lib/mock/api/loyalty.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/loyalty/coins` | — | `Coins` | `unauthorized` |
| GET | `/api/loyalty/quests` | `?type` | `Quest[]` | — |
| POST | `/api/loyalty/quests/:id/claim` | — | `ClaimQuestResult` | `conflict` (не выполнен / уже забран) |
| GET | `/api/loyalty/battlepass` | `?track` | `BattlePassView` | — |
| POST | `/api/loyalty/battlepass/:level/claim` | — | `ClaimTierResult` | `conflict`, `forbidden` (платный трек не куплен) |
| POST | `/api/loyalty/battlepass/unlock` | — | `UnlockPaidTrackResult` | `insufficientFunds`, `conflict` |
| GET | `/api/loyalty/rewards` | — | `Reward[]` | — |
| GET | `/api/loyalty/rewards/featured` | — | `Prize[]` | — |
| POST | `/api/loyalty/rewards/:id/redeem` | — | `RedeemResult` | `insufficientCoins`, `outOfStock`, `conflict` (лимит на игрока) |
| GET | `/api/loyalty/redemptions` | — | `Redemption[]` | `unauthorized` |
| POST | `/api/loyalty/redemptions/:id/cancel` | — | `Redemption` | `conflict` (уже выдан) |
| GET | `/api/loyalty/achievements` | — | `Achievement[]` | — |
| GET | `/api/loyalty/activity` | `?limit` | `ActivityEvent[]` | — |
| GET | `/api/loyalty/leaderboard` | `LeaderboardQuery` | `LeaderboardEntry[]` | — |

`BattlePassView` — весь экран пропуска одним вызовом: сезон, уровни, прогресс
игрока, что уже забрано. Ранг в лидерборде считает сервер и помечает строку
смотрящего (`isViewer`) — клиент не ищет себя в списке.

---

## 7. Social — `lib/mock/api/social.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/social/friends` | — | `FriendSummary[]` | `unauthorized` |
| GET | `/api/social/requests` | — | `FriendRequestSummary[]` | `unauthorized` |
| GET | `/api/social/search` | `?term` | `FriendSummary[]` | `validation` |
| POST | `/api/social/friends` | `{ userId }` | `Friendship` | `forbidden` (приватность), `conflict` |
| POST | `/api/social/friends/:id/accept` | — | `Friendship` | `forbidden` (не получатель), `notFound` |
| DELETE | `/api/social/friends/:id` | — | `204` | `notFound` |
| POST | `/api/social/block` | `{ userId }` | `Friendship` | `notFound` |
| GET | `/api/social/parties` | — | `Party[]` | `unauthorized` |
| POST | `/api/social/parties` | `{ gameId }` | `Party` | `notFound` |
| POST | `/api/social/parties/:id/invite` | `{ userId }` | `Party` | `forbidden`, `conflict` (пати полна) |
| POST | `/api/social/parties/:id/respond` | `{ accept }` | `Party` | `notFound`, `conflict` |
| POST | `/api/social/parties/:id/leave` | — | `Party \| null` | `notFound` |

Приватность проверяется на сервере: заявка «в друзья» игроку, закрывшему приём,
возвращает `forbidden`, а не тихо теряется. Уход владельца расформировывает пати
(`null` в ответе).

---

## 8. Events — `lib/mock/api/events.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/tournaments` | `TournamentQuery` | `Tournament[]` | — |
| GET | `/api/tournaments/:id` | — | `Tournament` | `notFound` |
| GET | `/api/tournaments/:id/entries` | — | `TournamentEntry[]` | `notFound` |
| POST | `/api/tournaments/:id/register` | `{ method }` | `TournamentEntry` | `insufficientFunds`, `insufficientCoins`, `conflict` (нет слотов / регистрация закрыта) |
| POST | `/api/tournaments/:id/check-in` | — | `TournamentEntry` | `conflict` (окно закрыто) |
| DELETE | `/api/tournaments/:id/register` | — | `204` | `conflict` (турнир начался) |
| GET | `/api/bookings` | — | `Booking[]` | `unauthorized` |
| GET | `/api/bookings/upcoming` | — | `BookingView[]` | `unauthorized` |
| GET | `/api/bookings/slots` | `SlotQuery` | `BookingSlot[]` | `validation` |
| POST | `/api/bookings` | `CreateBookingPayload` | `Booking` | `conflict` (нет мест), `insufficientFunds` |
| POST | `/api/bookings/:id/check-in` | — | `Booking` | `conflict` (вне grace-окна) |
| DELETE | `/api/bookings/:id` | — | `Booking` | `conflict` |

Взнос за турнир берётся деньгами или коинами — оба пути возвращают одну и ту же
`TournamentEntry`, поэтому UI регистрации один. Отмена регистрации и брони
возвращает предоплату тем же способом, которым она была внесена.

`BookingSlot` содержит уже посчитанное число свободных мест в зоне на час, а
`BookingView` — раскр��тое окно чек-ина: клиент не вычисляет «можно ли отметиться
сейчас» из двух таймстемпов.

---

## 9. Support — `lib/mock/api/support.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/notifications` | — | `Notification[]` | `unauthorized` |
| GET | `/api/notifications/unread` | — | `number` | `unauthorized` |
| POST | `/api/notifications/:id/read` | — | `Notification` | `notFound` |
| POST | `/api/notifications/read-all` | — | `{ count }` | `unauthorized` |
| POST | `/api/notifications/:id/action` | `{ outcome, rating? }` | `Notification` | `notFound`, `validation`, `conflict` (уже отвечено) |
| GET | `/api/help/threads` | — | `HelpThread[]` | `unauthorized` |
| GET | `/api/help/threads/open` | — | `HelpThread \| null` | — |
| GET | `/api/help/threads/:id` | — | `HelpThread` | `notFound` |
| POST | `/api/help/threads` | `CreateThreadPayload` | `HelpThread` | `validation` |
| POST | `/api/help/threads/:id/messages` | `{ text }` | `HelpMessage` | `notFound`, `validation` |
| POST | `/api/help/threads/:id/resolve` | — | `HelpThread` | `conflict` |
| POST | `/api/help/threads/:id/rate` | `{ rating }` | `HelpThread` | `validation`, `conflict` (тикет не закрыт) |
| POST | `/api/help/call-staff` | `{ reason? }` | `HelpThread` | — |

**Карточка уведомления отвечается на сервере (C2.5).** `Notification.action`
описывает, что карточка спрашивает (`party-invite`, `rate-order`), и `outcome`
живёт рядом с самим уведомлением, а не в состоянии панели: закрытая и снова
открытая панель обязана показать тот же ответ. `party-invite` пишет тот же
`party.members[].state`, что и `POST /api/social/parties/:id/respond` — принять
инвайт из инбокса и из раздела «Друзья» не могут разойтись. Повторный ответ —
`conflict`, а не второе решение: это устаревшая панель, гонящаяся со свежей.
Ответ дополнительно помечает карточку прочитанной — игрок, только что нажавший
«Принять», её точно видел.

**Один открытый тикет на игрока.** Повторный `POST /api/help/threads` возвращает
существующий тред, а не создаёт второй — иначе кнопка «Позвать администратора»
за минуту сгенерирует десять обращений. `call-staff` — это тот же эндпоинт с
предзаполненной причиной, доступный и с лок-скрина.

---

## 10. Promo — `lib/mock/api/promo.ts`

| Метод | Путь | Запрос | Ответ | Ошибки |
| --- | --- | --- | --- | --- |
| GET | `/api/promos` | `PromoQuery` (`surface`, `viewer`, `activeOnly`, `limit`) | `Promo[]` | — |
| GET | `/api/promos/active` | `surface`, `viewer`, `limit` | `Promo[]` | — |
| GET | `/api/promos/:id` | — | `Promo` | `notFound` |
| GET | `/api/promos/ticker` | `viewer` | `string[]` | — |

Кампании — контент клуба, поэтому у клиента здесь **нет ни одного write-эндпоинта**:
их редактирует админка (Этап 3).

Окно показа считает сервер по `db.now`, а не клиент по `Date.now()`, — иначе
промо-полоса на главной и экран простоя могли бы в один вечер рекламировать
разные акции. Аудиторию тоже фильтрует сервер: гостевая поверхность спрашивает с
`viewer: 'everyone'` и получает меньше строк, вместо того чтобы получить всё и
прятать часть в JSX. Сортировка — по `priority` (выше — раньше), тай-брейк по `id`,
чтобы порядок был детерминированным.

`target` — это идентификатор раздела (`LauncherView`), а не URL: `resolveView`
уже умеет отказать в разделе, который текущая поверхность не открывает, поэтому
недоступная цель деградирует до главной, а не до мёртвой кнопки. Текст в
картинки не запекается — заголовки живут в DOM ради перевода и `alt`.

`/api/promos/ticker` возвращает готовые строки: бегущая строка attract-mode не
имеет собственной вёрстки, а собирается из тех же кампаний, что и баннеры.

---

## 11. Realtime (F4)

Опрос — не транспорт для «админ выдал время → игрок увидел мгновенно».
Полный перечень событий — в `lib/realtime/events.ts` (F4.1). Канал:
`GET /api/realtime` (SSE), события совпадают по имени и payload с мок-шиной
`lib/realtime/mock-bus.ts`, чтобы `hooks/use-realtime.ts` переключился на
реальный сервер без изменений в UI.

При обрыве связи клиент показывает баннер, **продолжает** отсчёт локально от
последнего `expiresAt` и переподключается с backoff (F4.5). Таймер не
останавливается: время в клубе идёт независимо от состояния сокета.

---

## 12. Чего в контракте нет

Осознанные пропуски, чтобы Этап 4 не додумывал:

- **Админские эндпоинты** (`/api/admin/*`) — Этап 3, отдельный документ.
- **Агент на ПК** (`launchGame`, телеметрия, нативные панели) — это не HTTP API
  клуба, а локальный мост; контракт в `docs/AGENT-CONTRACT.md` (F5.5).
- **Платёжный провайдер.** `topUpWallet` и `method: 'card'` в моке завершаются
  сразу. Реальная интеграция добавит редирект и вебхук — это меняет только
  `POST /api/wallet/topup`, остальные эндпоинты не трогает.
- **Пагинация каталога** объявлена (`Page<T>`), но мок отдаёт всё сразу: 60 игр
  в одну страницу влезают.
