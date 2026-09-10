/**
 * iOS Safari shell: rubber-band scroll, visualViewport, Page Lifecycle pause,
 * WebGL context loss. Call once from main after the renderer exists.
 */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function getViewportSize(canvas) {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { w: Math.round(vv.width), h: Math.round(vv.height) };
  }
  if (canvas) {
    const w = Math.round(canvas.clientWidth || 0);
    const h = Math.round(canvas.clientHeight || 0);
    if (w >= 1 && h >= 1) return { w, h };
  }
  return { w: window.innerWidth, h: Math.max(1, window.innerHeight) };
}

export function hardenIOS({ canvas, onPause, onResume, onResize } = {}) {
  const opts = { passive: false };

  const blockScroll = (e) => {
    e.preventDefault();
  };

  document.addEventListener('touchmove', blockScroll, opts);
  document.addEventListener('gesturestart', blockScroll, opts);
  document.addEventListener('gesturechange', blockScroll, opts);
  document.addEventListener('gestureend', blockScroll, opts);
  document.addEventListener(
    'dblclick',
    (e) => {
      e.preventDefault();
    },
    opts
  );

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    },
    { passive: true }
  );

  let paused = document.visibilityState === 'hidden';

  const pause = () => {
    if (paused) return;
    paused = true;
    if (onPause) onPause();
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    if (onResume) onResume();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pause();
    else resume();
  });
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', resume);
  window.addEventListener('freeze', pause);
  window.addEventListener('resume', resume);

  if (onResize) {
    const fireResize = () => onResize(getViewportSize(canvas));
    window.addEventListener('resize', fireResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(fireResize, 120);
      setTimeout(fireResize, 400);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fireResize);
    }
  }

  if (canvas) {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      pause();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      window.location.reload();
    });
  }

  return { pause, resume, isIOS: isIOS() };
}
