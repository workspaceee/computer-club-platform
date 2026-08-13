# CONTEXT — дайджест проекта (читать первым, вместо PLAN.md и DESIGN.md)

> Назначение: дать новому чату рабочий контекст за один короткий файл.
> `PLAN.md` (1129 строк) и `DESIGN.md` (~1000) **не читаются целиком** — только нужный блок
> поиском по номеру пункта (`C3.11`) или по имени раздела (`§3.3`, `§4.2`).
> Этот файл обновляется, когда меняется структура или закрывается блок плана.

---

## 1. Что за продукт

Лаунчер компьютерного клуба «IMBA». Игрок садится за ПК → видит экран лога → входит →
получает оболочку с HUD сессии (остаток времени, кошелёк) → домашний экран с карточками
(сессия, квесты, Battle Pass, бар, лидерборд, «клуб сейчас», турнир) → библиотека игр →
заказ в бар → завершение сессии.

Три поверхности: **member** (Этап 1), **guest / PostPaid** (Этап 2), **админка** (Этап 3).
До Этапа 4 бэкенда нет — весь data-слой это моки, повторяющие будущий контракт.

## 2. Стек

Next.js 16 App Router · React 19 · **Tailwind v4** (нет `tailwind.config`; тема и материалы —
в `@theme` внутри `app/globals.css`) · zustand (срезы) · SWR через свой `hooks/use-api.ts` ·
framer-motion · `@base-ui/react` · sharp (ассеты). Пакетный менеджер — **pnpm**.

## 3. Документы

| Файл | Роль |
|---|---|
| `CONTEXT.md` | этот дайджест |
| `PLAN.md` | порядок работ и чекбоксы. §0.2 правила, §0.3 DoD, §0.4 дизайн-чеклист, §0.4.1 спека `design:verify`, **§0.5 выбор модели и бюджет чата** |
| `DESIGN.md` | источник правды по стилю: токены (§1), типографика (§2), материалы и шкала глубины (§3, §3.3), неон и тиры (§4.2), движение (§4.4–4.5), витрина (§11), иконки (§14) |
| `MVP-CLIENT.md` | сценарии: что делаем и зачем |
| `API-CONTRACT.md` | контракт мок-API = будущий реальный |
| `AGENT-CONTRACT.md` | контракт AgentBridge (мост к Windows-ПК) |
| `C1-12-HANDOFF.md`, `F9-HANDOFF.md` | передача контекста по прошлым блокам |
| `tasks/_TEMPLATE.md` | шаблон ТЗ для чата-исполнителя |

## 4. Карта кода

```
app/
  page.tsx            единственный вход, роутинг экранов через store
  globals.css         ВСЯ тема: токены, материалы, вейлы, колодцы, неон
  dev/kit|bus|agent|sfx   витрины (design system, шина, агент, звук)
components/
  lock-screen.tsx     ДИЗАЙН-ЭТАЛОН — любой новый экран сверяется с ним
  attract-mode.tsx    экран ожидания (слайдшоу)
  app-shell.tsx  session-manager.tsx  toaster.tsx  data-boundary.tsx
  ui/                 примитивы: Panel HudChip HudPlate SectionHeader Segmented
                      StatTile RingProgress Money Countdown Progress Slider
                      EmptyState ErrorState Modal Drawer Overlay NavRail Field …
  launcher/           экраны и карточки клиента: home-view session-hud top-bar
                      quests-card battle-pass-card bar-card club-now-card
                      leaderboard-card tournament-card promo-strip games-view
                      shop-view profile-view cart-drawer checkout-modal …
  auth/               registration qr-login password-recovery seat-taken …
  dev-kit/            секции витрины (единственное место, где T1+T2 рядом легально)
  realtime/           realtime-provider offline-banner
lib/
  mock/api/*.ts       мок-API по домену: session shop loyalty social catalog
                      profile promo hero events auth support support
  mock/db.ts          сид · mock/persist.ts сохранение
  store/slices/*.ts   auth session cart loyalty social notifications settings ui
  store/index.ts      useStore + селекторы (cartTotalCents, cartCount…)
  realtime/           mock-bus.ts events.ts (EVENT_INVALIDATES) admin-sim.ts copy.ts
  i18n/dictionaries/  en.ts ru.ts lt.ts — ключи обязаны совпадать
  types/*.ts          домены: session order loyalty catalog tab pass social …
  money.ts time.ts    ФОРМАТИРОВАНИЕ (см. §6) · icons.ts · utils.ts (cn)
  agent/bridge.ts     AgentBridge + mock-agent.ts
hooks/
  use-api.ts          useApi(key, fetcher) + useInvalidate(...prefixes)
  use-realtime.ts use-agent.ts use-sfx.ts use-reduced-motion.ts
  use-roving-focus.ts use-dismissable-layer.ts use-idle.ts …
scripts/
  verify-design.mjs verify-icons.mjs verify-assets.mjs   гейты (висят на prebuild)
  optimize-*.mjs generate-blur.mjs generate-sfx.mjs      сборка ассетов
```

