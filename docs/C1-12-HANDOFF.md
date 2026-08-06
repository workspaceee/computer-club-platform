# Инструкция: доделать C1.12 «Один ПК = одна сессия»

## Контекст задания

**Спецификация (PLAN.md строка 485):**
> C1.12 — Один ПК = одна сессия: если тот же аккаунт уже играет на другом ПК — «Твоя сессия активна на PC-12», варианты «Перенести сюда» (запрос админу) или «Отмена». Защита от двух открытых окон лаунчера на одном ПК.

**Ответы пользователя на уточняющие вопросы:**
1. **Как подтверждается «Перенести сюда»?** — Mock-кнопка в самой панели (аналог QR-диалога, где кнопка «Сыграть роль телефона» живёт прямо в диалоге). Настоящего админа нет, кнопка симулирует одобрение.
2. **Как имитировать «аккаунт уже играет на другом ПК»?** — Ручка в дев-ките (кнопка «Seed session on other PC» сеет живую сессию `DemoPlayer` на другой машине).
3. **Что видит второе окно лаунчера на том же ПК?** — Блок-экран + автоперехват: второе окно показывает «Лаунчер уже открыт в другом окне», когда первое закрывается — второе тихо перехватывает.

---

## Что уже готово (не трогать)

- `lib/realtime/events.ts` — `SessionMovedEvent` (`session.moved`) уже определён (строки 113–118), включён в каталог событий и скопы.
- `lib/realtime/admin-sim.ts` — `moveSession(toMachineId?)` уже реализован (строки 249–275): занимает целевую машину `status = 'reserved'`, публикует `session.moved` на шине.
- `lib/realtime/copy.ts` строка 73 — копи для `session.moved` (`realtime.sessionMoved`) уже есть.
- `lib/mock/db.ts` — `getLiveSession(machineId)` уже есть (строка 2151): возвращает живую сессию по machineId.
- `lib/mock/api/session.ts` — `openSession` уже содержит правило `conflict` (строки ~196–220). Нужно **расширить** его одной новой проверкой.
- `components/auth/seat-taken.tsx` — уже существует панель «место занято». **Не трогать**: C1.12 — отдельная панель `active-elsewhere.tsx`.
- `components/dev-kit/bus-console.tsx` — группа `GROUPS` (строки 46+), сюда добавляется ручка дев-кита.

---

## Что нужно сделать (пошагово)

### Шаг 1 — Mock API: новый код ошибки + проверка в `openSession`

**Файл:** `lib/mock/api/session.ts`

Добавить в `openSession` **перед** проверкой `const live = getLiveSession(machineId)` новую проверку:

```
// C1.12: если этот аккаунт уже имеет живую сессию на ДРУГОЙ машине — отказать с кодом 'activeElsewhere'
if (userId) {
  const elsewhereSession = db.sessions.find(
    (s) =>
      s.userId === userId &&
      s.state !== 'ended' &&
      s.machineId !== machineId,
  )
  if (elsewhereSession) {
    const elsewhereMachine = getMachine(elsewhereSession.machineId)
    throw new ApiError('activeElsewhere', {
      machineId: elsewhereSession.machineId,
      machineLabel: elsewhereMachine?.label ?? elsewhereSession.machineId,
      sessionId: elsewhereSession.id,
    })
  }
}
```

**Файл:** `lib/mock/api/client.ts`

Добавить `'activeElsewhere'` в union `ApiErrorCode` (там где `'conflict' | 'sessionExpired' | ...`). Также убедиться, что `ApiError` может нести `payload` (детали машины) — если нет, добавить опциональное поле `data?: Record<string, unknown>`.

---

### Шаг 2 — Mock API: `requestTransfer` и `approveTransfer`

**Файл:** `lib/mock/api/session.ts` (или отдельный `lib/mock/api/transfer.ts`)

