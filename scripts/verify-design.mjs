/**
 * F9.7b — enforcement for the three machine-checkable rules of the design
 * checklist (`docs/PLAN.md` §0.4, spelled out for a script in §0.4.1).
 *
 * The premise, confirmed twice already: a rule that lives only in a checklist is
 * not followed by the thirtieth screen. F6.7 found four controls that had
 * "forgotten" `focus-visible`; F7.6 is why the icon vocabulary still holds. So
 * the three rules that can be checked mechanically are checked here, and the
 * rest of §0.4 stays a matter for `/dev/kit` and review.
 *
 *   node scripts/verify-design.mjs   (`pnpm design:verify`, part of `prebuild`)
 *
 * R1 — no inline darkening gradient in JSX. Black over media is a named veil in
 *      `globals.css`, never a gradient picked at the point of use.
 * R2 — no `bg-black` in JSX, opaque or fractional. Interface black is a rung of
 *      the depth scale (§3.3); media black is a veil (§3).
 * R3 — one T1 neon per file. The travelling ring is the screen's single main
 *      action (§4.2); a second one is not an accent any more.
 *
 * What it does NOT do: judge taste. Colour is not checked (a red halo is an
 * accent, not a veil), shadows are not checked (`rgba(0,0,0,·)` in a
 * `box-shadow` is black but neither a fill nor a gradient, and the product has
 * no shadow scale to point at yet — see §0.4.1).
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

/**
 * Same scan surface as `verify-icons.mjs`. `app/globals.css` is not scanned at
 * all — it is the one place where black and gradients are supposed to live, and
 * the whole point of both rules is to push them there.
 */
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks']

/**
 * The two exceptions, written here rather than inferred from the code — §0.4.1
 * requires that a reader can tell an exception from a hole.
 *
 * `components/dev-kit/**` is the showcase: F9.6 exists precisely so T1 and T2
 * can be compared in one frame and veils can be measured over a real
 * photograph. A script that fails on the showcase forces a choice between
 * deleting the showcase and disabling the script.
 *
 * `attract-mode.tsx` carries two T1 rings in the tree because the login card
 * lives in the same tree at `opacity: 0`; §4.2 budgets *visible* rings, and the
 * idle screen shows exactly one.
 */
const EXCEPTIONS = {
  // Rules waived for the whole showcase directory.
  dir: {
    prefix: 'components/dev-kit/',
    rules: ['R1', 'R3'],
    why: 'витрина материалов и тиров (F9.6) обязана показывать их рядом',
  },
  // Per-file waivers: file → { rule → reason }.
  files: {
    'components/attract-mode.tsx': {
      R3: 'карточка логина живёт в том же дереве с opacity: 0 — видимое кольцо одно (§4.2)',
    },
  },
}

/** Is `rule` waived for `file`? */
function waived(file, rule) {
  if (file.startsWith(EXCEPTIONS.dir.prefix) && EXCEPTIONS.dir.rules.includes(rule)) return true
  return Boolean(EXCEPTIONS.files[file]?.[rule])
}

/**
 * Blank out comments, keeping every byte of offset so reported line numbers stay
 * true. All three rules are about *code*: a class name cannot live in a comment,
 * and the comments that matter most here are the ones explaining why the
 * forbidden thing is forbidden — `// veil-base, not bg-black` must not be the
 * violation it documents. Same reasoning §0.4.1 gives R3 for `.neon-ring` in a
 * caption, applied to all three.
 *
 * The replacement keeps newlines and swaps everything else for spaces, so the
 * scanners below need no offset bookkeeping of their own.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))
}

function sourceFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', ...SCAN_DIRS],
    { encoding: 'utf8' },
  )
  return out.split('\n').filter((f) => /\.(tsx?|jsx?)$/.test(f))
}

const errors = []
const files = sourceFiles()
/** Per-rule counters, so a green run reports what it actually looked at. */
const scanned = { R1: 0, R2: 0, R3: 0 }

/* ------------------------------------------------------------------ */
/*  R1 — inline darkening gradient                                     */
/* ------------------------------------------------------------------ */

/**
 * A stop is "darkening" when all three channels are near zero. 24 is the
 * threshold from §0.4.1: `rgba(10,10,12,·)` — how the promo veil used to be
 * written — has to be caught, while `rgba(229,53,43,·)` (the red halo) and
 * `rgba(255,255,255,·)` (the scanline texture, the slider track) must not be.
 */
const DARK_CHANNEL_MAX = 24

/** `rgb(0 0 0 / .5)`, `rgba(10,10,12,0.96)`, `rgb(5 6 10/0.55)` — any spelling. */
const RGB_FUNC = /rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/g

