import * as THREE from 'three';
import { createRoad } from './road.js';
import { createCar, CarController } from './car.js';
import { createEnvironment } from './environment.js';
import { BoostTrail, AshSnowField } from './particles.js';
import { createQuality } from './quality.js';
import { createTouchControls } from './touch.js';
import { unlockAudio, updateEngine } from './audio.js';
import { getViewportSize, hardenIOS, isIOS } from './ios.js';

const canvas = document.getElementById('game-canvas');
const speedEl = document.getElementById('speed-value');
const boostBar = document.getElementById('boost-bar');
const hintEl = document.getElementById('hint');
const hintBody = document.getElementById('hint-body');
const hintContinue = document.getElementById('hint-continue');
const speedVeil = document.getElementById('speed-veil');

const preferTouch =
  'ontouchstart' in window ||
  (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const view0 = getViewportSize(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !preferTouch,
  powerPreference: isIOS() ? 'default' : 'high-performance',
  alpha: false,
  stencil: false,
  depth: true,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.setClearColor(0x1c1814, 1);
renderer.shadowMap.enabled = false;

const quality = createQuality(renderer);
quality.resize(view0.w, view0.h);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, view0.w / Math.max(1, view0.h), 0.22, 2600);

const envOpts = { detail: quality.detail };
createEnvironment(scene, envOpts);
const road = createRoad(scene, envOpts);
const carMesh = createCar({ lowDetail: quality.mobile });
scene.add(carMesh.group);
const controller = new CarController(carMesh, road);
const trail = new BoostTrail(scene, { lowDetail: quality.mobile });
const ashSnow = new AshSnowField(scene, { lowDetail: quality.mobile });

// NFS chase: hood-adjacent, low, looking far into the vista
const camRestOffset = new THREE.Vector3(0, 1.44, -5.05);
const camRestLook = new THREE.Vector3(0, 0.34, 11.5);
const camPos = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _look = new THREE.Vector3();
const _forward = new THREE.Vector3();
const BASE_FOV = 64;
let camRoll = 0;
let roadScroll = 0;
let shakeT = 0;

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
let pageVisible = document.visibilityState !== 'hidden';
let rafId = 0;

function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hintEl.classList.remove('visible');
}

function engage() {
  unlockAudio();
  if (!started) {
    started = true;
    hideHint();
  }
}

function setupHint() {
  if (!hintBody) return;
  if (preferTouch || quality.mobile) {
    hintBody.textContent = 'Wheel to steer · Hold throttle · Diamond to boost';
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

  if (down && (k === 'KeyA' || k === 'ArrowLeft' || k === 'KeyD' || k === 'ArrowRight')) {
    input.steerAxis = 0;
  }

  if (down) engage();
}

window.addEventListener('keydown', (e) => onKey(e, true));
window.addEventListener('keyup', (e) => onKey(e, false));

const clock = new THREE.Clock();

function onResize(size) {
  const w = size?.w ?? window.innerWidth;
  const h = Math.max(1, size?.h ?? window.innerHeight);
  if (w < 1 || h < 1) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  quality.resize(w, h);
}

hardenIOS({
  canvas,
  onPause() {
    pageVisible = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  },
  onResume() {
    pageVisible = true;
    clock.getDelta();
    if (!rafId) rafId = requestAnimationFrame(animate);
  },
  onResize,
});

window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
window.addEventListener('touchend', unlockAudio, { once: true, passive: true });

{
  const p = carMesh.group.position;
  camera.position.set(p.x, p.y + 1.55, p.z - 5.2);
  camera.lookAt(p.x, p.y + 0.4, p.z + 11);
  lookTarget.set(p.x, p.y + 0.4, p.z + 11);
}

let hudTimer = 0;
let speedText = '0';
let veilOp = 0;

function updateCamera(dt) {
  const g = carMesh.group;
  const speedNorm = controller.getSpeedNorm();
  const boost = controller.boosting ? 1 : 0;
  const brake = Math.max(0, -controller.longG);
  const pull = Math.max(0, controller.longG);

  const fovTarget = BASE_FOV + speedNorm * 28 + boost * 12 - brake * 4;
  camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 1 - Math.pow(0.04, dt));
  camera.updateProjectionMatrix();

  _offset.copy(camRestOffset);
  _offset.z -= speedNorm * 3.4 + boost * 0.75 - brake * 0.85;
  _offset.y -= speedNorm * 0.4;
  _offset.y += pull * 0.2 - brake * 0.12;
  _offset.y = Math.max(1.02, _offset.y);
  _offset.x += controller.steerAngle * 28 * (0.35 + speedNorm * 0.65);

  _offset.applyQuaternion(g.quaternion);
  camPos.copy(g.position).add(_offset);

  if (!reduceMotion) {
    shakeT += dt * (18 + speedNorm * 22);
    const amp = speedNorm * speedNorm * (boost ? 0.05 : 0.026);
    camPos.x += Math.sin(shakeT * 1.7) * amp;
    camPos.y += Math.sin(shakeT * 2.15) * amp * 0.55;
  }

  _look.copy(camRestLook);
  _look.z += speedNorm * 3.2;
  _look.y -= brake * 0.32 - pull * 0.08;
  _look.applyQuaternion(g.quaternion).add(g.position);
  lookTarget.lerp(_look, 1 - Math.pow(0.0012, dt));

  const followPow = THREE.MathUtils.lerp(0.028, 0.09, Math.min(1, speedNorm));
  camera.position.lerp(camPos, 1 - Math.pow(followPow, dt));
  camera.lookAt(lookTarget);

  const rollTarget = -controller.steerAngle * 14 * (0.35 + speedNorm * 0.8);
  camRoll = THREE.MathUtils.lerp(camRoll, rollTarget, 1 - Math.pow(0.04, dt));
  camera.rotateZ(camRoll);
}

function animate(now) {
  rafId = 0;
  if (!pageVisible) return;
  rafId = requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  quality.onFrame(dt, now || performance.now());

  if (touch.update) touch.update(dt);
  controller.update(dt, input);

  const speedNorm = controller.getSpeedNorm();
  _forward.set(Math.sin(controller.yaw), 0, Math.cos(controller.yaw));
  trail.emit(carMesh.group.position, _forward, controller.boosting, speedNorm);
  trail.update(dt);
  ashSnow.update(dt, carMesh.group.position);

  roadScroll += Math.abs(controller.speed) * dt * 0.085;
  if (road.setSpeedScroll) road.setSpeedScroll(roadScroll);

  updateCamera(dt);
  updateEngine(speedNorm, controller.boosting);

  hudTimer += dt;
  if (hudTimer > 0.05) {
    hudTimer = 0;
    const next = String(Math.round(controller.getSpeedKmh()));
    if (next !== speedText) {
      speedText = next;
      speedEl.textContent = next;
    }
    boostBar.style.width = `${Math.round(controller.boostEnergy * 100)}%`;
    if (speedVeil) {
      const target = Math.min(0.72, speedNorm * 0.42 + (controller.boosting ? 0.18 : 0));
      veilOp = veilOp * 0.7 + target * 0.3;
      speedVeil.style.opacity = String(veilOp);
    }
  }

  renderer.render(scene, camera);
}

if (pageVisible) rafId = requestAnimationFrame(animate);
