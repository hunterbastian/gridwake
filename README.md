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

- DPR capped (~1.5 mobile / 2 desktop), auto-lowers if FPS dips
- Antialias off on touch devices; shadows off
- Lower road/tube/star/monolith density on mobile
- Tab visibility pauses the render loop
- Hot path reuses vectors / preallocated trail buffers (no GC spikes)

## Layout

```
src/
  main.js          Loop, input, chase cam, HUD, visibility
  touch.js         Tron virtual stick + throttle/brake/boost
  quality.js       DPR / FPS adaptive quality
  car.js           Light-cycle mesh + physics (analog steer)
  road.js          Highway, razor rails
  environment.js   Void sky, grid, monoliths, fog, light
  particles.js     Continuous dual light-ribbon trail
  style.css        Minimal Forerunner/Tron HUD + touch UI
```
