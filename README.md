# Ubair Mustafa — Portfolio

Personal portfolio site. Zero build step, zero dependencies, zero third-party runtime requests.

**[ubairrr.github.io](https://ubairrr.github.io)**

---

## Stack

Vanilla HTML, CSS, and JavaScript. GSAP for animations (self-hosted).

**Highlights:**
- Zoom-parallax intro sequence
- Inertial scroll smoothing with scroll-triggered reveals
- Interactive Perlin-noise canvas backdrop
- Cursor-following project preview
- Text scramble hover effect

---

## Run locally

```bash
python3 -m http.server 8000
# or
npx serve .
```

---

## Structure

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
│       ├── icons/              # Tech-stack SVG icons
│       └── projects/           # Project preview images
├── site.webmanifest
├── robots.txt, sitemap.xml
├── _headers                    # Netlify / generic security + cache headers
├── vercel.json
└── netlify.toml
```

---

## Deployment

Drop the folder onto any static host — no build command needed.

| Host | Setup |
|------|-------|
| **Vercel** | Import repo. No build command; output dir = root. |
| **Netlify** | Import repo. No build command; publish dir = `.` |

---

## License

© Ubair Mustafa. All rights reserved.
