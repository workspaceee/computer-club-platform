/**
 * F7.6 — страж словаря иконок.
 *
 * Ревизия иконок держится не на договорённости, а на этой проверке. Она падает
 * в четырёх случаях, каждый из которых означает «одна иконка = два значения»
 * или «значение мимо словаря»:
 *
 *   1. `lucide-react` импортирован где-то кроме `lib/icons.ts`;
 *   2. два смысла указывают на один и тот же глиф — в том числе через алиасы
 *      самой библиотеки (`XCircle` и `CircleX` — один компонент);
 *   3. смысл объявлен, но нигде не используется (мёртвая запись копит дубли);
 *   4. в коде есть `icons.<чего-нет-в-словаре>`.
 *
 * Запуск: `pnpm icons:verify` (входит в `prebuild`).
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const REGISTRY = 'lib/icons.ts'
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks']
const errors = []

/** Файлы проекта, которые вообще могут содержать иконки. */
function sourceFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', ...SCAN_DIRS],
    { encoding: 'utf8' },
  )
  return out
    .split('\n')
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
}

const files = sourceFiles()

// ── 1. lucide-react только в словаре ────────────────────────────────────────
const LUCIDE_IMPORT = /(?:^|\n)\s*(?:import[\s\S]*?|export[\s\S]*?)from\s*['"]lucide-react['"]/g
for (const file of files) {
  if (file === REGISTRY) continue
  const src = readFileSync(file, 'utf8')
  if (src.match(LUCIDE_IMPORT)) {
    errors.push(
      `${file}: импортирует lucide-react напрямую. Глифы живут только в ${REGISTRY} — добавь смысл там и используй icons.<смысл>.`,
    )
  }
}

// ── 2. один глиф — один смысл ───────────────────────────────────────────────
const registrySrc = readFileSync(REGISTRY, 'utf8')
const tableStart = registrySrc.indexOf('export const icons')
if (tableStart < 0) {
  errors.push(`${REGISTRY}: не найдена таблица "export const icons".`)
}
const table = registrySrc.slice(tableStart)
const entries = [...table.matchAll(/^ {2}(\w+): (\w+),/gm)].map((m) => ({
  meaning: m[1],
  glyph: m[2],
}))

if (entries.length === 0) {
  errors.push(`${REGISTRY}: таблица смыслов пуста или её формат изменился.`)
}

const lucide = require('lucide-react')
const byComponent = new Map()
for (const { meaning, glyph } of entries) {
  const component = lucide[glyph]
  if (!component) {
    errors.push(`${REGISTRY}: глиф ${glyph} (смысл "${meaning}") не экспортируется lucide-react.`)
    continue
  }
  // Сравниваем сам компонент, а не имя: так ловятся алиасы библиотеки.
  const seen = byComponent.get(component)
  if (seen) {
    errors.push(
      `${REGISTRY}: смыслы "${seen.meaning}" (${seen.glyph}) и "${meaning}" (${glyph}) — это один и тот же глиф. Один рисунок не может значить два разных.`,
    )
    continue
  }
  byComponent.set(component, { meaning, glyph })
}

// ── 3 и 4. словарь и код совпадают ──────────────────────────────────────────
const declared = new Set(entries.map((e) => e.meaning))
const used = new Map()
for (const file of files) {
  if (file === REGISTRY) continue
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/\bicons\.(\w+)/g)) {
    if (!used.has(m[1])) used.set(m[1], file)
  }
}

for (const [meaning, file] of used) {
  if (!declared.has(meaning)) {
    errors.push(`${file}: icons.${meaning} нет в словаре ${REGISTRY}.`)
  }
}
for (const meaning of declared) {
  if (!used.has(meaning)) {
    errors.push(
      `${REGISTRY}: смысл "${meaning}" не используется. Удали его — неиспользуемые записи со временем становятся дублями.`,
    )
  }
}

if (errors.length) {
  console.error(`\nicons:verify — ${errors.length} проблем(ы):\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error('')
  process.exit(1)
}

console.log(
  `icons:verify — ок: ${entries.length} смыслов, ${byComponent.size} уникальных глифов, ${files.length} файлов проверено.`,
)