```typescript
export interface TransferRequest {
  requestId: ID
  userId: ID
  fromMachineId: ID
  toMachineId: ID
  requestedAt: string
  state: 'pending' | 'approved' | 'denied'
}

// POST /api/session/request-transfer
export function requestTransfer(toMachineId: ID): Promise<TransferRequest>
// - создаёт запись в db.transferRequests
// - возвращает запись со state: 'pending'

// POST /api/session/approve-transfer (mock: симуляция ответа админа)
export function approveTransfer(requestId: ID): Promise<void>
// - находит запись, ставит state: 'approved'
// - вызывает admin-sim moveSession(toMachineId) → публикует session.moved на шине
// - удаляет/завершает старую сессию на fromMachineId (machine.status = 'free')
```

Добавить `db.transferRequests: TransferRequest[]` в mock db (файл `lib/mock/db.ts`).

---

### Шаг 3 — Компонент панели `active-elsewhere.tsx`

**Файл:** `components/auth/active-elsewhere.tsx` (НОВЫЙ файл)

Аналог `seat-taken.tsx`, но другой смысл: не «место занято чужим», а «ТЫ сам играешь на другой машине».

```tsx
interface ActiveElsewhereProps {
  machineLabel: string        // 'PC #12' — где сейчас активна сессия
  sessionId: ID               // id сессии для запроса переноса
  onTransferRequested: () => void  // переход в состояние ожидания одобрения
  onCancel: () => void        // назад к форме входа
}
```

**Содержимое карточки:**
- Заголовок: `auth.activeElsewhere` = «Сессия активна» / хайлайт `auth.activeElsewhereHi` = «на {machine}»
- Тело: `auth.activeElsewhereBody` = «Твоя сессия сейчас активна на {machine}. Перенести её на этот ПК?»
- Кнопка «Перенести сюда» (primary) → вызывает `requestTransfer`, переходит в `<TransferPending>`
- Кнопка-призрак «Отмена» → `onCancel`

**Дочерний компонент `TransferPending`** (inline или отдельный файл):
- Показывает: «Ожидаем ответа администратора…» + спиннер
- **Mock-кнопка** (dev-only, под `DEV_SHORTCUTS`): `icons.dev` + «Одобрить как администратор» → вызывает `approveTransfer(requestId)`
- Подписывается на `session.moved` через `useRealtimeAny('session.moved')`: когда приходит кадр с `toMachineId === db.currentMachineId` и `sessionId` совпадает — вызывает `claimSeat` (adoption: сессия уже на этой машине) → `onEnter(snapshot)`

---

### Шаг 4 — Подключить в `lock-screen.tsx`

**Файл:** `components/lock-screen.tsx`

В функции `enterAs` / `handleSignIn` (строки ~228–290), после раскрытия ошибки от `claimSeat`:

```typescript
// В claimSeat (lib/seat.ts) — поймать 'activeElsewhere':
if (err instanceof ApiError && err.code === 'activeElsewhere') {
  return { granted: false, activeElsewhere: true, machineLabel: err.data?.machineLabel, sessionId: err.data?.sessionId }
}
```

Тип `SeatClaim` расширить третьей веткой:
```typescript
| { granted: false; activeElsewhere: true; machineLabel: string; sessionId: ID }
```

В JSX рендера lock-screen добавить ветку рядом с `{blocked ? <SeatTaken ... /> : ...}`:
```tsx
{activeElsewhere ? (
  <ActiveElsewhere
    machineLabel={activeElsewhere.machineLabel}
    sessionId={activeElsewhere.sessionId}
    onTransferRequested={() => {/* держим панель, ждём session.moved */}}
    onCancel={() => { setActiveElsewhere(null); setLoading(false) }}
  />
) : ...}
```

---

### Шаг 5 — Защита от двух окон (BroadcastChannel / Web Locks API)

**Файл:** `hooks/use-single-window.ts` (НОВЫЙ файл)

