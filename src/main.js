import * as THREE from 'three';
import { createRoad } from './road.js';
import { createCar, CarController } from './car.js';
import { createEnvironment } from './environment.js';
import { BoostTrail } from './particles.js';
import { createQuality } from './quality.js';
import { createTouchControls } from './touch.js';

const canvas = document.getElementById('game-canvas');
const speedEl = document.getElementById('speed-value');
const boostBar = document.getElementById('boost-bar');
const hintEl = document.getElementById('hint');
const hintBody = document.getElementById('hint-body');
const hintContinue = document.getElementById('hint-continue');

// Detect mobile early for renderer flags
const preferTouch =
  'ontouchstart' in window ||
  (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !preferTouch,
  powerPreference: 'high-performance',
  alpha: false,
  stencil: false,
  depth: true,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.setClearColor(0x020508, 1);
renderer.shadowMap.enabled = false;

const quality = createQuality(renderer);
quality.resize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1400);

const envOpts = { detail: quality.detail };
createEnvironment(scene, envOpts);
const road = createRoad(scene, envOpts);
const carMesh = createCar({ lowDetail: quality.mobile });
scene.add(carMesh.group);
const controller = new CarController(carMesh, road);
const trail = new BoostTrail(scene, { lowDetail: quality.mobile });

// Lower chase cam — more dramatic, trailer-shot angle
const camOffset = new THREE.Vector3(0, 2.8, -8.2);
const camLook = new THREE.Vector3(0, 0.85, 7);
const camPos = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _look = new THREE.Vector3();
const _forward = new THREE.Vector3();

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  boost: false,
  steerAxis: 0,
};

let started = false;
let hintHidden = false;
let pageVisible = true;
let rafId = 0;

function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hintEl.classList.remove('visible');
}

function engage() {
  if (!started) {
    started = true;
    hideHint();
  }
}

// Hint copy: short Apple-style lines — touch vs keyboard
function setupHint() {
  if (!hintBody) return;
  if (preferTouch || quality.mobile) {
    hintBody.textContent = 'Stick to steer · Hold to accelerate · Diamond to boost';
  } else {
    hintBody.textContent = 'W S A D to drive · Space to boost';
  }
}
setupHint();

if (hintContinue) {
  hintContinue.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    engage();
  });
}

const touch = createTouchControls(input, { onEngage: engage });

function onKey(e, down) {
  const k = e.code;
  if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'Space'].includes(k)) {
    e.preventDefault();
  }
  if (k === 'KeyW' || k === 'ArrowUp') input.forward = down;
  if (k === 'KeyS' || k === 'ArrowDown') input.back = down;
  if (k === 'KeyA' || k === 'ArrowLeft') input.left = down;
  if (k === 'KeyD' || k === 'ArrowRight') input.right = down;
  if (k === 'Space') input.boost = down;

  // Keyboard clears analog so digital works cleanly
  if (down && (k === 'KeyA' || k === 'ArrowLeft' || k === 'KeyD' || k === 'ArrowRight')) {
    input.steerAxis = 0;
  }

  if (down) engage();
}

window.addEventListener('keydown', (e) => onKey(e, true));
window.addEventListener('keyup', (e) => onKey(e, false));

function onResize() {
  const w = Math.round(canvas.clientWidth || window.innerWidth);
  const h = Math.round(canvas.clientHeight || window.innerHeight);
  if (w < 1 || h < 1) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  quality.resize(w, h);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => {
  setTimeout(onResize, 120);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onResize);
}

window.addEventListener(
  'scroll',
  () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
  },
  { passive: true }
);

document.addEventListener('visibilitychange', () => {
  pageVisible = document.visibilityState === 'visible';
  if (pageVisible) {
    clock.getDelta(); // flush large dt
    if (!rafId) rafId = requestAnimationFrame(animate);
  }
});

// Initial camera
{
  const p = carMesh.group.position;
  camera.position.set(p.x, p.y + 3.2, p.z - 9);
  camera.lookAt(p.x, p.y + 0.8, p.z + 6);
  lookTarget.set(p.x, p.y + 0.8, p.z + 6);
}

const clock = new THREE.Clock();
let hudTimer = 0;
let speedText = '0';

function updateCamera(dt) {
  const g = carMesh.group;
  const speedNorm = Math.min(controller.speed / controller.maxSpeed, 1);
  const boostZoom = controller.boosting ? 1.15 : 1;
  const fovTarget = 72 + speedNorm * 18 * boostZoom;
  camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 0.1);
  camera.updateProjectionMatrix();

  _offset.copy(camOffset);
  _offset.z -= speedNorm * 5;
  _offset.y -= speedNorm * 0.35;
  _offset.applyQuaternion(g.quaternion);
  camPos.copy(g.position).add(_offset);

  _look.copy(camLook).applyQuaternion(g.quaternion).add(g.position);
  lookTarget.lerp(_look, 1 - Math.pow(0.0008, dt));

  camera.position.lerp(camPos, 1 - Math.pow(0.015, dt));
  camera.lookAt(lookTarget);
}

function animate(now) {
  rafId = 0;
  if (!pageVisible) return;
  rafId = requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  quality.onFrame(dt, now || performance.now());

  controller.update(dt, input);

  _forward.set(Math.sin(controller.yaw), 0, Math.cos(controller.yaw));
  trail.emit(carMesh.group.position, _forward, controller.boosting);
  trail.update(dt);

  updateCamera(dt);

  hudTimer += dt;
  if (hudTimer > 0.05) {
    hudTimer = 0;
    // Clean tabular number — no arcade zero-padding
    const next = String(Math.round(controller.getSpeedKmh()));
    if (next !== speedText) {
      speedText = next;
      speedEl.textContent = next;
    }
    boostBar.style.width = `${Math.round(controller.boostEnergy * 100)}%`;
  }

  renderer.render(scene, camera);
}

rafId = requestAnimationFrame(animate);