## 5. Дизайн-запреты (падает CI)

| Нарушение | Правило | Замена |
|---|---|---|
| `bg-black` / `bg-black/NN` вне `globals.css` | R2 | роль по шкале глубины §3.3: `.well` `.well-shallow` `.well-deep` `.scrim` `.pill` `.pill-deep` |
| чёрный градиент в JSX (`from-black/85`, `rgba(0,0,0,·)`, `rgba(10,10,12,·)`) | R1 | утилита вейла в `globals.css`: `.veil-login-h/-v/-floor`, `.veil-attract-*`, `.scanlines` |
| два T1 (`.neon-ring`/`.neon-edge` без `-static`) в одном файле | R3 | один T1 на кадр = главное действие; остальное `-static` (T2) или без неона (T3) |
| прямой импорт `lucide-react` | `icons:verify` | только `lib/icons.ts` |

Цветные градиенты (`rgba(229,53,43,·)`, `var(--primary)`, обложки, тосты) — **не нарушение**.
Исключения из T1: `components/dev-kit/**`, `attract-mode.tsx`.

Ещё запрещено (глазами, не скриптом): `bg-white`, `text-black`, фиолетовый, эмодзи как иконки,
`space-*` для отступов, margin-хаки вместо `gap-*`, радиусы вне `radius-sm/md/lg/xl` (3/6/10/16),
`full` только у пилюль и аватаров.

Обязательно: `app-ambient` + `hairline-grid` на фоне, панели через `glass`/`glass-strong`/`panel`,
`font-display` Manrope для заголовков, `font-sans` Inter для текста, `font-clock` для цифр,
`label-mono` для микро-лейблов, у каждой секции нумерованный `SectionHeader` (`01 / SESSION`),
primary `#e5352b`, анимации `framer-motion` 0.25–0.7s ease-out и отключаемы флагом
«Уменьшить анимации» + `prefers-reduced-motion`.

## 6. Данные, деньги, время

- Ни одной цифры в JSX. Всё через `lib/mock/api/*` → `useApi` → компонент.
- Деньги — **в центах**, тип `Cents`. Форматирование `formatEur` / `formatEurSigned` /
  `formatCoins` из `lib/money.ts`. Арифметика — тоже оттуда (`sumCents`, `mulCents`, `discountCents`).
- Время — `lib/time.ts`: `formatCountdown` (`HH:MM:SS`), `formatDuration`, `remainingSeconds`,
  `secondsUntil`, `serverNowMs`.
- **`lib/format.ts`, упомянутый в `PLAN.md §0.3`, не существует** — это `money.ts` + `time.ts`.
- Инвалидация после события: `EVENT_INVALIDATES` в `lib/realtime/events.ts` + `useInvalidate()`.
- Любой клиентский расчёт денег/минут помечается `// TRUST: сервер обязан пересчитать (Этап 4)`.

## 7. Текст

Только i18n, и сразу три словаря: `lib/i18n/dictionaries/{en,ru,lt}.ts`. Ключи обязаны совпадать
во всех трёх. Формулировки заданий/акций от админа (admin-authored) печатаются как есть и в
словари не идут. `aria-label` несёт контекст там, где видимая подпись повторяется
(три кнопки «Забрать» = три кнопки без названия).

## 8. Команды

```
pnpm dev              дев-сервер
pnpm design:verify    R1/R2/R3
pnpm icons:verify     импорты иконок
pnpm assets:verify    манифесты ассетов
pnpm build            гоняет все verify через prebuild
pnpm assets:build     пересборка ассетов (тяжёлый, sharp)
```

## 9. Где мы сейчас

Закрыто: **Этап 0** целиком (`F1`–`F9`, включая скрипт `design:verify`), **`C1`**, **`C2`**,
**`C3.1`–`C3.10`**. Всего 108 принятых пунктов.

**Следующий пункт: `C3.11`** — единая сетка домашнего экрана: одинаковые отступы, одинаковая
высота рядов, скелет занимает финальный размер (ни одна карточка не «прыгает» при загрузке).
Там же висит **общий долг нумерации секций на гостевой поверхности** (`06 → 08`, когда скрыта
призовая лестница) — он трижды отмечен в C3.5/C3.7/C3.10 как «долг с C3.11».

Дальше: `C3.12` (онбординг), `C3.13` (пустой профиль), затем `C4` (игры) → `C15` (приёмка Этапа 1).
