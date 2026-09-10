/**
 * Tron-like virtual controls: left analog steer stick,
 * right hold-to-throttle + brake + boost (one-thumb).
 * Prevents scroll/zoom/gesture interference.
 */
export function createTouchControls(input, { onEngage } = {}) {
  const root = document.getElementById('touch-controls');
  if (!root) {
    return { destroy() {}, setVisible() {} };
  }

  const stickZone = document.getElementById('steer-zone');
  const stickKnob = document.getElementById('steer-knob');
  const stickBase = document.getElementById('steer-base');
  const throttleBtn = document.getElementById('btn-throttle');
  const brakeBtn = document.getElementById('btn-brake');
  const boostBtn = document.getElementById('btn-boost');

  const isTouch =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const coarse =
    window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const preferTouch = isTouch || coarse;

  let visible = preferTouch;
  root.classList.toggle('active', visible);
  root.setAttribute('aria-hidden', visible ? 'false' : 'true');

  // Pointer tracking — one finger per control
  const pointers = new Map(); // pointerId -> role

  const steer = { active: false, x: 0, y: 0, cx: 0, cy: 0, r: 48 };
  const tmpRect = { left: 0, top: 0, width: 0, height: 0 };

  function engage() {
    if (onEngage) onEngage();
  }

  function updateSteerVisual() {
    if (!stickKnob) return;
    const kx = steer.x * steer.r;
    const ky = steer.y * steer.r;
    stickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
    stickZone.classList.toggle('active', steer.active);
  }

  function readSteerFromEvent(e) {
    const rect = stickBase.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    steer.cx = cx;
    steer.cy = cy;
    steer.r = Math.min(rect.width, rect.height) * 0.38;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const max = steer.r;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    steer.x = dx / max;
    steer.y = dy / max;
    // Horizontal dominates for racing; deadzone
    const dead = 0.12;
    const sx = Math.abs(steer.x) < dead ? 0 : steer.x;
    input.steerAxis = -sx; // left = positive (matches A key)
    // Soft clamp magnitude for feel
    if (Math.abs(input.steerAxis) > 0) {
      const mag = Math.min(1, (Math.abs(steer.x) - dead) / (1 - dead));
      input.steerAxis = Math.sign(input.steerAxis) * mag;
    }
    input.left = input.steerAxis > 0.15;
    input.right = input.steerAxis < -0.15;
    updateSteerVisual();
  }

  function clearSteer() {
    steer.active = false;
    steer.x = 0;
    steer.y = 0;
    input.steerAxis = 0;
    input.left = false;
    input.right = false;
    updateSteerVisual();
  }

  function setButton(role, down) {
    if (role === 'throttle') {
      input.forward = down;
      throttleBtn && throttleBtn.classList.toggle('pressed', down);
    } else if (role === 'brake') {
      input.back = down;
      brakeBtn && brakeBtn.classList.toggle('pressed', down);
    } else if (role === 'boost') {
      input.boost = down;
      boostBtn && boostBtn.classList.toggle('pressed', down);
    }
  }

  function roleFromTarget(el) {
    if (!el) return null;
    const btn = el.closest('[data-action]');
    if (btn) return btn.getAttribute('data-action');
    if (el.closest('#steer-zone')) return 'steer';
    return null;
  }

  function onPointerDown(e) {
    if (!visible) return;
    // Only handle touches / pen inside controls; mouse optional for testing
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const role = roleFromTarget(e.target);
    if (!role) return;
    e.preventDefault();
    e.stopPropagation();
    engage();
    try {
      root.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    pointers.set(e.pointerId, role);
    if (role === 'steer') {
      steer.active = true;
      readSteerFromEvent(e);
    } else {
      setButton(role, true);
    }
  }

  function onPointerMove(e) {
    const role = pointers.get(e.pointerId);
    if (!role) return;
    e.preventDefault();
    if (role === 'steer') {
      readSteerFromEvent(e);
    }
  }

  function onPointerUp(e) {
    const role = pointers.get(e.pointerId);
    if (!role) return;
    e.preventDefault();
    pointers.delete(e.pointerId);
    if (role === 'steer') {
      // Only clear if no other steer pointer
      let still = false;
      for (const r of pointers.values()) {
        if (r === 'steer') still = true;
      }
      if (!still) clearSteer();
    } else {
      setButton(role, false);
    }
    try {
      root.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  // passive:false so preventDefault stops scroll/zoom
  const opts = { passive: false };
  root.addEventListener('pointerdown', onPointerDown, opts);
  root.addEventListener('pointermove', onPointerMove, opts);
  root.addEventListener('pointerup', onPointerUp, opts);
  root.addEventListener('pointercancel', onPointerUp, opts);
  root.addEventListener('lostpointercapture', onPointerUp, opts);

  // Block page gestures on the whole app shell
  const app = document.getElementById('app');
  const blockGesture = (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  };
  document.addEventListener('gesturestart', (e) => e.preventDefault(), opts);
  document.addEventListener('gesturechange', (e) => e.preventDefault(), opts);
  if (app) {
    app.addEventListener('touchmove', (e) => {
      // Allow nothing to scroll
      e.preventDefault();
    }, opts);
    app.addEventListener('touchstart', blockGesture, opts);
  }

  // Prevent double-tap zoom on controls
  let lastTap = 0;
  root.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    },
    opts
  );

  function setVisible(v) {
    visible = v;
    root.classList.toggle('active', v);
    root.setAttribute('aria-hidden', v ? 'false' : 'true');
    if (!v) {
      clearSteer();
      setButton('throttle', false);
      setButton('brake', false);
      setButton('boost', false);
      pointers.clear();
    }
  }

  // Show on first touch even on hybrid devices
  window.addEventListener(
    'touchstart',
    () => {
      if (!visible) setVisible(true);
    },
    { once: true, passive: true }
  );

  return {
    preferTouch,
    setVisible,
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
