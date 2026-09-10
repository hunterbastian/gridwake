import * as THREE from 'three';

/**
 * Light-cycle path: black slab, razor cyan/amber edges, hard lane geometry.
 * Sparse posts. Darkness dominates the surface.
 */
export function createRoad(scene, options = {}) {
  const detail = options.detail != null ? options.detail : 1;
  const lowDetail = detail < 0.85;

  const points = [];
  const segments = 48;
  const radius = 220;

  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const wobble = Math.sin(t * 3) * 55 + Math.sin(t * 5) * 22;
    const r = radius + wobble;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r * 0.72;
    const y = Math.sin(t * 2) * 8 + Math.cos(t * 3) * 4;
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.35);
  const roadWidth = 14;
  const roadHalf = roadWidth / 2;
  const samples = lowDetail ? 280 : 400;

  const frames = curve.computeFrenetFrames(samples, true);
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];

  const leftRail = [];
  const rightRail = [];
  const centerLine = [];
  const laneL = [];
  const laneR = [];

  const _side = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _flatUp = new THREE.Vector3(0, 1, 0);
  const _yAxis = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const pos = curve.getPointAt(u);
    const tangent = frames.tangents[i % samples];
    _side.crossVectors(_yAxis, tangent).normalize();
    if (_side.lengthSq() < 0.01) {
      _side.copy(frames.binormals[i % samples]);
    }
    _up.crossVectors(tangent, _side).normalize();
    _up.lerp(_flatUp, 0.85).normalize();
    _side.crossVectors(_up, tangent).normalize();

    const left = pos.clone().addScaledVector(_side, roadHalf);
    const right = pos.clone().addScaledVector(_side, -roadHalf);
    left.y += 0.15;
    right.y += 0.15;
    pos.y += 0.15;

    leftRail.push(left.clone().addScaledVector(_side, 0.35));
    rightRail.push(right.clone().addScaledVector(_side, -0.35));
    centerLine.push(pos.clone());
    laneL.push(pos.clone().addScaledVector(_side, roadHalf * 0.33));
    laneR.push(pos.clone().addScaledVector(_side, -roadHalf * 0.33));

    const base = positions.length / 3;
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    colors.push(0.012, 0.016, 0.024, 0.012, 0.016, 0.024);
    uvs.push(0, u * 40, 1, u * 40);

    if (i < samples) {
      const next = base + 2;
      indices.push(base, base + 1, next + 1, base, next + 1, next);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    lights: false,
    uniforms: {
      uCyan: { value: new THREE.Color(0x22d4ff) },
      uAmber: { value: new THREE.Color(0xff7700) },
    },
    vertexShader: `
      attribute vec3 color;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        vUv = uv;
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCyan;
      uniform vec3 uAmber;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        float along = fract(vUv.y * 1.8);
        float across = fract(vUv.x * 4.0);
        float lineY = 1.0 - smoothstep(0.0, 0.028, abs(along - 0.5));
        float lineX = 1.0 - smoothstep(0.0, 0.035, min(across, 1.0 - across));
        float edgeL = 1.0 - smoothstep(0.0, 0.04, vUv.x);
        float edgeR = 1.0 - smoothstep(0.0, 0.04, 1.0 - vUv.x);
        vec3 base = vColor;
        float g = max(lineY * 0.18, lineX * 0.1);
        vec3 col = base + uCyan * g;
        col += uCyan * edgeL * 0.55;
        col += uAmber * edgeR * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const roadMesh = new THREE.Mesh(geo, mat);
  roadMesh.receiveShadow = false;
  scene.add(roadMesh);

  const tubeSegs = lowDetail ? 120 : 220;
  const halo = !lowDetail;
  addNeonStrip(scene, leftRail, 0x22d4ff, 0.055, 0.95, tubeSegs, halo);
  addNeonStrip(scene, rightRail, 0xff7700, 0.055, 0.95, tubeSegs, halo);
  addNeonStrip(scene, centerLine, 0x66e8ff, 0.025, 0.4, tubeSegs, false);
  if (!lowDetail) {
    addDashedFeel(scene, laneL, 0x33ccee);
    addDashedFeel(scene, laneR, 0x33ccee);
  }

  addGuideRails(scene, leftRail, rightRail, { lowDetail, tubeSegs });

  // Closest-point search temps
  const _tmpP = new THREE.Vector3();
  const _tmpP0 = new THREE.Vector3();
  const _tmpP1 = new THREE.Vector3();
  const _point = new THREE.Vector3();
  const _tangent = new THREE.Vector3();
  const _sideOut = new THREE.Vector3();
  const _y = new THREE.Vector3(0, 1, 0);

  // Coarse lookup table for faster closest-point
  const lutSteps = lowDetail ? 64 : 96;
  const lut = [];
  for (let i = 0; i < lutSteps; i++) {
    lut.push(curve.getPointAt(i / lutSteps));
  }

  return {
    curve,
    roadWidth,
    samples,
    getClosestPoint(worldPos) {
      let bestT = 0;
      let bestDist = Infinity;
      for (let i = 0; i < lutSteps; i++) {
        const d = lut[i].distanceToSquared(worldPos);
        if (d < bestDist) {
          bestDist = d;
          bestT = i / lutSteps;
        }
      }
      let t = bestT;
      let dt = 1 / lutSteps;
      for (let iter = 0; iter < 8; iter++) {
        curve.getPointAt(mod1(t - dt), _tmpP0);
        curve.getPointAt(mod1(t + dt), _tmpP1);
        const d0 = _tmpP0.distanceToSquared(worldPos);
        const d1 = _tmpP1.distanceToSquared(worldPos);
        if (d0 < bestDist) {
          bestDist = d0;
          t = mod1(t - dt);
        } else if (d1 < bestDist) {
          bestDist = d1;
          t = mod1(t + dt);
        } else {
          dt *= 0.5;
        }
      }
      curve.getPointAt(t, _point);
      curve.getTangentAt(t, _tangent).normalize();
      _sideOut.crossVectors(_y, _tangent).normalize();
      return { point: _point, tangent: _tangent, side: _sideOut, t, dist: Math.sqrt(bestDist) };
    },
  };
}

function mod1(t) {
  return ((t % 1) + 1) % 1;
}

function addNeonStrip(scene, points, color, width, opacity = 0.95, tubularSegments = 220, halo = true) {
  const curve = new THREE.CatmullRomCurve3(points, true);
  const radial = 4;
  scene.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubularSegments, width, radial, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    )
  );
  if (halo) {
    scene.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubularSegments, width * 3.2, radial, true),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
        })
      )
    );
  }
}

function addDashedFeel(scene, points, color) {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.35,
  });
  const step = 10;
  const _dir = new THREE.Vector3();
  const _z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < points.length - 1; i += step) {
    if ((Math.floor(i / step) % 2) === 1) continue;
    const a = points[i];
    const b = points[Math.min(i + 2, points.length - 1)];
    const mid = a.clone().lerp(b, 0.5);
    const len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, Math.max(0.35, len)), mat);
    seg.position.copy(mid);
    seg.position.y += 0.04;
    _dir.subVectors(b, a).normalize();
    seg.quaternion.setFromUnitVectors(_z, _dir);
    scene.add(seg);
  }
}

function addGuideRails(scene, leftRail, rightRail, opts = {}) {
  const lowDetail = !!opts.lowDetail;
  const tubeSegs = opts.tubeSegs || 200;
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x121a24,
    emissive: 0x0a2030,
    emissiveIntensity: 0.35,
    metalness: 0.88,
    roughness: 0.28,
  });
  const postGeo = new THREE.BoxGeometry(0.16, 2.2, 0.14);
  const capMats = [
    new THREE.MeshBasicMaterial({ color: 0x22d4ff }),
    new THREE.MeshBasicMaterial({ color: 0xff7700 }),
  ];

  const railColors = [0x22d4ff, 0xff7700];
  [leftRail, rightRail].forEach((rail, ri) => {
    const step = lowDetail ? 20 : 14;
    for (let i = 0; i < rail.length; i += step) {
      const p = rail[i];
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(p.x, p.y + 1.05, p.z);
      scene.add(post);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.18), capMats[ri]);
      cap.position.set(p.x, p.y + 2.18, p.z);
      scene.add(cap);
    }
    const elevated = rail.map((p) => p.clone().add(new THREE.Vector3(0, 2.0, 0)));
    const curve = new THREE.CatmullRomCurve3(elevated, true);
    const c = railColors[ri];
    const segs = lowDetail ? 110 : tubeSegs;
    scene.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, segs, 0.035, 4, true),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.92 })
      )
    );
    if (!lowDetail) {
      scene.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, segs, 0.12, 4, true),
          new THREE.MeshBasicMaterial({
            color: c,
            transparent: true,
            opacity: 0.07,
            depthWrite: false,
          })
        )
      );
    }
  });
}
