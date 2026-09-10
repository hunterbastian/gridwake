/**
 * Adaptive render quality for mid-range phones.
 * Caps DPR, tracks FPS, degrades gracefully.
 * iOS Safari: tighter starting DPR and drawing-buffer cap (thermal / GPU memory).
 */
import { isIOS } from './ios.js';

export function createQuality(renderer) {
  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const coarse =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches;

  const ios = isIOS();
  const mobile =
    isTouch || coarse || ios || Math.min(window.innerWidth, window.innerHeight) < 700;

  const nativeDpr = window.devicePixelRatio || 1;
  // Soft caps — phones rarely need full retina for a racing game.
  // 3x iPhones start lower; FPS logic can climb toward maxDpr.
  let maxDpr = mobile ? 1.5 : Math.min(nativeDpr, 2);
  if (ios) {
    maxDpr = nativeDpr >= 3 ? 1.25 : Math.min(maxDpr, 1.5);
  }
  let targetDpr = Math.min(nativeDpr, maxDpr);
  let detail = mobile ? 0.75 : 1; // 0.55–1 scale for geometry density
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;

  // FPS EMA
  let emaFps = 60;
  let lowStreak = 0;
  let highStreak = 0;
  let lastAdjust = 0;

  const antialias = !mobile;

  function bufferCap() {
    const longEdge = Math.max(viewW, viewH);
    const maxLong = ios ? 1280 : 1920;
    return Math.min(maxDpr, maxLong / Math.max(1, longEdge));
  }

  function ceiling() {
    return Math.max(1, +Math.min(maxDpr, bufferCap()).toFixed(2));
  }

  function apply() {
    renderer.setPixelRatio(targetDpr);
  }

  apply();

  function onFrame(dt, now) {
    if (dt <= 0 || dt > 0.5) return;
    const fps = 1 / dt;
    emaFps = emaFps * 0.92 + fps * 0.08;

    // Don't thrash — adjust at most every ~1.2s
    if (now - lastAdjust < 1200) return;

    const cap = ceiling();

    if (emaFps < 48) {
      lowStreak++;
      highStreak = 0;
      if (lowStreak >= 2) {
        lastAdjust = now;
        lowStreak = 0;
        if (targetDpr > 1.0) {
          targetDpr = Math.max(1.0, +(targetDpr - 0.25).toFixed(2));
          apply();
        } else if (detail > 0.55) {
          detail = Math.max(0.55, +(detail - 0.1).toFixed(2));
        }
      }
    } else if (emaFps > 58 && targetDpr < cap) {
      highStreak++;
      lowStreak = 0;
      if (highStreak >= 4) {
        lastAdjust = now;
        highStreak = 0;
        targetDpr = Math.min(cap, +(targetDpr + 0.15).toFixed(2));
        apply();
      }
    } else {
      lowStreak = 0;
      highStreak = 0;
    }
  }

  function resize(w, h) {
    viewW = w;
    viewH = h;
    const cap = ceiling();
    if (targetDpr > cap) {
      targetDpr = cap;
    }
    renderer.setSize(w, h, false);
    apply();
  }

  return {
    mobile,
    ios,
    antialias,
    get dpr() {
      return targetDpr;
    },
    get detail() {
      return detail;
    },
    get fps() {
      return emaFps;
    },
    onFrame,
    resize,
    apply,
  };
}
