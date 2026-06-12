# Ubair Mustafa — Portfolio

A single-page portfolio site for Ubair Mustafa, software engineer. Built as a
**zero-build, fully self-contained static site** — no framework, no bundler, no
third-party runtime requests (with one optional exception, see below).

The visual centrepiece is a GSAP-driven scroll experience: a zoom-parallax
intro, smoothed inertial scrolling, scroll-triggered reveals, an interactive
Perlin-noise line-field backdrop, and a cursor-following project preview.

---

## Quick start

It's plain static files — no build step. Serve the project root with any static
server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# then open http://localhost:8000
```

Opening `index.html` directly via `file://` mostly works, but a local server is
recommended so fonts and the module-free scripts load with correct MIME types.

---

## Project structure

```
.
├── index.html                 # The page. All content lives here.
├── assets/
│   ├── css/
│   │   ├── portfolio.css       # All styling (design tokens → components)
│   │   └── fonts.css           # @font-face for the self-hosted webfonts
│   ├── js/
│   │   ├── smoother.js         # GSAP: ScrollSmoother + all ScrollTrigger behaviour
│   │   ├── waves.js            # Interactive Perlin-noise canvas backdrop
│   │   ├── intro.js            # Zoom-parallax intro (virtual-scroll overlay)
│   │   ├── interactions.js     # Cursor preview, wordmark fit, GitHub stars
│   │   └── scramble.js         # Text scramble-on-hover effect
│   ├── vendor/
│   │   └── gsap/               # Self-hosted GSAP core + ScrollTrigger + ScrollSmoother
│   ├── fonts/                  # Self-hosted .woff2 (Anton, Archivo, Instrument Serif, Space Mono)
│   └── img/
│       ├── profile.webp        # Portrait
│       ├── og-image.png        # 1200×630 social share card
│       ├── favicon.svg, *.png  # Favicons + app icons
│       ├── icons/              # Tech-stack SVG icons (Simple Icons, white)
│       └── projects/           # Project preview images
├── site.webmanifest            # PWA manifest
├── robots.txt, sitemap.xml     # SEO
├── _headers                    # Netlify / generic security + cache headers
├── vercel.json                 # Vercel headers config
├── netlify.toml                # Netlify config
├── .github/workflows/deploy.yml# GitHub Pages CI
└── .nojekyll                   # Stops GitHub Pages from stripping assets/
```

### Load order (in `index.html`)

1. Inline `ResizeObserver` shim (silences a benign console warning) — must be first.
2. `assets/css/fonts.css`, `assets/css/portfolio.css`
3. GSAP core → ScrollTrigger → ScrollSmoother (order matters)
4. `waves.js` → `smoother.js` → `intro.js` → `interactions.js` → `scramble.js`

`smoother.js` registers the GSAP plugins and creates the single `ScrollSmoother`
instance, exposed as `window.__smoother` so `intro.js` can pause/resume it.

---

## Editing content

All copy, projects, stack items, and experience entries live directly in
`index.html` as semantic HTML — edit there. Key hooks:

| You want to change…        | Where |
|----------------------------|-------|
| Any text / project / role  | `index.html` |
| Colours, type, spacing     | `:root` design tokens at the top of `assets/css/portfolio.css` |
| A stat counter target      | `data-count="N"` on `.num` in the hero |
| A project hover preview     | `data-img="…"` on the `.proj-row`, image in `assets/img/projects/` |
| Intro on/off, motion, etc. | `data-*` attributes on the `<html>` element (see below) |

### `<html>` data attributes (visual modes)

| Attribute        | Values                              | Effect |
|------------------|-------------------------------------|--------|
| `data-direction` | `impact` · `mono`                   | Display typeface system |
| `data-grain`     | `on` · `off`                        | Film-grain texture overlay |
| `data-motion`    | `showy` · `calm`                    | `calm` disables smoothing + decorative animation |
| `data-backdrop`  | `waves` · `blob` · `plain`          | Background treatment |
| `data-intro`     | `on` · `off`                        | Zoom intro on first load |

---

## Third-party requests

The site is designed to make **zero** third-party requests. Fonts and GSAP are
self-hosted; stack icons and project previews are vendored into `assets/img/`.

The **one** optional exception is a live GitHub star count in the footer, which
calls `api.github.com`. To disable it for a fully self-contained site, set
`ENABLE_GITHUB_STARS = false` near the top of `assets/js/interactions.js` — the
footer then shows a static GitHub link instead.

---

## Deployment

The site deploys as-is to any static host. Before going live, do a
find-and-replace of the placeholder canonical domain
`https://ubairrr.github.io/` (in `index.html`, `sitemap.xml`, `robots.txt`)
with your real domain.

| Host            | What to do |
|-----------------|-----------|
| **GitHub Pages**| Push to `main`; the included Actions workflow deploys automatically. Enable Pages → "GitHub Actions" in repo settings. |
| **Vercel**      | Import the repo. No build command; output dir = root. `vercel.json` sets headers. |
| **Netlify**     | Import the repo. No build command; publish dir = `.`. `netlify.toml` + `_headers` handle config. |
| **Any CDN/nginx**| Upload the whole folder. Serve `index.html` at `/`. |

### Analytics

No analytics ship by default. To add a privacy-friendly tracker, paste the
snippet into the clearly-marked `ANALYTICS` comment block in `<head>` of
`index.html` (a Plausible example is shown there).

---

## Accessibility & performance

- Respects `prefers-reduced-motion` everywhere (smoothing, reveals, intro,
  waves, and a global animation kill-switch all honour it).
- Keyboard skip-link, visible `:focus-visible` rings, ARIA labels on icon links.
- Fonts preloaded + `font-display: swap`; images `loading="lazy"` +
  `decoding="async"`; scripts at end of body.
- Graceful degradation: if GSAP fails to load, the page scrolls natively and all
  content stays visible.

---

## License

© Ubair Mustafa. All rights reserved. The portrait, project content, and
personal branding are not licensed for reuse.
