/* ============================================================================
 * touch-hover.js — Make touch behave like a hovering cursor
 * ----------------------------------------------------------------------------
 * While a finger is down, the touch point is treated as a cursor position:
 * the element chain under it (matching SELECTORS) receives real synthetic
 * `mouseenter` / `mouseleave` events — so the text scramble (scramble.js) and
 * the project preview card (interactions.js) fire exactly as they do on
 * desktop hover — plus a `.t-hover` class that mirrors the CSS :hover states.
 * A synthetic `mousemove` is also dispatched so the preview card tracks the
 * finger. Dispatched events carry `__fromTouch = true` so consumers can tell
 * them apart from real mouse input (e.g. to place the card above the finger).
 *
 * On touchend the hover state lingers briefly so scrambles can settle and the
 * preview doesn't vanish the instant the finger lifts.
 * ========================================================================== */

(function () {
  'use strict';

  if (!('ontouchstart' in window) && (navigator.maxTouchPoints || 0) < 1) return;

  /* Every surface that has a JS hover effect (scramble / preview) or a CSS
     :hover state mirrored by .t-hover. */
  var SELECTORS = [
    '.rail-left a', '.rail-right a', '.rail-email a',
    '.badge', '.hero h1 .line > span', '.cta',
    '.sec-label', '.sec-title', '.about-name',
    '.stack-cat', '.tile',
    '.xp-entry', '.xp-company',
    '.proj-row', '.proj-name',
    '.foot-cta h2', '.foot-email', '.wordmark', '.foot-bar a'
  ].join(',');

  var hovered = [];        /* current hovered chain (innermost first) */
  var clearTimer = null;
  var LINGER_MS = 700;     /* hover persists this long after the finger lifts */

  function fire(el, type, x, y, bubbles) {
    var ev = new MouseEvent(type, {
      bubbles: !!bubbles,
      cancelable: false,
      view: window,
      clientX: x,
      clientY: y
    });
    ev.__fromTouch = true;
    el.dispatchEvent(ev);
  }

  /* All ancestors (incl. self) of `el` matching SELECTORS — mirrors how real
     mouseenter fires on every ancestor the cursor is inside. */
  function chainFor(el) {
    var out = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el.matches(SELECTORS)) out.push(el);
      el = el.parentElement;
    }
    return out;
  }

  function update(x, y) {
    /* Cursor position first, so enter handlers read fresh coordinates. */
    fire(document, 'mousemove', x, y, true);

    var el = document.elementFromPoint(x, y);
    var next = el ? chainFor(el) : [];

    hovered.forEach(function (h) {
      if (next.indexOf(h) === -1) {
        h.classList.remove('t-hover');
        fire(h, 'mouseleave', x, y, false);
      }
    });
    next.forEach(function (n) {
      if (hovered.indexOf(n) === -1) {
        n.classList.add('t-hover');
        fire(n, 'mouseenter', x, y, false);
      }
    });
    hovered = next;
  }

  function clear(x, y) {
    hovered.forEach(function (h) {
      h.classList.remove('t-hover');
      fire(h, 'mouseleave', x, y, false);
    });
    hovered = [];
  }

  function cancelPendingClear() {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
  }

  window.addEventListener('touchstart', function (e) {
    cancelPendingClear();
    var t = e.touches[0];
    if (t) update(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    cancelPendingClear();
    var t = e.touches[0];
    if (t) update(t.clientX, t.clientY);
  }, { passive: true });

  function onTouchEnd(e) {
    if (e.touches.length) return;          /* other fingers still down */
    var t = e.changedTouches[0];
    var x = t ? t.clientX : 0;
    var y = t ? t.clientY : 0;
    cancelPendingClear();
    clearTimer = setTimeout(function () {
      clearTimer = null;
      clear(x, y);
    }, LINGER_MS);
  }
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });
})();
