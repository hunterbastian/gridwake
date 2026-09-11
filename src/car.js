import * as THREE from 'three';

/**
 * Light-cycle / recognizer-adjacent: dark body, razor emissive edges,
 * angular UNSC/Forerunner armor planes. Almost no diffuse color.
 */
export function createCar(options = {}) {
  const lowDetail = !!options.lowDetail;
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e14,
    metalness: 0.95,
    roughness: 0.22,
    emissive: 0x020608,
    emissiveIntensity: 0.15,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x1c2630,
    metalness: 0.9,
    roughness: 0.28,
    emissive: 0x081018,
    emissiveIntensity: 0.12,
  });
  const cyanEdge = new THREE.MeshStandardMaterial({
    color: 0x22d4ff,
    emissive: 0x22d4ff,
    emissiveIntensity: 2.2,
    metalness: 0.2,
    roughness: 0.15,
  });
  const amberEdge = new THREE.MeshStandardMaterial({
    color: 0xff7700,
    emissive: 0xff6600,
    emissiveIntensity: 1.8,
    metalness: 0.2,
    roughness: 0.15,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1820,
    metalness: 0.98,
    roughness: 0.05,
    transparent: true,
    opacity: 0.55,
    emissive: 0x062028,
    emissiveIntensity: 0.4,
  });

  // Low aggressive wedge hull — light-cycle silhouette
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 3.6), bodyMat);
  hull.position.y = 0.42;
  group.add(hull);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 1.0), bodyMat);
  nose.position.set(0, 0.38, 2.0);
  nose.rotation.x = 0.22;
  group.add(nose);

  const armorL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 2.8), armorMat);
  armorL.position.set(0.62, 0.4, 0.05);
  armorL.rotation.z = 0.12;
  group.add(armorL);
  const armorR = armorL.clone();
  armorR.position.x = -0.62;
  armorR.rotation.z = -0.12;
  group.add(armorR);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.1), glassMat);
  canopy.position.set(0, 0.62, -0.15);
  group.add(canopy);

  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.7), bodyMat);
  engine.position.set(0, 0.48, -1.7);
  group.add(engine);

  const finGeo = new THREE.BoxGeometry(0.05, 0.45, 0.55);
  const finL = new THREE.Mesh(finGeo, armorMat);
  finL.position.set(0.48, 0.72, -1.75);
  finL.rotation.z = 0.4;
  group.add(finL);
  const finR = finL.clone();
  finR.position.x = -0.48;
  finR.rotation.z = -0.4;
  group.add(finR);

  const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 3.2), cyanEdge);
  edgeL.position.set(0.58, 0.42, 0.05);
  group.add(edgeL);
  const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 3.2), amberEdge);
  edgeR.position.set(-0.58, 0.42, 0.05);
  group.add(edgeR);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 2.6), cyanEdge);
  spine.position.set(0, 0.57, 0.1);
  group.add(spine);

  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.08), cyanEdge);
  tip.position.set(0, 0.4, 2.45);
  group.add(tip);

  const underglow = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.03, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x22d4ff, transparent: true, opacity: 0.55 })
  );
  underglow.position.y = 0.12;
  group.add(underglow);

  const discMat = new THREE.MeshStandardMaterial({
    color: 0x0c1218,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x061018,
    emissiveIntensity: 0.3,
  });
  const discSegs = lowDetail ? 12 : 24;
  const rimSegs = lowDetail ? 14 : 28;
  const discGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.1, discSegs);
  const wheels = [];
  const wheelPositions = [
    [0.72, 0.42, 0.95],
    [-0.72, 0.42, 0.95],
    [0.72, 0.42, -1.05],
    [-0.72, 0.42, -1.05],
  ];
  for (const [x, y, z] of wheelPositions) {
    const w = new THREE.Mesh(discGeo, discMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
    wheels.push(w);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.025, 6, rimSegs),
      x > 0 ? cyanEdge : amberEdge
    );
    rim.rotation.y = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  }

  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), cyanEdge);
  hl.position.set(0.28, 0.4, 2.35);
  group.add(hl);
  const hl2 = hl.clone();
  hl2.position.x = -0.28;
  group.add(hl2);

  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.04), amberEdge);
  tl.position.set(0.3, 0.48, -2.05);
  group.add(tl);
  const tl2 = tl.clone();
  tl2.position.x = -0.3;
  group.add(tl2);

  const thrusterMat = new THREE.MeshBasicMaterial({
    color: 0x33ddff,
    transparent: true,
    opacity: 0.7,
  });
  const thrSegs = lowDetail ? 8 : 12;
  const thrL = new THREE.Mesh(new THREE.CircleGeometry(0.12, thrSegs), thrusterMat);
  thrL.position.set(0.28, 0.42, -2.08);
  thrL.rotation.y = Math.PI;
  group.add(thrL);
  const thrR = thrL.clone();
  thrR.position.x = -0.28;
  group.add(thrR);

  // Point lights are expensive on mobile — keep headlight, soften/omit tail on low
  const headLight = new THREE.PointLight(0x88eeff, lowDetail ? 1.4 : 2.2, lowDetail ? 18 : 28, 2);
  headLight.position.set(0, 0.5, 2.5);
  group.add(headLight);

  let tailLight = null;
  if (!lowDetail) {
    tailLight = new THREE.PointLight(0xff7722, 1.0, 10, 2);
    tailLight.position.set(0, 0.45, -2.1);
    group.add(tailLight);
  }

  group.position.y = 0;

  return { group, wheels, underglow, headLight, tailLight, thrusterMat };
}

