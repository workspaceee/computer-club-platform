# F9 — что осталось доделать (передача в следующий чат)

Рабочее дерево чистое, `git checkout` откатов не осталось. HEAD: `2618a23`.

## 1. Текущее состояние гейтов

| Гейт | Статус |
| --- | --- |
| `npx tsc --noEmit` | ✅ чисто |
| `pnpm design:verify` | ❌ **36 проблем**: R1 — 9, R2 — 26, R3 — 1 |
| инлайновые градиенты затемнения в `components/` | ❌ 9 (R1) |
| `bg-black/NN` в `components/` | ❌ 25 строк / 26 находок (R2) |
| попиксельное сравнение before/after (1920×1080 и 1366×768) | ⚠️ снималось на промежуточном коде, требует перезамера после правок |

Полный список нарушений: `pnpm design:verify`. Спецификация правил и разрешённые
исключения — `docs/PLAN.md §0.4.1`, шкала глубины — §3.3, утилиты вейла — §3,
правило акцентов T1 — §4.2.

## 2. Что именно нужно сделать

### F9.1 — R1: инлайновые вейлы → утилиты в `globals.css` (9 шт.)
- `components/attract-mode.tsx:157,164` — `rgba(3,4,8)`
- `components/game-cover.tsx:95` — `from-black/85`, `via-black/45`
- `components/launcher/home-view.tsx:182` — `from-black/90`, `via-black/25`
- `components/launcher/promo-strip.tsx:122` — `rgba(10,10,12)`
- `components/lock-screen.tsx:269,276` — `rgba(5,6,10)`

Каждый переносится в `app/globals.css` как именованная утилита вейла, имя — по
потребителю (например `.veil-cover-h`, `.veil-promo-v`). Значения переносятся
**один-в-один**, чтобы кадр не изменился.

### F9.2 — R2: `bg-black/NN` → роли шкалы глубины (26 шт.)
Файлы: `attract-mode.tsx` (145, 152, 259, 316), `launcher/cart-drawer.tsx` (84),
`launcher/checkout-modal.tsx` (128, 229), `launcher/game-launch-modal.tsx`
(159×2, 210), `launcher/games-view.tsx` (253), `launcher/home-view.tsx` (355),
`launcher/in-game-strip.tsx` (97), `lock-screen.tsx` (416, 596, 745×2),
`session-manager.tsx` (101), `ui/drawer.tsx` (70), `ui/field.tsx` (56, 57),
`ui/overlay.tsx` (107), `ui/segmented.tsx` (63) и остальные из вывода verify.

Внутри интерфейса — роль `well / scrim / pill` (§3.3), поверх медиа — утилита
вейла (§3). Токены подбираются так, чтобы итоговый RGB совпадал с текущим.

### F9.3 — R3: лишние T1-акценты
`components/lock-screen.tsx` — 3 × T1 на строках 365, 690, 712. На кадр
допустим один видимый T1: лишние снизить до `-static` или до T3 (§4.2).

### F9.4 — единственное сознательное визуальное изменение
Это единственное место, где кадр имеет право отличаться от эталона. Всё
остальное (F9.1–F9.3) — строго нулевая визуальная разница. Формулировку
результата F9.4 взять из `docs/PLAN.md` (раздел F9) и зафиксировать в отчёте:
какой пиксельный дельта-регион ожидается и почему.

## 3. Как проверять пиксели (харнесс уже готов)

`public/f9-freeze.js` подключается через `eval` и глушит анимации/рандом:
искры, `attract`-таймеры, `Math.random`, `requestAnimationFrame`-циклы —
без этого кадры шумят и сравнение бессмысленно.

Снимок одного состояния:

```bash
agent-browser open --color-scheme dark "http://localhost:3000/" \
  && agent-browser set viewport 1920 1080 \
  && agent-browser wait --load networkidle && agent-browser wait 4000 \
  && agent-browser eval "(()=>{const x=new XMLHttpRequest();x.open('GET','/f9-freeze.js',false);x.send();return eval(x.responseText)})()" \
  && agent-browser screenshot /tmp/agent-browser/after-login-1920.png
```

- Экран «после логина»: `wait 4000` после `networkidle`.
- Экран attract/idle: вместо этого `wait 31000 && wait 3500`
  (`hooks/use-idle.ts` — порог 30 с).
- Два эталонных вьюпорта: `1920 1080` и `1366 768`.
- «До» снимается на `git checkout <pre-F9-sha> -- app components lib hooks`,
  потом обязательно `git checkout HEAD -- app components lib hooks`.
- Сравнение: `node /tmp/agent-browser/diff.mjs <before.png> <after.png>`
  (скрипт живёт в браузерной песочнице в `/tmp`, при новой сессии его нужно
  пересоздать — чистый PNG-декодер на `zlib`, без зависимостей).
- **Важно:** сначала снять «twin» — два кадра одного и того же состояния — и
  измерить собственный шум харнесса. Дельта between-версий считается значимой
  только если она заметно выше шума twin.

Итого 8 кадров: {before, after} × {after-login, attract} × {1920, 1366}.

## 4. Порядок работы

1. F9.1 → verify (R1 должно стать 0) → снять кадры → дельта в пределах шума.
2. F9.2 → verify (R2 → 0) → кадры.
3. F9.3 → verify (R3 → 0) → кадры.
4. F9.4 — осознанное изменение, зафиксировать ожидаемую дельту.
5. Финал: `pnpm design:verify` зелёный, `npx tsc --noEmit` чистый,
   R1/R2 в `components/` = 0, 4 пары кадров сравнены и объяснены.
6. Решить судьбу `public/f9-freeze.js` — он попал в коммит `2618a23`.
   Либо оставить как часть харнесса (рядом с `public/__f9`), либо удалить
   после закрытия F9.
