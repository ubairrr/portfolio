/* ============================================================================
 * smoother.js — Central GSAP integration for the portfolio
 * ----------------------------------------------------------------------------
 * ScrollSmoother : inertial smoothed scrolling + data-speed / data-lag
 *                  parallax. Page content lives inside
 *                  #smooth-wrapper > #smooth-content; fixed chrome (rails,
 *                  grain, waves, cursor preview) stays OUTSIDE so it is not
 *                  transformed by the smoother.
 * ScrollTrigger  : all scroll-reactive behaviour, driven by the same smoothed
 *                  scroller so nothing lags behind the smoothing:
 *                    • ScrollTrigger.batch   — staggered section reveals
 *                    • onUpdate              — top progress bar
 *                    • onToggle              — nav-rail active spy
 *                    • once                  — animated stat counters
 *                    • gsap.matchMedia       — reduced-motion handling
 *                    • smoother.scrollTo     — smooth in-page anchor nav
 *                    • ScrollTrigger.refresh — re-measure after fonts/images
 *
 * Depends on: gsap, ScrollTrigger, ScrollSmoother (loaded before this file).
 * Degrades gracefully: if GSAP is unavailable the page scrolls natively and
 * all .reveal content stays visible (see portfolio.css).
 * ========================================================================== */

(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger || !window.ScrollSmoother) return;

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

  var root = document.documentElement;
  root.classList.add('gsap-ready');            /* CSS hands reveal state to GSAP */

  var reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isCalm = function () {
    return reducedMQ.matches || root.dataset.motion === 'calm';
  };
  var SMOOTH = 2.1;

  /* data-lag effects need a continuously-ticking smoother to resolve; on
     touch-only devices the short smoothTouch window leaves them frozen
     mid-offset (sections end up overlapping), so only the deterministic
     data-speed parallax runs there. */
  var touchOnly = window.matchMedia('(hover: none)').matches;

  /* -- 1 · ScrollSmoother ---------------------------------------------------- */
  var smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: isCalm() ? 0 : SMOOTH,
    smoothTouch: 0.2,
    effects: touchOnly ? '[data-speed]' : true,
    ignoreMobileResize: true
  });
  window.__smoother = smoother;

  /* React to an OS reduced-motion change mid-session. */
  reducedMQ.addEventListener('change', function () {
    smoother.smooth(isCalm() ? 0 : SMOOTH);
  });

  /* -- 2 · Smooth in-page anchor navigation ---------------------------------- */
  gsap.utils.toArray('a[href^="#"]').forEach(function (a) {
    var sel = a.getAttribute('href');
    if (!sel || sel.length < 2) return;
    var target = document.querySelector(sel);
    if (!target) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      smoother.scrollTo(target, !isCalm(), 'top 14%');
    });
  });

  /* -- 3 · Top scroll-progress bar (whole page) ------------------------------ */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var barFill = bar.firstChild;
  gsap.set(barFill, { scaleX: 0, transformOrigin: 'left center' });
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: function (self) { gsap.set(barFill, { scaleX: self.progress }); }
  });

  /* -- 4 · Stat counters — count up once when scrolled into view ------------- */
  gsap.utils.toArray('.num[data-count]').forEach(function (el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var node = el.firstChild;                   /* the "0" text node */
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: function () {
        if (reducedMQ.matches) { node.textContent = String(target); return; }
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: function () { node.textContent = String(Math.round(obj.v)); }
        });
      }
    });
  });

  /* -- 5 · Nav-rail active spy ----------------------------------------------- */
  var navLinks = gsap.utils.toArray('.rail-right a');
  navLinks.forEach(function (a) {
    var sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 48%',
      end: 'bottom 48%',
      onToggle: function (self) {
        if (self.isActive) {
          navLinks.forEach(function (l) { l.classList.toggle('active', l === a); });
        }
      }
    });
  });

  /* -- 6 · Section reveals (gated by motion preference) ---------------------- */
  var mm = gsap.matchMedia();

  /* Elements that also carry a parallax effect can't take a transform reveal
     (the effect owns their transform), so they fade in on opacity only;
     everything else rises + fades. */
  var ySel  = '.reveal:not([data-speed]):not([data-lag])';
  var opSel = '.reveal[data-speed], .reveal[data-lag]';

  mm.add('(prefers-reduced-motion: reduce)', function () {
    gsap.set('.reveal', { autoAlpha: 1, y: 0 });
  });

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    var yEls  = gsap.utils.toArray(ySel);
    var opEls = gsap.utils.toArray(opSel);
    var dist  = root.dataset.motion === 'calm' ? 18 : 46;

    gsap.set(yEls,  { autoAlpha: 0, y: dist });
    gsap.set(opEls, { autoAlpha: 0 });

    var bYel = ScrollTrigger.batch(yEls, {
      start: 'top 90%',
      onEnter: function (els) {
        gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true });
      }
    });
    var bOp = ScrollTrigger.batch(opEls, {
      start: 'top 90%',
      onEnter: function (els) {
        gsap.to(els, { autoAlpha: 1, duration: 1.1, ease: 'power2.out', stagger: 0.08, overwrite: true });
      }
    });

    return function () {
      bYel.forEach(function (t) { t.kill(); });
      bOp.forEach(function (t) { t.kill(); });
    };
  });

  /* -- 7 · Re-measure after fonts / images / window load --------------------- */
  var refresh = function () { ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
  setTimeout(refresh, 1200);
})();
