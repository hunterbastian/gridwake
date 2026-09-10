# Gridwake

_LIGHT CYCLE_ — Tron × Halo browser racer.

Premium-feel browser racer: Tron light-cycle DNA × Halo Forerunner atmosphere.

**Look:** Black negative space. Razor cyan + amber emissive lines only. Monumental silver-blue monoliths. Continuous light-ribbon boost trails. Minimal monospace HUD.

## Stack

- Vite + Three.js (vanilla ES modules)

## Run

```bash
cd gridwake
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open **http://localhost:5173** (or `http://<box-ip>:5173` from a phone on the same network).

```bash
npm run build
```

`npm run build` writes a static site to `dist/` (HTML, bundled JS/CSS, manifest, icons). Host that folder on Vercel, Render Static Site, GitHub Pages, or any static CDN.

- **Vercel:** Vite is auto-detected. Deploy the repo; output is `dist`.
- **Render:** Static Site. Build command `npm install && npm run build`, publish directory `dist`.
- **GitHub Pages:** project site at **https://hunterbastian.github.io/gridwake/**. The `Deploy Pages` workflow builds with `BASE_PATH=/gridwake/` so asset URLs and the PWA `start_url` match that path. Local equivalent:

```bash
BASE_PATH=/gridwake/ npm run build
```

Root hosts (Vercel / Render) leave `BASE_PATH` unset (Vite `base` defaults to `/`).

The production origin must be **HTTPS** for Add to Home Screen / standalone display.

## Play on iPhone (free)

Play Gridwake as a fullscreen Home Screen app on iPhone. No App Store or Apple Developer account. Use **Safari** (Chrome on iOS cannot install it this way).

1. Open **https://hunterbastian.github.io/gridwake/** (or another **HTTPS** deploy) in **Safari**.
2. Tap the **Share** button (square with an arrow pointing up).
3. Scroll the sheet and tap **Add to Home Screen**.
4. Tap **Add**. Gridwake appears on the Home Screen.

Open it from the Home Screen for a standalone, black-chrome experience with the existing touch controls (left stick, throttle, brake, amber boost). Landscape is the primary racing layout; rotate for the best view.

The first tap (Continue) unlocks audio for Safari. Switching apps pauses the render loop.

**Later (optional):** a native App Store build needs a paid [Apple Developer](https://developer.apple.com) account. This PWA is the free path until then.

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / reverse |
| `A` `D` / `←` `→` | Steer |
| `Space` | Boost |

### Mobile / touch
| Control | Action |
|---------|--------|
| Left virtual stick | Analog steer |
| Right **THROTTLE** | Hold to accelerate |
| Right **BRAKE** | Brake / reverse |
| Right **BOOST** (amber) | One-thumb boost |

Landscape is the primary racing layout. Portrait works; HUD moves to the top.

## Performance knobs

- DPR capped (~1.25–1.5 on iOS / mobile, 2 desktop), auto-lowers if FPS dips; drawing buffer capped for GPU memory
- Antialias off on touch devices; shadows off
- Lower road/tube/star/monolith density on mobile
- Tab / app switch pauses the render loop (`visibilitychange` + `pagehide`)
- Rubber-band overscroll blocked; `visualViewport` resize; Web Audio unlock on first gesture
- Hot path reuses vectors / preallocated trail buffers (no GC spikes)

## Layout

```
src/
  main.js          Loop, input, chase cam, HUD, visibility
  ios.js           iOS Safari viewport, overscroll, pause, WebGL loss
  audio.js         Web Audio unlock on first gesture
  touch.js         Tron virtual stick + throttle/brake/boost
  quality.js       DPR / FPS adaptive quality
  car.js           Light-cycle mesh + physics (analog steer)
  road.js          Highway, razor rails
  environment.js   Void sky, grid, monoliths, fog, light
  particles.js     Continuous dual light-ribbon trail
  style.css        Minimal Forerunner/Tron HUD + touch UI
```