/** Does this gradient string contain a near-black stop? */
function darkStops(gradient) {
  const hits = []
  // `#000`, `#000000`, `#0a0a0c` — hex, short and long.
  for (const m of gradient.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const hex = m[1]
    const [r, g, b] =
      hex.length === 3
        ? [...hex].map((c) => parseInt(c + c, 16))
        : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    if (r <= DARK_CHANNEL_MAX && g <= DARK_CHANNEL_MAX && b <= DARK_CHANNEL_MAX) hits.push(m[0])
  }
  for (const m of gradient.matchAll(RGB_FUNC)) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number)
    if (r <= DARK_CHANNEL_MAX && g <= DARK_CHANNEL_MAX && b <= DARK_CHANNEL_MAX) hits.push(m[0] + ')')
  }
  return hits
}

/**
 * Pull out every `linear-gradient(...)` / `radial-gradient(...)` /
 * `repeating-linear-gradient(...)` with balanced parens, so nested `rgb(...)`
 * and `var(...)` stay inside the slice a naive regex would cut in half.
 */
function gradients(src) {
  const out = []
  const opener = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/g
  for (let m; (m = opener.exec(src)); ) {
    let depth = 0
    let i = m.index + m[0].length - 1
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++
      else if (src[i] === ')' && --depth === 0) break
    }
    const text = src.slice(m.index, i + 1)
    out.push({ text, line: src.slice(0, m.index).split('\n').length })
    opener.lastIndex = i + 1
  }
  return out
}

/** The Tailwind spelling of the same thing: `from-black/85 via-black/45`. */
const TW_BLACK_STOP = /\b(?:from|via|to)-black(?:\/\d+)?\b/g

const R1_FIX =
  'перенеси в globals.css как утилиту вейла и назови её по потребителю (§3)'

for (const file of files) {
  if (waived(file, 'R1')) continue
  scanned.R1++
  const src = stripComments(readFileSync(file, 'utf8'))

  for (const { text, line } of gradients(src)) {
    const hits = darkStops(text)
    if (hits.length) {
      errors.push(
        `${file}:${line}: R1 — инлайновый градиент затемнения (${[...new Set(hits)].join(', ')}). ${R1_FIX}.`,
      )
    }
  }

  for (const m of src.matchAll(TW_BLACK_STOP)) {
    const line = src.slice(0, m.index).split('\n').length
    errors.push(`${file}:${line}: R1 — ${m[0]}: тот же вейл в форме Tailwind. ${R1_FIX}.`)
  }
}

/* ------------------------------------------------------------------ */
/*  R2 — bg-black outside globals.css                                  */
/* ------------------------------------------------------------------ */

/**
 * Both the fractional and the opaque form. The opaque one used to floor the
 * media on the two reference screens, and it is exactly the same hole: a black
 * chosen in JSX. `-black/NN` gradient stops are R1's business, so the pattern
 * requires the `bg-` prefix.
 */
const BG_BLACK = /\bbg-black(?:\/(?:\d+|\[[^\]]+\]))?\b/g

for (const file of files) {
  if (waived(file, 'R2')) continue
  scanned.R2++
  const src = stripComments(readFileSync(file, 'utf8'))
  for (const m of src.matchAll(BG_BLACK)) {
    const line = src.slice(0, m.index).split('\n').length
    errors.push(
      `${file}:${line}: R2 — ${m[0]}: чёрный выбран в JSX. Внутри интерфейса возьми роль шкалы глубины (well / scrim / pill, §3.3), поверх медиа — утилиту вейла (§3).`,
    )
  }
}

/* ------------------------------------------------------------------ */
/*  R3 — one T1 neon per file                                         */
/* ------------------------------------------------------------------ */

/**
 * T1 is `neon-ring` / `neon-edge` *without* the `-static` suffix, and only in
 * class position. A match preceded by a dot (`.neon-ring` in a caption or in
 * these comments) is a name, not a call — the showcase captions the tiers by
 * name and would otherwise trip a rule it is exempt from anyway.
 */
const T1 = /(?<![.\w-])neon-(?:ring|edge)\b(?!-static)/g

for (const file of files) {
  if (waived(file, 'R3')) continue
  scanned.R3++
  const src = stripComments(readFileSync(file, 'utf8'))
  const hits = [...src.matchAll(T1)].map((m) => src.slice(0, m.index).split('\n').length)
  if (hits.length > 1) {
    errors.push(
      `${file}: R3 — ${hits.length} × T1 (строки ${hits.join(', ')}). T1 — один видимый на кадр (§4.2), снизь лишний до -static или до T3.`,
    )
  }
}

/* ------------------------------------------------------------------ */

if (errors.length) {
  console.error(`\ndesign:verify — ${errors.length} проблем(ы):\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error(
    '\nСпецификация правил и список разрешённых исключений — docs/PLAN.md §0.4.1.\n',
  )
  process.exit(1)
}

const waivedCount =
  files.filter((f) => f.startsWith(EXCEPTIONS.dir.prefix)).length +
  Object.keys(EXCEPTIONS.files).length

console.log(
  `design:verify — ок: R1 ${scanned.R1} / R2 ${scanned.R2} / R3 ${scanned.R3} файлов проверено, ` +
    `${waivedCount} записанных исключений (§0.4.1).`,
)
