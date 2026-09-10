import * as THREE from 'three';

/**
 * Continuous Tron light-ribbon trail — dual rails that persist behind the cycle.
 * Preallocated buffers — no GC in the hot path.
 */
export class BoostTrail {
  constructor(scene, options = {}) {
    this.historyLen = options.lowDetail ? 32 : 48;
    this.historyL = [];
    this.historyR = [];
    // Pool of Vector3s so emit never allocates
    this._poolL = [];
    this._poolR = [];
    for (let i = 0; i < this.historyLen; i++) {
      this._poolL.push(new THREE.Vector3());
      this._poolR.push(new THREE.Vector3());
    }
    this._histIdx = 0;
    this._count = 0;

    this.active = false;
    this.fade = 0;

    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();

    const maxN = this.historyLen;
    this._ribbonPos = new Float32Array(maxN * 2 * 3);
    this._linePos = new Float32Array(maxN * 3);
    this._indices = new Uint16Array((maxN - 1) * 6);

    this.ribbonGeoL = new THREE.BufferGeometry();
    this.ribbonGeoR = new THREE.BufferGeometry();
    this.ribbonGeoL.setAttribute('position', new THREE.BufferAttribute(this._ribbonPos.slice(), 3));
    this.ribbonGeoR.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxN * 2 * 3), 3));
    this.ribbonGeoL.setIndex(new THREE.BufferAttribute(this._indices.slice(), 1));
    this.ribbonGeoR.setIndex(new THREE.BufferAttribute(new Uint16Array((maxN - 1) * 6), 1));

    this.matL = new THREE.MeshBasicMaterial({
      color: 0x22d4ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.matR = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.meshL = new THREE.Mesh(this.ribbonGeoL, this.matL);
    this.meshR = new THREE.Mesh(this.ribbonGeoR, this.matR);
    this.meshL.frustumCulled = false;
    this.meshR.frustumCulled = false;
    scene.add(this.meshL);
    scene.add(this.meshR);

    this.lineMatL = new THREE.LineBasicMaterial({
      color: 0xa8f4ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lineMatR = new THREE.LineBasicMaterial({
      color: 0xffcc88,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lineGeoL = new THREE.BufferGeometry();
    this.lineGeoR = new THREE.BufferGeometry();
    this.lineGeoL.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxN * 3), 3));
    this.lineGeoR.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxN * 3), 3));
    this.lineL = new THREE.Line(this.lineGeoL, this.lineMatL);
    this.lineR = new THREE.Line(this.lineGeoR, this.lineMatR);
    this.lineL.frustumCulled = false;
    this.lineR.frustumCulled = false;
    scene.add(this.lineL);
    scene.add(this.lineR);

    // Ring buffers of points (stable Vector3 refs)
    this._ringL = new Array(maxN);
    this._ringR = new Array(maxN);
    for (let i = 0; i < maxN; i++) {
      this._ringL[i] = new THREE.Vector3();
      this._ringR[i] = new THREE.Vector3();
    }
    this._head = 0;
    this._len = 0;
  }

  emit(origin, forward, boosting) {
    this.active = boosting;
    this._fwd.copy(forward).normalize();
    this._right.set(this._fwd.z, 0, -this._fwd.x).normalize();

    if (boosting) {
      this.fade = Math.min(1, this.fade + 0.15);
      const rear = this._tmp.copy(origin).addScaledVector(this._fwd, -1.9);
      rear.y += 0.38;

      const idx = this._head;
      this._ringL[idx].copy(rear).addScaledVector(this._right, 0.55);
      this._ringR[idx].copy(rear).addScaledVector(this._right, -0.55);
      this._head = (this._head + 1) % this.historyLen;
      if (this._len < this.historyLen) this._len++;
    } else {
      this.fade = Math.max(0, this.fade - 0.04);
      if (this._len > 2) {
        // Advance start by shrinking length (drop oldest)
        this._len--;
      }
      if (this.fade <= 0.01) {
        this._len = 0;
        this._head = 0;
      }
    }

    this._rebuildRibbon(this._ringL, this.ribbonGeoL, this.lineGeoL);
    this._rebuildRibbon(this._ringR, this.ribbonGeoR, this.lineGeoR);

    const op = this.fade;
    this.matL.opacity = op * 0.55;
    this.matR.opacity = op * 0.5;
    this.lineMatL.opacity = op * 0.95;
    this.lineMatR.opacity = op * 0.9;
    this.meshL.visible = op > 0.02;
    this.meshR.visible = op > 0.02;
    this.lineL.visible = op > 0.02;
    this.lineR.visible = op > 0.02;
  }

  _rebuildRibbon(ring, ribbonGeo, lineGeo) {
    const n = this._len;
    const posAttr = ribbonGeo.getAttribute('position');
    const lineAttr = lineGeo.getAttribute('position');
    const idxAttr = ribbonGeo.getIndex();

    if (n < 2) {
      ribbonGeo.setDrawRange(0, 0);
      lineGeo.setDrawRange(0, 0);
      return;
    }

    const halfW = 0.12;
    const start = (this._head - n + this.historyLen) % this.historyLen;

    for (let i = 0; i < n; i++) {
      const ri = (start + i) % this.historyLen;
      const p = ring[ri];
      const riNext = (start + Math.min(i + 1, n - 1)) % this.historyLen;
      const riPrev = (start + Math.max(i - 1, 0)) % this.historyLen;

      if (i < n - 1) {
        this._dir.subVectors(ring[riNext], p);
      } else {
        this._dir.subVectors(p, ring[riPrev]);
      }
      if (this._dir.lengthSq() < 1e-8) this._dir.set(0, 0, 1);
      else this._dir.normalize();

      this._side.set(this._dir.z, 0, -this._dir.x).normalize();
      const w = halfW * (0.35 + 0.65 * (i / (n - 1)));
      this._a.copy(p).addScaledVector(this._side, w);
      this._b.copy(p).addScaledVector(this._side, -w);

      const i6 = i * 6;
      posAttr.array[i6] = this._a.x;
      posAttr.array[i6 + 1] = this._a.y;
      posAttr.array[i6 + 2] = this._a.z;
      posAttr.array[i6 + 3] = this._b.x;
      posAttr.array[i6 + 4] = this._b.y;
      posAttr.array[i6 + 5] = this._b.z;

      lineAttr.array[i * 3] = p.x;
      lineAttr.array[i * 3 + 1] = p.y;
      lineAttr.array[i * 3 + 2] = p.z;

      if (i < n - 1) {
        const base = i * 2;
        const ii = i * 6;
        idxAttr.array[ii] = base;
        idxAttr.array[ii + 1] = base + 1;
        idxAttr.array[ii + 2] = base + 3;
        idxAttr.array[ii + 3] = base;
        idxAttr.array[ii + 4] = base + 3;
        idxAttr.array[ii + 5] = base + 2;
      }
    }

    posAttr.needsUpdate = true;
    lineAttr.needsUpdate = true;
    idxAttr.needsUpdate = true;
    ribbonGeo.setDrawRange(0, (n - 1) * 6);
    lineGeo.setDrawRange(0, n);
  }

  update(_dt) {
    // History-driven; emit handles fade
  }
}
