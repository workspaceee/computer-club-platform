(() => {
  // Deterministic frame for the F9 before/after comparison (temporary harness).
  const root = document.documentElement
  root.dataset.reduceMotion = 'true'
  const s = document.createElement('style')
  s.textContent =
    '*,*::before,*::after{animation:none !important;animation-play-state:paused !important;' +
    'transition:none !important;caret-color:transparent !important}'
  document.head.appendChild(s)
  document.querySelectorAll('*').forEach((el) => {
    el.getAnimations?.().forEach((a) => {
      a.currentTime = 0
      a.pause()
    })
  })
  document.getAnimations?.().forEach((a) => {
    a.currentTime = 0
    a.pause()
  })
  // Freeze wall-clock readouts so the minute rolling over is not read as a diff.
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
    } else if (/^\s*\d+\s*ms\s*$/.test(t)) {
      n.nodeValue = '4 ms'
      c++
    }
  }
  return 'frozen, normalized ' + c
})()
