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
  return 'frozen, normalized ' + c
})()
