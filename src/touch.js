/**
 * NFS-like mobile controls: wide sticky analog wheel on the left,
 * large throttle / brake pads + one-thumb nitro on the right.
 */
export function createTouchControls(input, { onEngage } = {}) {
  const root = document.getElementById('touch-controls');
  if (!root) {
    return { destroy() {}, setVisible() {}, update() {} };
  }

  const stickZone = document.getElementById('steer-zone');
  const stickKnob = document.getElementById('steer-knob');
  const stickBase = document.getElementById('steer-base');
  const steerWheel = document.getElementById('steer-wheel');
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

  const pointers = new Map();

  const steer = { active: false, raw: 0, x: 0, y: 0, r: 56 };
  const RETURN = 7.5;
  const STICK = 18;

  function engage() {
    if (onEngage) onEngage();
  }

  function applySteer(axis) {
    const dead = 0.08;
    let sx = Math.abs(axis) < dead ? 0 : axis;
    if (sx !== 0) {
      const mag = Math.min(1, (Math.abs(axis) - dead) / (1 - dead));
      sx = Math.sign(axis) * Math.pow(mag, 1.28);
    }
    input.steerAxis = -sx;
    input.left = input.steerAxis > 0.12;
    input.right = input.steerAxis < -0.12;
  }

  function updateSteerVisual() {
    if (!stickKnob) return;
    const kx = steer.x * steer.r;
    const ky = steer.y * steer.r * 0.22;
    stickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
    if (steerWheel) {
      steerWheel.style.transform = `rotate(${-steer.x * 78}deg)`;
    }
    stickZone.classList.toggle('active', steer.active || Math.abs(steer.x) > 0.04);
  }

  function readSteerFromEvent(e) {
    const rect = stickBase.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    steer.r = Math.min(rect.width, rect.height) * 0.42;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = steer.r;
    dx = THREE_CLAMP(dx, -max, max);
    dy = THREE_CLAMP(dy, -max * 0.35, max * 0.35);
    steer.raw = dx / max;
    steer.y = dy / max;
  }

  function THREE_CLAMP(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function clearSteerHeld() {
    steer.active = false;
    steer.raw = 0;
    steer.y = 0;
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
      let still = false;
      for (const r of pointers.values()) {
        if (r === 'steer') still = true;
      }
      if (!still) clearSteerHeld();
    } else {
      setButton(role, false);
    }
    try {
      root.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  const opts = { passive: false };
  root.addEventListener('pointerdown', onPointerDown, opts);
  root.addEventListener('pointermove', onPointerMove, opts);
  root.addEventListener('pointerup', onPointerUp, opts);
  root.addEventListener('pointercancel', onPointerUp, opts);
  root.addEventListener('lostpointercapture', onPointerUp, opts);

  const app = document.getElementById('app');
  const blockGesture = (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  };
  document.addEventListener('gesturestart', (e) => e.preventDefault(), opts);
  document.addEventListener('gesturechange', (e) => e.preventDefault(), opts);
  if (app) {
    app.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, opts);
    app.addEventListener('touchstart', blockGesture, opts);
  }

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
      clearSteerHeld();
      steer.x = 0;
      applySteer(0);
      updateSteerVisual();
      setButton('throttle', false);
      setButton('brake', false);
      setButton('boost', false);
      pointers.clear();
    }
  }

  function update(dt) {
    if (!visible) return;
    const target = steer.active ? steer.raw : 0;
    const rate = steer.active ? STICK : RETURN;
    const k = 1 - Math.exp(-rate * dt);
    steer.x += (target - steer.x) * k;
    if (!steer.active) {
      steer.y += (0 - steer.y) * k;
    }
    if (Math.abs(steer.x) < 0.004 && !steer.active) steer.x = 0;
    applySteer(steer.x);
    updateSteerVisual();
  }

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
    update,
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
