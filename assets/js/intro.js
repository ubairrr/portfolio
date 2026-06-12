/* Zoom-parallax intro — fixed overlay driven by VIRTUAL scroll.
   The intro takes no document space: the real page waits at scroll 0
   underneath (hidden until handoff), so finishing the intro never shifts
   layout or scroll position — one-way with zero snapping by construction.

   While active: page scrolling is paused (ScrollSmoother.paused / overflow
   lock) and wheel / touch / key input advances a virtual progress value
   with its own smoothing lag. At the end the overlay fades out and real
   scrolling unlocks. */

(function () {
  'use strict';

  const intro = document.getElementById('intro');
  if (!intro) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const content = intro.querySelector('.intro-content');
  const hint = intro.querySelector('.intro-hint');

  /* layers scale at different rates, like the scale4/scale6/scale9 transforms */
  const layers = [
    { el: intro.querySelector('.intro-echo'), f: 9, fade: 0 },
    { el: intro.querySelector('.intro-name'), f: 6, fade: 0 },
    { el: intro.querySelector('.intro-label'), f: 3, fade: 2.5 }
  ].filter((l) => l.el);

  let loadedFired = false;
  function fireLoaded() {
    if (loadedFired) return;
    loadedFired = true;
    document.body.classList.add('loaded');
  }

  const isOff = () => document.documentElement.dataset.intro === 'off';

  /* ---------- virtual scroll state ---------- */
  const RANGE = () => window.innerHeight * 1.6;  /* same travel as old 260vh */
  let target = 0;       /* where input wants to be   */
  let current = 0;      /* smoothed position          */
  let done = false;
  let tickerOn = false;

  function clampTarget() {
    target = Math.max(0, Math.min(target, RANGE() * 1.02));
  }

  /* ---------- scroll locking ---------- */
  function lockScroll() {
    if (window.__smoother) window.__smoother.paused(true);
    else document.documentElement.style.overflow = 'hidden';
  }
  function unlockScroll() {
    if (window.__smoother) window.__smoother.paused(false);
    else document.documentElement.style.overflow = '';
  }

  /* ---------- input ---------- */
  let touchY = null;
  function onWheel(e) {
    if (done) return;
    e.preventDefault();
    target += e.deltaY;
    clampTarget();
  }
  function onTouchStart(e) {
    if (e.touches.length) touchY = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (done || touchY === null || !e.touches.length) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    target += (touchY - y) * 1.8;
    touchY = y;
    clampTarget();
  }
  function onKey(e) {
    if (done) return;
    const h = window.innerHeight;
    const steps = {
      'ArrowDown': h * 0.35, 'PageDown': h * 0.9, ' ': h * 0.9,
      'ArrowUp': -h * 0.35, 'PageUp': -h * 0.9,
      'End': RANGE(), 'Home': -RANGE()
    };
    if (e.key in steps) {
      e.preventDefault();
      target += steps[e.key];
      clampTarget();
    }
  }

  function addListeners() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
  }
  function removeListeners() {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown', onKey);
  }

  /* ---------- finish ---------- */
  function finish(instant) {
    if (done) return;
    done = true;
    fireLoaded();
    removeListeners();
    unlockScroll();
    if (instant) {
      intro.style.display = 'none';
    } else {
      intro.classList.add('done');                      /* CSS fade-out */
      setTimeout(() => { intro.style.display = 'none'; }, 700);
    }
    if (tickerOn && window.gsap) { gsap.ticker.remove(tick); tickerOn = false; }
  }

  /* ---------- per-frame update ---------- */
  function tick() {
    if (done) return;
    if (isOff()) { finish(true); return; }

    current += (target - current) * 0.085;   /* smoothing lag */
    const p = Math.min(1, Math.max(0, current / RANGE()));

    if (p > 0.7) fireLoaded();               /* page fades in underneath */

    const ep = Math.pow(p, 1.4);             /* slow start, fast finish */
    for (const l of layers) {
      l.el.style.transform = 'scale(' + (1 + (l.f - 1) * ep).toFixed(4) + ')';
      if (l.fade) l.el.style.opacity = Math.max(0, 1 - p * l.fade).toFixed(3);
    }
    content.style.opacity = p < 0.82 ? '1' : String(Math.max(0, 1 - (p - 0.82) / 0.16));
    if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 6));

    /* fully zoomed and input has reached the end → hand off */
    if (p >= 0.995 && target >= RANGE()) finish(false);
  }

  /* ---------- boot ---------- */
  if (prefersReduced || isOff()) {
    finish(true);
    return;
  }

  new MutationObserver(() => { if (isOff()) finish(true); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });

  lockScroll();
  addListeners();

  if (window.gsap) {
    gsap.ticker.add(tick);
    tickerOn = true;
  } else {
    (function loop() {
      if (done) return;
      tick();
      requestAnimationFrame(loop);
    })();
  }
})();
