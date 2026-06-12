/* scramble.js
   Vanilla JS port of ScrambleHover by fancycomponents.dev
   Applies text scramble-on-hover to all text elements in the portfolio. */

(function () {
  "use strict";

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_-+=<>/\\|";
  const CHARS_ARR = CHARS.split("");

  function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* Every scramble-bound element, so the mobile auto-play below can replay
     the effect when the element's ScrollTrigger reveal fires. */
  const REGISTERED = [];

  /**
   * Apply scramble-hover to a single element.
   * Only direct text nodes are scrambled — child elements are left intact.
   *
   * @param {Element} el
   * @param {Object}  opts
   * @param {number}  opts.speed          — interval ms between frames   (default 40)
   * @param {number}  opts.maxIterations  — frames before settling        (default 8)
   * @param {boolean} opts.sequential     — reveal char-by-char           (default false)
   * @param {string}  opts.revealDir      — "start" | "end" | "center"   (default "start")
   * @param {string[]} opts.chars         — character pool                (default CHARS_ARR)
   * @param {Element} opts.trigger        — element whose hover starts it (default el)
   */
  function applyScramble(el, opts) {
    const {
      speed          = 40,
      maxIterations  = 8,
      sequential     = false,
      revealDir      = "start",
      chars          = CHARS_ARR,
      trigger        = el,
    } = opts || {};

    // Collect direct text nodes that have visible content
    const nodes = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length) {
        nodes.push({ node: n, original: n.textContent });
      }
    });
    if (!nodes.length) return;

    let ticker   = null;  /* active frame driver, see startTicker() */
    let frame    = 0;
    let revealed = []; // one Set per text-node (sequential mode)

    // Width-lock helpers — prevent layout shift while chars swap
    function lockWidth() {
      if (el._scr_locked) return;
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      el._scr_savedDisplay   = el.style.display;
      el._scr_savedMinWidth  = el.style.minWidth;
      // inline elements can't take width — promote to inline-block
      const computed = getComputedStyle(el).display;
      if (computed === "inline") el.style.display = "inline-block";
      el.style.minWidth = w + "px";
      el._scr_locked = true;
    }
    function unlockWidth() {
      if (!el._scr_locked) return;
      el.style.display  = el._scr_savedDisplay;
      el.style.minWidth = el._scr_savedMinWidth;
      el._scr_locked = false;
    }

    function scramble(text) {
      return text.split("").map((c) =>
        (c === " " || c === "\n" || c === "\t") ? c : rand(chars)
      ).join("");
    }

    function scrambleSeq(text, rev) {
      return text.split("").map((c, i) => {
        if (c === " " || c === "\n" || c === "\t") return c;
        return rev.has(i) ? c : rand(chars);
      }).join("");
    }

    function nextRevealIdx(text, rev) {
      const len = text.length;
      const nonSpace = (i) => text[i] !== " " && text[i] !== "\n" && text[i] !== "\t";
      switch (revealDir) {
        case "end":
          for (let i = len - 1; i >= 0; i--) if (!rev.has(i) && nonSpace(i)) return i;
          break;
        case "center": {
          const mid    = Math.floor(len / 2);
          const offset = Math.floor(rev.size / 2);
          const idx    = rev.size % 2 === 0 ? mid + offset : mid - offset - 1;
          if (idx >= 0 && idx < len && !rev.has(idx) && nonSpace(idx)) return idx;
          for (let i = 0; i < len; i++) if (!rev.has(i) && nonSpace(i)) return i;
          break;
        }
        default: // "start"
          for (let i = 0; i < len; i++) if (!rev.has(i) && nonSpace(i)) return i;
      }
      return -1;
    }

    /* Frame driver: gsap.ticker (rAF) when available, setInterval fallback.
       iOS Safari suspends DOM timers during touch/momentum scrolling, which
       silently froze the scroll-triggered scrambles on iPhone — the rAF
       loop keeps stepping there, like every other GSAP animation. */
    function stopTicker() {
      if (!ticker) return;
      if (ticker.fn) gsap.ticker.remove(ticker.fn);
      else clearInterval(ticker.id);
      ticker = null;
    }

    function startTicker(onFrame) {
      stopTicker();
      if (window.gsap) {
        let lastT = performance.now();
        const fn = () => {
          const now = performance.now();
          if (now - lastT < speed) return;
          lastT = now;
          if (onFrame() === false) stopTicker();
        };
        ticker = { fn };
        gsap.ticker.add(fn);
      } else {
        const id = setInterval(() => {
          if (onFrame() === false) stopTicker();
        }, speed);
        ticker = { id };
      }
    }

    function stop() {
      stopTicker();
      nodes.forEach(({ node, original }) => { node.textContent = original; });
      unlockWidth();
    }

    function start() {
      stop();
      lockWidth();
      frame    = 0;
      revealed = nodes.map(() => new Set());

      startTicker(() => {
        if (sequential) {
          let allDone = true;
          nodes.forEach(({ node, original }, i) => {
            const rev = revealed[i];
            const idx = nextRevealIdx(original, rev);
            if (idx !== -1) { rev.add(idx); allDone = false; }
            node.textContent = scrambleSeq(original, rev);
          });
          if (allDone) {
            nodes.forEach(({ node, original }) => { node.textContent = original; });
            unlockWidth();
            return false;
          }
        } else {
          nodes.forEach(({ node, original }) => { node.textContent = scramble(original); });
          if (++frame >= maxIterations) {
            nodes.forEach(({ node, original }) => { node.textContent = original; });
            unlockWidth();
            return false;
          }
        }
      });
    }

    trigger.addEventListener("mouseenter", start);
    trigger.addEventListener("mouseleave", stop);

    REGISTERED.push({ el, play: start });
  }

  /* ─────────────────────────────────────────────
     Apply to every text surface in the portfolio
  ───────────────────────────────────────────── */
  function init() {

    // ── Navigation rail ──────────────────────────────────────────────
    document.querySelectorAll(".rail-right a").forEach((el) =>
      applyScramble(el, { speed: 28, maxIterations: 7 })
    );

    // ── Badge ("Open to opportunities") ──────────────────────────────
    document.querySelectorAll(".badge").forEach((el) =>
      applyScramble(el, { speed: 30, maxIterations: 7 })
    );

    // ── Hero headings (leaf spans inside .line; whole line triggers) ──
    document.querySelectorAll(".hero h1 .line > span").forEach((el) =>
      applyScramble(el, { speed: 25, maxIterations: 10, sequential: true, revealDir: "start", trigger: el.closest(".line") || el })
    );

    // ── CTA button ───────────────────────────────────────────────────
    document.querySelectorAll(".cta").forEach((el) =>
      applyScramble(el, { speed: 28, maxIterations: 7 })
    );

    // ── Section labels & titles ───────────────────────────────────────
    document.querySelectorAll(".sec-label").forEach((el) =>
      applyScramble(el, { speed: 25, maxIterations: 8, sequential: true, revealDir: "start" })
    );
    document.querySelectorAll(".sec-title").forEach((el) =>
      applyScramble(el, { speed: 22, maxIterations: 10, sequential: true, revealDir: "start" })
    );

    // ── About ─────────────────────────────────────────────────────────
    document.querySelectorAll(".about-name").forEach((el) =>
      applyScramble(el, { speed: 28, maxIterations: 12, sequential: true, revealDir: "center" })
    );

    // ── Stack categories (whole row triggers) ─────────────────────────
    document.querySelectorAll(".stack-cat").forEach((el) =>
      applyScramble(el, { speed: 28, maxIterations: 7, trigger: el.closest(".stack-row") || el })
    );

    // ── Experience company names (whole entry triggers) ───────────────
    document.querySelectorAll(".xp-company").forEach((el) =>
      applyScramble(el, { speed: 25, maxIterations: 9, sequential: true, revealDir: "start", trigger: el.closest(".xp-entry") || el })
    );

    // ── Project names (whole row triggers) ────────────────────────────
    document.querySelectorAll(".proj-name").forEach((el) =>
      applyScramble(el, { speed: 25, maxIterations: 10, sequential: true, revealDir: "start", trigger: el.closest(".proj-row") || el })
    );

    // ── Footer ────────────────────────────────────────────────────────
    document.querySelectorAll(".foot-cta h2").forEach((el) =>
      applyScramble(el, { speed: 22, maxIterations: 10, sequential: true, revealDir: "start" })
    );
    document.querySelectorAll(".foot-email").forEach((el) =>
      applyScramble(el, { speed: 20, maxIterations: 8 })
    );
    document.querySelectorAll(".wordmark").forEach((el) =>
      applyScramble(el, { speed: 28, maxIterations: 12, sequential: true, revealDir: "center" })
    );

    bindAutoScramble();
  }

  /* ─────────────────────────────────────────────
     Mobile auto-play: on touch-only devices each scrambled text replays
     once when its ScrollTrigger reveal fires, using the same start point
     as the .reveal batch in smoother.js — so the scramble rides in with
     the entrance animation instead of waiting for a (mouse) hover.
  ───────────────────────────────────────────── */
  function bindAutoScramble() {
    if (!window.ScrollTrigger || !window.gsap) return;
    if (!window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    REGISTERED.forEach(({ el, play }) => {
      const reveal = el.closest(".reveal");
      if (!reveal) return;               /* only ScrollTrigger-revealed texts */
      ScrollTrigger.create({
        trigger: reveal,
        start: "top 90%",
        once: true,
        /* at onEnter the reveal fade has only just started (~0 opacity);
           wait a beat so the scramble plays on visible text */
        onEnter: () => gsap.delayedCall(0.35, play)
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