```typescript
'use client'
import { useEffect, useState } from 'react'

export function useSingleWindow(): boolean {
  const [isDuplicate, setIsDuplicate] = useState(false)

  useEffect(() => {
    // Вариант А: Web Locks API (предпочтительно)
    if (typeof navigator.locks !== 'undefined') {
      let released = false
      navigator.locks.request(
        'imba-launcher-window',
        { ifAvailable: true },
        (lock) => {
          if (!lock) {
            setIsDuplicate(true)
            return
          }
          // Держим лок пока вкладка открыта
          return new Promise((resolve) => {
            window.addEventListener('beforeunload', () => { released = true; resolve(undefined) })
          })
        },
      )
      return
    }

    // Вариант Б: BroadcastChannel fallback
    const ch = new BroadcastChannel('imba-launcher')
    ch.postMessage('ping')
    ch.onmessage = (e) => {
      if (e.data === 'ping') {
        ch.postMessage('pong')
      }
      if (e.data === 'pong') {
        setIsDuplicate(true)
      }
    }
    return () => ch.close()
  }, [])

  return isDuplicate
}
```

**Файл:** `components/duplicate-window-screen.tsx` (НОВЫЙ файл)

Полноэкранный блок-экран (аналог attract-mode по структуре):
- Иконка предупреждения
- Заголовок: `auth.duplicateWindow` = «Лаунчер уже открыт»
- Тело: `auth.duplicateWindowBody` = «Этот лаунчер уже открыт в другом окне. Закройте то окно, чтобы продолжить здесь — или переключитесь в него.»
- **Авто-перехват:** слушает BroadcastChannel / Web Locks: когда первое окно закрылось — убирает экран (устанавливает `isDuplicate = false`) и продолжает работу

**Файл:** `components/app-shell.tsx`

```tsx
const isDuplicate = useSingleWindow()
if (isDuplicate) return <DuplicateWindowScreen />
```

---

### Шаг 6 — i18n: добавить ключи в EN, RU, LT

**Файл:** `lib/i18n/dictionaries/en.ts` (и `ru.ts`, `lt.ts`)

```typescript
// В секцию auth:
activeElsewhere: 'Session active',
activeElsewhereHi: 'on {machine}',
activeElsewhereBody: 'Your session is currently active on {machine}. Transfer it to this PC?',
activeElsewherePending: 'Waiting for the shift admin to approve the transfer…',
activeElsewhereMockApprove: 'Approve as admin',  // dev only, не переводить
transferHere: 'Transfer here',
// В секцию auth (или common):
duplicateWindow: 'Launcher already open',
duplicateWindowBody: 'This launcher is already open in another window on this PC. Close that window to continue here — or switch to it.',
```

---

### Шаг 7 — Дев-кит: ручка для сидирования «DemoPlayer на другой машине»

**Файл:** `components/dev-kit/bus-console.tsx`

В массив `GROUPS`, в существующую группу `'time'` (или новую группу `'session-conflict'`):

```typescript
{
  id: 'session-conflict',
  title: 'Session conflict (C1.12)',
  note: 'Seeds DemoPlayer live session on another machine so the activeElsewhere panel appears on next sign-in.',
  actions: [
    {
      label: 'Seed DemoPlayer on PC-05',
      run: () => {
        // Находим machine != currentMachineId, ставим живую сессию DemoPlayer
        const target = db.machines.find((m) => m.id !== db.currentMachineId && m.status === 'free')
        if (!target) return null
        const existing = db.sessions.find((s) => s.userId === DEMO_PLAYER_ID && s.state !== 'ended')
        if (existing) return null
        const sess: Session = { id: newId('sess'), userId: DEMO_PLAYER_ID, guestId: null,
          machineId: target.id, billingMode: 'prepaid', state: 'active',
          startedAt: db.now, endedAt: null, secondsGranted: 7200, secondsUsed: 600,
          pausedSeconds: 0, debtSeconds: 0, closedBy: null }
        db.sessions.push(sess)
        target.status = 'occupied'
        commit()
        return sess
      },
      tone: 'secondary',
    },
    {
      label: 'Clear DemoPlayer elsewhere',
      run: () => {
        // Убрать все внешние сессии DemoPlayer
        db.sessions.filter((s) => s.userId === DEMO_PLAYER_ID && s.machineId !== db.currentMachineId)
          .forEach((s) => { s.state = 'ended'; s.endedAt = db.now; s.closedBy = 'staff' })
        db.machines.forEach((m) => {
          if (m.id !== db.currentMachineId && m.status === 'occupied') {
            const live = getLiveSession(m.id)
            if (!live) m.status = 'free'
          }
        })
        commit()
      },
      tone: 'danger',
    },
  ],
}
```

