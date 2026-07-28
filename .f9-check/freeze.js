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
    '*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}' +
    /* The dev-server badge is the only thing in the bottom band of either
     * capture, and it is NOT product: it renders inside a `nextjs-portal`
     * custom element with its own shadow tree, so the rule above never
     * reaches its internals and its spinner/route pill differ between two
     * runs of the same code. Measured on the first valid noise pair: the
     * entire bottom band of the diff was this badge and nothing else. */
    'nextjs-portal,[data-nextjs-dev-tools-button],#next-logo{display:none !important}'
  document.head.appendChild(s)
  document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
  // Belt and braces for anything script-driven or still mid-flight.
  document.getAnimations?.().forEach((a) => {
    try {
      a.currentTime = 0
      a.pause()
    } catch {}
  })
  /* Stop the JS-driven clocks, then pin the idle screen's Ken Burns layer.
   *
   * The zoom is a Framer Motion `scale` (1 -> 1.12 over 11s) applied as an
   * INLINE transform driven by rAF, so neither `animation: none` nor
   * `getAnimations()` above can reach it: CSS never owned the property. The
   * idle capture lands ~4s into that ramp, so a few ms of jitter between two
   * runs rescales the full-bleed wallpaper and repaints ~38% of the frame —
   * enough noise to bury the block entirely.
   *
   * Assigning `style.transform = 'none'` on its own is NOT enough: Framer
   * rewrites the property on its next frame, so the pin is gone before the
   * screenshot (measured: still `scale(1.05475)` at capture, pair still
   * differing 23%). Replacing the layer with a detached clone does hold, but
   * React later tries to unmount the node it no longer owns and the run dies
   * on `removeChild ... is not a child of this node` in AnimatePresence.
   *
   * So the driver is stopped instead of the DOM being rewritten: rAF becomes a
   * no-op (Framer's loop cannot schedule another frame) and the pending timers
   * are cleared (the 9s slide rotation, the clock tick, the 2.2s ping re-roll),
   * which leaves React's tree intact and owned by React. After that the inline
   * transform can be set once and it stays set. */
  window.requestAnimationFrame = () => 0
  window.cancelAnimationFrame = () => {}
  /* No registry of live timer ids exists, so sweep every id up to the highest
   * one in existence. The ceiling is asked for rather than guessed: ids are
   * handed out monotonically, so one fresh `setTimeout` is an upper bound on
   * every live id. The previous fixed `10000` ceiling silently missed the
   * 9s slide rotation on a page that had been open long enough to burn
   * through that many ids (the idle screen needs 30s of ids just to appear),
   * and a surviving rotation swaps the whole wallpaper between two captures —
   * measured as a 52% frame difference on a pair that should be identical. */
  const ceiling = Number(setTimeout(() => {}, 0)) || 0
  for (let id = ceiling; id > 0; id--) {
    clearInterval(id)
    clearTimeout(id)
  }
  window.setInterval = () => 0
  window.setTimeout = () => 0

  /* Scoped to the media layer so a transform regression anywhere else in the
   * tree still shows up as a diff. Forcing opacity also collapses a crossfade
   * (two stacked slides) down to the incoming frame. */
  const media = [...document.querySelectorAll('div.absolute.inset-0')].filter((el) =>
    /scale|matrix|translate/.test(el.style.transform || ''),
  )
  media.forEach((el, i) => {
    el.style.transform = 'none'
    el.style.opacity = i === media.length - 1 ? '1' : '0'
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
  return 'frozen, normalized ' + c + ' readout(s), pinned ' + media.length + ' media layer(s)'
})()