export class CarController {
  constructor(car, road) {
    this.car = car;
    this.road = road;
    this.speed = 0;
    // Tron-cycle urgency: higher cruise + nitro punch, still touch-controllable
    this.maxSpeed = 122;
    this.boostMaxSpeed = 186;
    this.acceleration = 54;
    this.boostAccelMul = 2.42;
    this.brakeForce = 72;
    this.drag = 7;
    this.steerAngle = 0;
    this.maxSteer = 0.05;
    this.boostEnergy = 1;
    this.boosting = false;
    this.yaw = 0;
    this.lateralOffset = 0;
    this.longG = 0;
    this.throttle = 0;
    this.braking = false;

    // Reused temps — no alloc in update
    this._forward = new THREE.Vector3();
    this._toCar = new THREE.Vector3();
    this._push = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);

    const start = road.curve.getPointAt(0);
    const tangent = road.curve.getTangentAt(0).normalize();
    this.car.group.position.copy(start);
    this.car.group.position.y += 0.2;
    this.yaw = Math.atan2(tangent.x, tangent.z);
    this.car.group.rotation.y = this.yaw;
  }

  update(dt, input) {
    const accel = input.forward ? 1 : input.back ? -1 : 0;

    // Analog steer axis (-1..1) preferred; fall back to digital left/right
    let steerInput = 0;
    if (typeof input.steerAxis === 'number' && Math.abs(input.steerAxis) > 0.001) {
      steerInput = input.steerAxis;
    } else {
      steerInput = (input.left ? 1 : 0) + (input.right ? -1 : 0);
    }

    this.boosting = input.boost && this.boostEnergy > 0.05 && this.speed > 10;
    if (this.boosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 0.38);
    } else {
      this.boostEnergy = Math.min(1, this.boostEnergy + dt * 0.11);
    }

    this.throttle = accel > 0 ? 1 : 0;
    this.braking = accel < 0;
    const longTarget = this.boosting ? 1 : accel > 0 ? 0.52 : accel < 0 ? -1 : 0;
    this.longG = THREE.MathUtils.lerp(this.longG, longTarget, 1 - Math.pow(0.05, dt));

    const maxSpd = this.boosting ? this.boostMaxSpeed : this.maxSpeed;

    if (accel > 0) {
      this.speed += this.acceleration * (this.boosting ? this.boostAccelMul : 1) * dt;
    } else if (accel < 0) {
      this.speed -= this.brakeForce * dt;
    } else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.drag * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.drag * dt);
    }

    this.speed = THREE.MathUtils.clamp(this.speed, -28, maxSpd);
    if (!this.boosting && this.speed > this.maxSpeed) {
      this.speed = THREE.MathUtils.lerp(this.speed, this.maxSpeed, 1 - Math.pow(0.012, dt));
    }

    // NFS-like: responsive at cruise, understeer at top speed so touch stays planted
    const spdAbs = Math.abs(this.speed);
    const steerFactor = THREE.MathUtils.clamp(spdAbs / 48, 0.22, 1);
    const highSpd = THREE.MathUtils.clamp((spdAbs - 70) / 110, 0, 1);
    const steerDamp = 1 - highSpd * 0.38;
    const targetSteer = steerInput * this.maxSteer * steerFactor * steerDamp * Math.sign(this.speed || 1);
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, 1 - Math.pow(0.0012, dt));
    this.yaw += this.steerAngle * spdAbs * dt * 2.05;

    this._forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.car.group.position.addScaledVector(this._forward, this.speed * dt);

    const info = this.road.getClosestPoint(this.car.group.position);
    this._toCar.subVectors(this.car.group.position, info.point);
    const lateral = this._toCar.dot(info.side);
    const half = this.road.roadWidth * 0.5 - 0.9;

    if (Math.abs(lateral) > half) {
      const over = Math.abs(lateral) - half;
      this._push.copy(info.side).multiplyScalar(-Math.sign(lateral) * over);
      this.car.group.position.add(this._push);
      this.speed *= 0.92;
      this.yaw += -Math.sign(lateral) * 0.01;
    }

    const targetY = info.point.y + 0.2;
    this.car.group.position.y = THREE.MathUtils.lerp(
      this.car.group.position.y,
      targetY,
      1 - Math.pow(0.0001, dt)
    );

    this.car.group.rotation.order = 'YXZ';
    this.car.group.rotation.y = this.yaw;
    const pitch = Math.asin(THREE.MathUtils.clamp(info.tangent.y, -0.4, 0.4));
    const accelPitch = this.longG * (this.boosting ? 0.055 : 0.04);
    this.car.group.rotation.x = THREE.MathUtils.lerp(
      this.car.group.rotation.x,
      -pitch * 0.5 - accelPitch,
      0.12
    );
    this.car.group.rotation.z = THREE.MathUtils.lerp(
      this.car.group.rotation.z,
      -this.steerAngle * 22,
      0.14
    );

    const wheelSpin = (this.speed * dt) / 0.38;
    for (const w of this.car.wheels) {
      w.rotation.x += wheelSpin;
    }

    const spdN = THREE.MathUtils.clamp(spdAbs / this.maxSpeed, 0, 1.4);
    this.car.underglow.material.opacity = this.boosting ? 0.98 : 0.38 + spdN * 0.28;
    this.car.headLight.intensity = this.boosting
      ? this.car.tailLight
        ? 4.2
        : 2.6
      : this.car.tailLight
        ? 2.0 + spdN * 0.4
        : 1.35;
    if (this.car.thrusterMat) {
      this.car.thrusterMat.opacity = this.boosting ? 1.0 : 0.42 + spdN * 0.28;
      this.car.thrusterMat.color.set(this.boosting ? 0xff9944 : 0x33ddff);
    }

    return info;
  }

  getSpeedKmh() {
    return Math.abs(this.speed) * 3.6;
  }

  getSpeedNorm() {
    return THREE.MathUtils.clamp(Math.abs(this.speed) / this.maxSpeed, 0, 1.35);
  }
}