`DEMO_PLAYER_ID` — найти константу идентификатора DemoPlayer в `lib/mock/db.ts` (поиск: `DemoPlayer`).

---

### Шаг 8 — PLAN.md: закрыть задачу

**Файл:** `docs/PLAN.md`, строка 485:

Поменять `- [ ]` на `- [x]` и дописать блок «Сделано» + «Проверка» в стиле предыдущих задач.

---

## Порядок реализации

1. `lib/mock/api/client.ts` — добавить `'activeElsewhere'` в `ApiErrorCode`
2. `lib/mock/db.ts` — добавить `transferRequests: TransferRequest[]` (инициализация пустым массивом)
3. `lib/mock/api/session.ts` — расширить `openSession` (проверка) + добавить `requestTransfer` / `approveTransfer`
4. `lib/mock/api.ts` (barrel) — экспортировать новые функции и тип `TransferRequest`
5. `lib/seat.ts` — расширить тип `SeatClaim` третьей веткой, поймать `'activeElsewhere'` в `claimSeat`
6. `lib/i18n/dictionaries/en.ts` + `ru.ts` + `lt.ts` — добавить ключи
7. `components/auth/active-elsewhere.tsx` — новый компонент (панель + `TransferPending`)
8. `components/lock-screen.tsx` — добавить состояние `activeElsewhere`, подключить компонент
9. `hooks/use-single-window.ts` — новый хук
10. `components/duplicate-window-screen.tsx` — новый компонент блок-экрана
11. `components/app-shell.tsx` — подключить хук и блок-экран
12. `components/dev-kit/bus-console.tsx` — ручка для сидирования
13. `docs/PLAN.md` — закрыть чекбокс C1.12

---

## Ключевые инварианты (не нарушать)

- **C2.8 — отдельно.** `session.moved` уже есть в каталоге событий. C1.12 его *публикует* (через `approveTransfer` → `admin.moveSession`). C2.8 его *слушает* (оверлей «Твоя сессия перенесена на PC-24»). Оба используют один и тот же тип события — это правильно.
- **Дублирующее окно не может войти в сессию.** `useSingleWindow` монтируется в `app-shell`, до рендера lock-screen.
- **Mock-кнопка «Одобрить как администратор» — только под `DEV_SHORTCUTS`.** Принцип тот же, что у QR-диалога: она играет роль телефона/админа изнутри диалога, а не из внешнего маршрута, чтобы не размонтировать компонент с живым состоянием.
- **`claimSeat` при `activeElsewhere` ведёт себя как `conflict`**: не пускает, называет машину. После одобрения переноса — повторный `claimSeat` (теперь adoption, сессия уже на текущей машине).
- **Автоперехват второго окна** происходит без кнопки: как только первое окно закрывается, `isDuplicate` становится `false` и блок-экран убирается.

---

## Как проверить

1. Открыть дев-кит (`/dev/kit` или `/dev/bus`), нажать «Seed DemoPlayer on PC-05»
2. Вернуться на lock-screen, войти как DemoPlayer (пароль `demo`)
3. Должна появиться карточка «Сессия активна на PC #05» с кнопками «Перенести сюда» и «Отмена»
4. Нажать «Перенести сюда» → появляется «Ожидаем ответа администратора…»
5. Нажать mock-кнопку «Одобрить как администратор» (dev-only)
6. На шине приходит `session.moved`, панель закрывается, игрок входит в лаунчер
7. Открыть второе окно браузера с тем же URL → блок-экран «Лаунчер уже открыт»
8. Закрыть первое окно → второе тихо оживает
9. `tsc --noEmit` чистый, консоль без ошибок
