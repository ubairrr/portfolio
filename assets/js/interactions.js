/* ============================================================================
 * interactions.js — Portfolio UI behaviour
 * ----------------------------------------------------------------------------
 *   • Cursor-following project preview card
 *   • Footer wordmark auto-fit
 *   • Optional live GitHub star count (see CONFIG below)
 *
 * Scroll reveals, stat counters, parallax and nav highlighting are handled in
 * smoother.js (GSAP), so they stay in sync with the smoothed scroller.
 * ========================================================================== */

(function () {
  'use strict';

  /* -------------------------------------------------------------------------
   * CONFIG
   * ENABLE_GITHUB_STARS makes ONE outbound request to api.github.com to show a
   * live aggregate star count in the footer. Set to false for a fully
   * self-contained site with zero third-party requests (the footer then shows
   * a static "@ubairrr on GitHub" link instead).
   * ----------------------------------------------------------------------- */
  var ENABLE_GITHUB_STARS = true;
  var GITHUB_USER = 'ubairrr';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motionShowy = function () {
    return document.documentElement.dataset.motion !== 'calm' && !prefersReduced;
  };

  /* ---------- cursor-following project preview ---------- */
  var prev = document.getElementById('cursorPrev');
  var prevNum = prev ? prev.querySelector('.prev-num') : null;
  var prevName = prev ? prev.querySelector('.prev-name') : null;
  var prevArt = prev ? prev.querySelector('.prev-art') : null;
  var prevImg = prev ? prev.querySelector('.prev-img') : null;

  /* Preload the (local) preview images so they are cached before hover. */
  var _preloadCache = {};
  document.querySelectorAll('.proj-row[data-img]').forEach(function (row) {
    var url = row.dataset.img;
    if (url && !_preloadCache[url]) {
      var img = new Image();
      img.src = url;
      _preloadCache[url] = img;
    }
  });

  var ARTS = [
    'linear-gradient(135deg, color-mix(in oklch, var(--accent) 70%, #000) 0%, var(--bg-deep) 75%)',
    'linear-gradient(35deg, var(--bg-deep) 20%, color-mix(in oklch, var(--accent) 55%, var(--bg)) 100%)',
    'radial-gradient(circle at 25% 20%, color-mix(in oklch, var(--accent) 60%, var(--bg)) 0%, var(--bg-deep) 70%)',
    'linear-gradient(200deg, color-mix(in oklch, var(--accent) 45%, var(--bg)) 0%, var(--bg-deep) 80%)'
  ];

  var mouseX = 0, mouseY = 0, curX = 0, curY = 0, rafId = null, hovering = false;

  function loop() {
    var k = 0.16;
    curX += (mouseX - curX) * k;
    curY += (mouseY - curY) * k;
    prev.style.left = curX + 24 + 'px';
    prev.style.top = curY - 115 + 'px';
    if (hovering || Math.abs(mouseX - curX) > 0.5) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  if (prev) {
    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    document.querySelectorAll('.proj-row').forEach(function (row, i) {
      row.addEventListener('mouseenter', function () {
        if (!motionShowy() && prefersReduced) return;
        hovering = true;
        prevNum.textContent = row.querySelector('.proj-num').textContent;
        prevName.textContent = row.querySelector('.proj-name').textContent;
        if (prevImg) {
          prevImg.src = row.dataset.img || '';
          prevImg.style.display = row.dataset.img ? 'block' : 'none';
          prevArt.style.background = row.dataset.img
            ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)'
            : ARTS[i % ARTS.length];
        } else {
          prevArt.style.background = ARTS[i % ARTS.length];
        }
        curX = mouseX; curY = mouseY;
        prev.classList.add('visible');
        if (!rafId) rafId = requestAnimationFrame(loop);
      });
      row.addEventListener('mouseleave', function () {
        hovering = false;
        prev.classList.remove('visible');
      });
    });
  }

  /* ---------- footer wordmark auto-fit ---------- */
  var wm = document.querySelector('.wordmark');
  function fitWordmark() {
    if (!wm) return;
    wm.style.fontSize = '';
    var avail = document.documentElement.clientWidth * 0.96;
    var w = wm.scrollWidth;
    if (w > avail) {
      var cur = parseFloat(getComputedStyle(wm).fontSize);
      wm.style.fontSize = (cur * avail / w) + 'px';
    }
  }
  fitWordmark();
  window.addEventListener('resize', fitWordmark);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);

  /* ---------- live GitHub star count (optional) ---------- */
  var starEl = document.getElementById('starCount');
  if (starEl && ENABLE_GITHUB_STARS) {
    fetch('https://api.github.com/users/' + GITHUB_USER + '/repos?per_page=100')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (repos) {
        var stars = repos.reduce(function (s, r) { return s + (r.stargazers_count || 0); }, 0);
        starEl.textContent = stars;
      })
      .catch(function () {
        if (starEl.parentElement) starEl.parentElement.innerHTML = '@' + GITHUB_USER + ' on GitHub';
      });
  } else if (starEl && starEl.parentElement) {
    starEl.parentElement.innerHTML = '@' + GITHUB_USER + ' on GitHub';
  }
})();
