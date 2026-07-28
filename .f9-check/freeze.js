(() => {
  /* F9 pixel-parity harness (temporary, not shipped).
   *
   * Deliberately does NOT set `data-reduce-motion`. F9.4 changed what damped
   * motion looks like — a T1 ring now freezes at the T2 angle (135deg) instead
   * of wherever it happened to be — so a harness that switches damping on
   * compares the one state the block was allowed to change and masks every
   * other difference behind it. Animations are stopped with `animation: none`
   * instead, which parks each keyframed property at its initial value in BOTH
   * trees: `--neon-angle` 0deg for T1, the declared 135deg for T2.
   */
  const s = document.createElement('style')
  s.textContent =
    '*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}'
  document.head.appendChild(s)
  // Belt and braces for anything script-driven or still mid-flight.
  document.getAnimations?.().forEach((a) => {
    try {
      a.currentTime = 0
      a.pause()
    } catch {}
  })
  /* Stop the product's own timers before touching any text.
   *
   * Normalising text alone does not hold: the clock re-renders once a second
   * (`useClock`), and React rewrites exactly the nodes whose value changed —
   * so on a minute rollover the hours node keeps the frozen `15` while the
   * minutes node is repainted with the real minute, and the pair reads `15:39`
   * against `15:40`. Observed, not theoretical: it is what the first attract
   * noise pair produced. Clearing the timers also parks the two other
   * script-driven states — the ping re-roll (2.2 s) and the slide rotation
   * (9 s) — so a capture no longer depends on how fast the screenshot follows
   * the freeze. Ids are shared between intervals and timeouts, so the sweep
   * covers both. */
  const topI = setInterval(() => {}, 1e6)
  for (let i = 1; i <= Number(topI); i++) {
    try {
      clearInterval(i)
    } catch {}
  }
  /* Same sweep for the requestAnimationFrame loop, and stub the function so
   * nothing re-queues itself afterwards. `animation: none` only governs CSS
   * keyframes; the attract screen's Ken Burns zoom is a framer-motion spring
   * driven from rAF, so it kept running through the CSS freeze and two
   * captures of the SAME build differed on ~40% of their pixels — the whole
   * backdrop, shifted by a few px of scale. */
  const topF = requestAnimationFrame(() => {})
  for (let i = 1; i <= Number(topF); i++) {
    try {
      cancelAnimationFrame(i)
    } catch {}
  }
  window.requestAnimationFrame = () => 0
  /* Whatever the motion library had already committed stays in the inline
   * style attribute after its loop dies, at whichever value it reached, so the
   * animated properties have to be normalised too. */
  let m = 0
  document.querySelectorAll('*').forEach((el) => {
    const st = el.style
    if (!st) return
    if (st.transform && st.transform !== 'none') {
      st.transform = 'none'
      m++
    }
    if (st.opacity && st.opacity !== '1') {
      st.opacity = '1'
      m++
    }
    if (st.filter && st.filter !== 'none') {
      st.filter = 'none'
      m++
    }
  })
  /* Hide the Next.js dev overlay. It is not part of either tree, it appears
   * only sometimes, and it parks a red "1 Issue" badge over the bottom-left
   * corner — which is where the promo ticker runs. In the noise pair it was
   * the single largest band (7910 px) and it would have been read as the
   * ticker having moved; the ticker underneath is pixel-identical. */
  document.querySelectorAll('nextjs-portal').forEach((el) => {
    el.style.display = 'none'
  })
  /* Freeze the live readouts. Two of them, both real diff generators:
   *   • wall-clock digits — the minute rolling over between the two captures
   *     reads as a diff in the largest type on either screen;
   *   • the idle screen's ping chip, which is `3 + random(4)` re-rolled every
   *     2.2s (`useLivePing`). Left alone it makes the chip row differ from
   *     itself, which is exactly the row F9.4 rewrote — the one place where a
   *     noise pixel would be mistaken for evidence. */
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  let big = 0
  let c = 0
  while ((n = w.nextNode())) {
    const t = n.nodeValue || ''
    const cl = (n.parentElement && n.parentElement.className && n.parentElement.className.toString()) || ''
    if (/^\s*\d{1,2}:\d{2}\s*$/.test(t)) {
      n.nodeValue = '15:40'
      c++
    } else if (/^\s*\d{1,2}\s*$/.test(t) && /text-\[4\.5rem\]/.test(cl)) {
      big++
      n.nodeValue = big % 2 ? '15' : '40'
      c++
    } else if (/^\s*\d{1,3}\s*ms\s*$/.test(t)) {
      // The login screen's twin is the literal "4 ms", so this normalizes the
      // idle screen onto the value the other screen already shows.
      n.nodeValue = '4 ms'
      c++
    }
  }
  return 'frozen: ' + c + ' texts, ' + m + ' inline styles, intervals to ' + topI + ', frames to ' + topF
})()
