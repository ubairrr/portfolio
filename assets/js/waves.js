/* ============================================================================
 * waves.js — Interactive Perlin-noise line field (fixed full-page backdrop)
 * ----------------------------------------------------------------------------
 * Draws an animated grid of curved lines that drift via 2D Perlin noise and
 * react to the pointer. Renders to <canvas class="waves-bg">.
 *
 * Performance notes:
 *   • Perlin helpers are hoisted (not re-created per frame) to avoid GC churn.
 *   • The draw path is allocation-free (no per-segment coordinate objects).
 *   • When reduced-motion is requested the field renders a single static frame.
 * ========================================================================== */

(function () {
  'use strict';

  /* ---------- Perlin noise ---------- */
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }

  class Noise {
    constructor(seed) {
      this.p = new Uint8Array(512);
      this.seed = seed > 0 && seed < 1 ? seed : Math.random();
      this.grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
      ];
      this.init(this.seed);
    }
    init(seed) {
      let i, j, k;
      const p = new Uint8Array(256);
      for (i = 0; i < 256; i++) p[i] = i;
      for (i = 0; i < 256; i++) {
        j = Math.floor(seed * (i + 1)) % 256;
        k = p[i]; p[i] = p[j]; p[j] = k;
      }
      for (i = 0; i < 512; i++) this.p[i] = p[i & 255];
    }
    dot(g, x, y) { return g[0] * x + g[1] * y; }
    perlin2(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const p = this.p, g = this.grad3;
      const n00 = this.dot(g[p[X + p[Y]] % 12], x, y);
      const n01 = this.dot(g[p[X + p[Y + 1]] % 12], x, y - 1);
      const n10 = this.dot(g[p[X + 1 + p[Y]] % 12], x - 1, y);
      const n11 = this.dot(g[p[X + 1 + p[Y + 1]] % 12], x - 1, y - 1);
      return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
    }
  }

  /* ---------- config ---------- */
  const CFG = {
    GRID_X_GAP: 10,
    GRID_Y_GAP: 32,
    GRID_WIDTH_OFFSET: 200,
    GRID_HEIGHT_OFFSET: 30,
    WAVE_TIME_X_FACTOR: 0.0125,
    WAVE_NOISE_X_FACTOR: 0.002,
    WAVE_TIME_Y_FACTOR: 0.005,
    WAVE_NOISE_Y_FACTOR: 0.0015,
    WAVE_NOISE_MAGNITUDE: 12,
    WAVE_AMPLITUDE_X: 32,
    WAVE_AMPLITUDE_Y: 16,
    MOUSE_INFLUENCE_RADIUS: 175,
    MOUSE_FALLOFF_FACTOR: 0.001,
    MOUSE_FORCE_FACTOR: 0.00065,
    MOUSE_SMOOTHING_FACTOR: 0.1,
    MAX_MOUSE_VELOCITY: 100,
    TENSION_STRENGTH: 0.005,
    FRICTION: 0.925,
    CURSOR_DISPLACEMENT_STRENGTH: 2,
    MAX_CURSOR_DISPLACEMENT: 100,
    LINE_COLOR: 'rgba(255, 255, 255, 0.32)',
    LINE_WIDTH: 0.8
  };

  const TOUCH_ONLY = window.matchMedia('(hover: none)').matches;
  const ZOOM = TOUCH_ONLY ? 0.5 : 1;

  /* A scroll-swipe whips the finger across the screen far faster than a mouse
     ever moves, and the cursor force scales with pointer velocity. Left at the
     desktop values that produces a violent swirl, and the large displacement
     lingers as a decaying blob when the finger lifts and re-plants for the next
     swipe (reads as a teleport). Cap velocity and soften the force so the touch
     point behaves like a calm cursor that settles instantly on release. */
  if (TOUCH_ONLY) {
    CFG.MAX_MOUSE_VELOCITY = 28;
    CFG.MOUSE_FORCE_FACTOR = 0.00045;
    CFG.MAX_CURSOR_DISPLACEMENT = 42;
    CFG.FRICTION = 0.86;
  }

  const canvas = document.querySelector('canvas.waves-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const noise = new Noise(Math.random());
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  let lines = [];
  let W = 0, H = 0;     /* canvas pixels */
  let FW = 0, FH = 0;   /* field coordinate space (canvas ÷ ZOOM) */
  let visible = true;
  let staticDrawn = false;
  const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
  const isCalm = () => reducedMQ.matches || document.documentElement.dataset.motion === 'calm';
  const isHidden = () => canvas.clientWidth === 0 || canvas.clientHeight === 0;

  function setSize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width));
    H = canvas.height = Math.max(1, Math.round(r.height));
    FW = W / ZOOM;
    FH = H / ZOOM;
  }

  function setLines() {
    lines = [];
    const oWidth = FW + CFG.GRID_WIDTH_OFFSET;
    const oHeight = FH + CFG.GRID_HEIGHT_OFFSET;
    const totalLines = Math.ceil(oWidth / CFG.GRID_X_GAP);
    const totalPoints = Math.ceil(oHeight / CFG.GRID_Y_GAP);
    const xStart = (FW - CFG.GRID_X_GAP * totalLines) / 2;
    const yStart = (FH - CFG.GRID_Y_GAP * totalPoints) / 2;
    for (let i = 0; i <= totalLines; i++) {
      const points = [];
      for (let j = 0; j <= totalPoints; j++) {
        points.push({
          x: xStart + CFG.GRID_X_GAP * i,
          y: yStart + CFG.GRID_Y_GAP * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 }
        });
      }
      lines.push(points);
    }
  }

  function movePoints(time, withMouse) {
    for (const points of lines) {
      for (const p of points) {
        const nx = (p.x + time * CFG.WAVE_TIME_X_FACTOR) * CFG.WAVE_NOISE_X_FACTOR;
        const ny = (p.y + time * CFG.WAVE_TIME_Y_FACTOR) * CFG.WAVE_NOISE_Y_FACTOR;
        const move = noise.perlin2(nx, ny) * CFG.WAVE_NOISE_MAGNITUDE;
        p.wave.x = Math.cos(move) * CFG.WAVE_AMPLITUDE_X;
        p.wave.y = Math.sin(move) * CFG.WAVE_AMPLITUDE_Y;

        if (withMouse) {
          const dx = p.x - mouse.sx;
          const dy = p.y - mouse.sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          const influenceRadius = Math.max(CFG.MOUSE_INFLUENCE_RADIUS, mouse.vs);
          if (d < influenceRadius) {
            const falloff = 1 - d / influenceRadius;
            const force = Math.cos(d * CFG.MOUSE_FALLOFF_FACTOR) * falloff;
            const forceFactor = force * influenceRadius * mouse.vs * CFG.MOUSE_FORCE_FACTOR;
            p.cursor.vx += Math.cos(mouse.a) * forceFactor;
            p.cursor.vy += Math.sin(mouse.a) * forceFactor;
          }
          p.cursor.vx += (0 - p.cursor.x) * CFG.TENSION_STRENGTH;
          p.cursor.vy += (0 - p.cursor.y) * CFG.TENSION_STRENGTH;
          p.cursor.vx *= CFG.FRICTION;
          p.cursor.vy *= CFG.FRICTION;
          p.cursor.x += p.cursor.vx * CFG.CURSOR_DISPLACEMENT_STRENGTH;
          p.cursor.y += p.cursor.vy * CFG.CURSOR_DISPLACEMENT_STRENGTH;
          p.cursor.x = Math.min(CFG.MAX_CURSOR_DISPLACEMENT, Math.max(-CFG.MAX_CURSOR_DISPLACEMENT, p.cursor.x));
          p.cursor.y = Math.min(CFG.MAX_CURSOR_DISPLACEMENT, Math.max(-CFG.MAX_CURSOR_DISPLACEMENT, p.cursor.y));
        }
      }
    }
  }

  function drawLines() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);   /* draw field at 50% on mobile */
    ctx.beginPath();
    ctx.strokeStyle = CFG.LINE_COLOR;
    ctx.lineWidth = CFG.LINE_WIDTH / ZOOM;      /* constant on-screen thickness */
    for (const points of lines) {
      const p0 = points[0];
      ctx.moveTo(p0.x + p0.wave.x, p0.y + p0.wave.y);
      let cx = p0.x + p0.wave.x + p0.cursor.x;
      let cy = p0.y + p0.wave.y + p0.cursor.y;
      for (let i = 1; i < points.length; i++) {
        const n = points[i];
        const nx = n.x + n.wave.x + n.cursor.x;
        const ny = n.y + n.wave.y + n.cursor.y;
        ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
        cx = nx; cy = ny;
      }
    }
    ctx.stroke();
  }

  function tick(time) {
    if (visible && !isHidden()) {
      if (isCalm()) {
        if (!staticDrawn) {
          movePoints(0, false);
          drawLines();
          staticDrawn = true;
        }
      } else {
        staticDrawn = false;
        mouse.sx += (mouse.x - mouse.sx) * CFG.MOUSE_SMOOTHING_FACTOR;
        mouse.sy += (mouse.y - mouse.sy) * CFG.MOUSE_SMOOTHING_FACTOR;
        const dx = mouse.sx - mouse.lx;
        const dy = mouse.sy - mouse.ly;
        const d = Math.hypot(dx, dy);
        mouse.v = d;
        mouse.vs += (d - mouse.vs) * CFG.MOUSE_SMOOTHING_FACTOR;
        mouse.vs = Math.min(CFG.MAX_MOUSE_VELOCITY, mouse.vs);
        mouse.a = Math.atan2(dy, dx);
        mouse.lx = mouse.sx;
        mouse.ly = mouse.sy;
        movePoints(time, true);
        drawLines();
      }
    }
    requestAnimationFrame(tick);
  }

  function updateMousePosition(cx, cy) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (cx - r.left) / ZOOM;   /* map pointer into field space */
    mouse.y = (cy - r.top) / ZOOM;
    if (!mouse.set) {
      /* Fresh (re)initialisation: park the smoothed pointer exactly on the new
         position with zero velocity, so re-engaging after a lift can't replay
         the previous swipe's leftover velocity as a phantom burst, nor glide a
         fast swipe across the field from the old position. */
      mouse.sx = mouse.x; mouse.sy = mouse.y;
      mouse.lx = mouse.x; mouse.ly = mouse.y;
      mouse.v = 0; mouse.vs = 0;
      mouse.set = true;
    }
  }

  window.addEventListener('resize', () => { setSize(); setLines(); staticDrawn = false; }, { passive: true });
  window.addEventListener('mousemove', (e) => updateMousePosition(e.clientX, e.clientY), { passive: true });

  /* On touch, a finger lift leaves the virtual pointer parked where it was —
     the field settles in place instead of snapping. The next touch/scroll
     re-initialises the pointer at its own position (mouse.set = false forces
     the zero-velocity snap in updateMousePosition), so re-engaging never
     emulates a fast swipe from the old spot to the new one. */
  window.addEventListener('touchstart', (e) => {
    if (!e.touches.length) return;
    mouse.set = false;
    updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!e.touches.length) return;
    updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  /* Redraw the static frame if the OS reduced-motion preference flips. */
  reducedMQ.addEventListener('change', () => { staticDrawn = false; });

  setSize();
  setLines();
  requestAnimationFrame(tick);
})();
