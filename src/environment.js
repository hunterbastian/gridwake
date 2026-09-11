import * as THREE from 'three';

/**
 * Halo 4 Requiem × post-collapse: open valleys, towering snow peaks,
 * ruined Forerunner bones, dying cyan/amber systems in ash-dust air.
 */
export function createEnvironment(scene, options = {}) {
  const detail = options.detail != null ? options.detail : 1;
  const lowDetail = detail < 0.85;

  addApocalypticSky(scene, lowDetail);
  addWastelandFloor(scene, lowDetail);
  addSnowMountains(scene, lowDetail);
  addDistantRidge(scene, lowDetail);
  addMonumentalMonoliths(scene, lowDetail);
  addRingFragments(scene, lowDetail);
  addLightBridges(scene, lowDetail);
  addSunDisc(scene, lowDetail);

  scene.add(new THREE.AmbientLight(0x2a241c, 0.22));

  const key = new THREE.DirectionalLight(0xffd4a0, 0.62);
  key.position.set(-90, 55, 120);
  key.castShadow = false;
  scene.add(key);

  if (!lowDetail) {
    const tealFill = new THREE.DirectionalLight(0x4aa8c8, 0.1);
    tealFill.position.set(80, 40, -70);
    scene.add(tealFill);
    const snowRim = new THREE.DirectionalLight(0xc8d8e8, 0.08);
    snowRim.position.set(40, 120, 20);
    scene.add(snowRim);
  }

  scene.add(new THREE.HemisphereLight(0x6a6258, 0x1a140e, lowDetail ? 0.32 : 0.26));

  // Dusty-cold haze — thin enough that distant peaks still read
  scene.fog = new THREE.FogExp2(0x3a342c, lowDetail ? 0.00115 : 0.00088);

  return { lowDetail };
}

function addApocalypticSky(scene, lowDetail) {
  const skyGeo = new THREE.SphereGeometry(1600, lowDetail ? 16 : 24, lowDetail ? 10 : 14);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 ashZenith = vec3(0.035, 0.032, 0.038);
        vec3 tealHaze = vec3(0.10, 0.14, 0.16);
        vec3 dustHorizon = vec3(0.32, 0.22, 0.12);
        vec3 sickAmber = vec3(0.42, 0.18, 0.05);
        vec3 snowGlow = vec3(0.22, 0.24, 0.26);
        vec3 col = mix(dustHorizon, tealHaze, smoothstep(-0.06, 0.22, h));
        col = mix(col, ashZenith, smoothstep(0.16, 0.82, h));
        float fire = smoothstep(-0.16, -0.02, h) * smoothstep(0.08, -0.08, h);
        col += sickAmber * fire * 0.55;
        float band = smoothstep(-0.02, 0.14, h) * smoothstep(0.34, 0.08, h);
        col += vec3(0.04, 0.10, 0.12) * band * 0.4;
        col += snowGlow * smoothstep(0.35, 0.85, h) * 0.12;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const starCount = lowDetail ? 280 : 620;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 620 + Math.random() * 700;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloat(0.05, 1));
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xc8d4dc,
        size: 0.85,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    )
  );
}

function addWastelandFloor(scene, lowDetail) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1100, lowDetail ? 20 : 36),
    new THREE.MeshBasicMaterial({ color: 0x14110e })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.6;
  scene.add(ground);

  const gridGeo = new THREE.PlaneGeometry(1400, 1400, 1, 1);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uCyan: { value: new THREE.Color(0x22d4ff) },
      uAmber: { value: new THREE.Color(0xff7700) },
      uDust: { value: new THREE.Color(0x3a3228) },
      uFade: { value: lowDetail ? 520.0 : 640.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCyan;
      uniform vec3 uAmber;
      uniform vec3 uDust;
      uniform float uFade;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 1400.0;
        float cell = 36.0;
        vec2 g = abs(fract(p / cell) - 0.5);
        float line = 1.0 - smoothstep(0.0, 0.016, min(g.x, g.y));
        vec2 mg = abs(fract(p / (cell * 6.0)) - 0.5);
        float major = 1.0 - smoothstep(0.0, 0.01, min(mg.x, mg.y));
        float dist = length(p);
        float fade = 1.0 - smoothstep(uFade * 0.22, uFade, dist);
        vec3 col = mix(uCyan, uAmber, major * 0.4);
        col = mix(uDust, col, 0.55);
        float a = (line * 0.07 + major * 0.16) * fade;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -2.45;
  scene.add(grid);
}

function mountainMaterial() {
  return new THREE.ShaderMaterial({
    lights: false,
    uniforms: {
      uRock: { value: new THREE.Color(0x1c1a18) },
      uDust: { value: new THREE.Color(0x3a3228) },
      uSnow: { value: new THREE.Color(0xe8e4dc) },
      uAshSnow: { value: new THREE.Color(0xb8b0a4) },
    },
    vertexShader: `
      varying float vY;
      varying float vSlope;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vY = wp.y;
        vec3 n = normalize(mat3(modelMatrix) * normal);
        vSlope = max(0.0, n.y);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uRock;
      uniform vec3 uDust;
      uniform vec3 uSnow;
      uniform vec3 uAshSnow;
      varying float vY;
      varying float vSlope;
      void main() {
        vec3 rock = mix(uRock, uDust, smoothstep(-8.0, 50.0, vY) * 0.4);
        float byHeight = smoothstep(55.0, 165.0, vY);
        float bySlope = mix(0.7, 1.0, smoothstep(0.0, 0.42, vSlope));
        float snowAmt = byHeight * bySlope;
        vec3 snow = mix(uAshSnow, uSnow, smoothstep(110.0, 260.0, vY));
        vec3 col = mix(rock, snow, snowAmt);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Towering snow peaks flanking an OPEN valley — gaps of sky/horizon,
 * never a canyon wall around the road.
 */
function addSnowMountains(scene, lowDetail) {
  const mat = mountainMaterial();
  const snowCapMat = new THREE.MeshBasicMaterial({ color: 0xe4e0d6 });
  const segs = lowDetail ? 5 : 7;

  // Two flanking ranges with wide openings so the chase cam sees sky
  const clusters = [
    { a: 0.55, r: 920, h: 480, w: 260, d: 160 },
    { a: 0.95, r: 980, h: 540, w: 290, d: 170 },
    { a: 1.35, r: 940, h: 460, w: 240, d: 150 },
    { a: 3.55, r: 960, h: 500, w: 270, d: 165 },
    { a: 3.95, r: 1020, h: 560, w: 300, d: 175 },
    { a: 4.35, r: 930, h: 470, w: 250, d: 155 },
  ];
  if (!lowDetail) {
    clusters.push(
      { a: 0.22, r: 1050, h: 420, w: 220, d: 140 },
      { a: 1.72, r: 1080, h: 400, w: 210, d: 135 },
      { a: 3.22, r: 1040, h: 430, w: 225, d: 142 },
      { a: 4.72, r: 1070, h: 410, w: 215, d: 138 }
    );
  }

  for (let i = 0; i < clusters.length; i++) {
    const s = clusters[i];
    const x = Math.cos(s.a) * s.r;
    const z = Math.sin(s.a) * s.r * 0.86;
    const peaks = lowDetail ? 2 : 3;
    for (let p = 0; p < peaks; p++) {
      const spread = (p - (peaks - 1) * 0.5) * (s.w * 0.36);
      const ph = s.h * (1 - p * 0.16) * (0.9 + (i % 3) * 0.05);
      const pw = s.w * (0.4 - p * 0.07);
      const ox = x + Math.cos(s.a + 1.57) * spread;
      const oz = z + Math.sin(s.a + 1.57) * spread;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(pw, ph, segs), mat);
      const cy = ph * 0.38 - 22;
      cone.position.set(ox, cy, oz);
      cone.rotation.y = s.a + p * 0.2;
      cone.rotation.z = (p === 1 ? 0.05 : p === 2 ? -0.04 : 0.015) * (i % 2 === 0 ? 1 : -1);
      scene.add(cone);

      const capH = ph * 0.22;
      const capR = pw * 0.34;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(capR, capH, segs), snowCapMat);
      cap.position.set(ox, cy + ph * 0.38, oz);
      cap.rotation.copy(cone.rotation);
      scene.add(cap);
    }
  }
}

function addDistantRidge(scene, lowDetail) {
  const segments = lowDetail ? 24 : 36;
  const radius = 1280;
  const peakH = 210;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const step = Math.floor(t * 11) / 11;
    const noise =
      Math.sin(step * 3.4) * 0.5 +
      Math.sin(step * 9.1) * 0.22 +
      Math.cos(step * 2.1 + 0.7) * 0.28;
    const h = Math.max(28, (0.35 + noise) * peakH);
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius * 0.88;
    positions.push(x, -8, z);
    positions.push(x * 0.985, h - 8, z * 0.985);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, mountainMaterial()));
}

function addMonumentalMonoliths(scene, lowDetail) {
  const stone = new THREE.MeshStandardMaterial({
    color: 0x222830,
    metalness: 0.7,
    roughness: 0.48,
    emissive: 0x061018,
    emissiveIntensity: 0.2,
    flatShading: true,
  });
  const seam = new THREE.MeshBasicMaterial({
    color: 0x33ddff,
    transparent: true,
    opacity: 0.7,
  });
  const amberSeam = new THREE.MeshBasicMaterial({
    color: 0xff7700,
    transparent: true,
    opacity: 0.55,
  });

  const specs = [
    { a: 0.4, r: 210, h: 96, w: 14, d: 9, yaw: 0.35, lean: 0.08, bury: 16 },
    { a: 1.15, r: 265, h: 124, w: 16, d: 10, yaw: -0.22, lean: -0.12, bury: 24 },
    { a: 2.05, r: 230, h: 78, w: 12, d: 8, yaw: 0.7, lean: 0.16, bury: 12 },
    { a: 2.9, r: 300, h: 140, w: 18, d: 12, yaw: 0.12, lean: -0.07, bury: 30 },
    { a: 3.75, r: 245, h: 86, w: 13, d: 9, yaw: -0.45, lean: 0.11, bury: 18 },
    { a: 4.55, r: 280, h: 110, w: 15, d: 10, yaw: 0.55, lean: -0.09, bury: 20 },
    { a: 5.35, r: 220, h: 70, w: 11, d: 7, yaw: -0.28, lean: 0.14, bury: 10 },
    { a: 6.0, r: 320, h: 156, w: 20, d: 13, yaw: 0.2, lean: -0.05, bury: 34 },
  ];
  const use = lowDetail ? specs.filter((_, i) => i % 2 === 0) : specs;
  const _offset = new THREE.Vector3();
  const _yAxis = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < use.length; i++) {
    const s = use[i];
    const x = Math.cos(s.a) * s.r;
    const z = Math.sin(s.a) * s.r * 0.78;
    const levels = lowDetail ? 2 : 3 + (i % 2);
    let yBase = -2.2 - s.bury;
    for (let lv = 0; lv < levels; lv++) {
      const shrink = 1 - lv * 0.14;
      const lh = s.h / levels;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(s.w * shrink, lh, s.d * shrink),
        stone
      );
      block.position.set(x, yBase + lh * 0.5, z);
      block.rotation.y = s.yaw;
      block.rotation.z = s.lean;
      scene.add(block);
      yBase += lh;

      if (lv < levels - 1) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(s.w * shrink * 0.92, 0.08, s.d * shrink * 0.92),
          i % 3 === 0 ? amberSeam : seam
        );
        strip.position.set(x, yBase, z);
        strip.rotation.y = s.yaw;
        strip.rotation.z = s.lean;
        scene.add(strip);
      }
    }

    const channel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, s.h * 0.7, 0.12),
      seam
    );
    _offset.set(s.w * 0.42, s.h * 0.28 - s.bury, 0);
    _offset.applyAxisAngle(_yAxis, s.yaw);
    channel.position.set(x + _offset.x, _offset.y, z + _offset.z);
    scene.add(channel);

    if (!lowDetail) {
      const rubble = new THREE.Mesh(
        new THREE.BoxGeometry(s.w * 0.45, 3.2, s.d * 0.4),
        stone
      );
      rubble.position.set(x + 8, -1.2, z + 6);
      rubble.rotation.set(0.3, s.yaw, 0.4);
      scene.add(rubble);
    }
  }
}

function addRingFragments(scene, lowDetail) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x2a323c,
    transparent: false,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0x22d4ff,
    transparent: true,
    opacity: 0.35,
  });
  const arcs = lowDetail
    ? [{ r: 520, tube: 4.5, arc: 0.7, y: 210, rot: 0.4, tilt: 0.35 }]
    : [
        { r: 540, tube: 5.2, arc: 0.85, y: 230, rot: 0.3, tilt: 0.4 },
        { r: 610, tube: 3.6, arc: 0.5, y: 310, rot: 1.8, tilt: -0.25 },
        { r: 480, tube: 4.0, arc: 0.42, y: 160, rot: 3.4, tilt: 0.18 },
      ];
  const radial = lowDetail ? 6 : 8;
  const tubular = lowDetail ? 24 : 40;
  for (const a of arcs) {
    const geo = new THREE.TorusGeometry(a.r, a.tube, radial, tubular, a.arc * Math.PI);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = a.y;
    mesh.rotation.set(a.tilt, a.rot, 0.15);
    scene.add(mesh);
    if (!lowDetail) {
      const g = new THREE.Mesh(
        new THREE.TorusGeometry(a.r, a.tube * 0.18, 4, tubular, a.arc * Math.PI),
        glow
      );
      g.position.copy(mesh.position);
      g.rotation.copy(mesh.rotation);
      scene.add(g);
    }
  }
}

function addLightBridges(scene, lowDetail) {
  const cyan = new THREE.MeshBasicMaterial({
    color: 0x22d4ff,
    transparent: true,
    opacity: 0.45,
  });
  const spans = lowDetail
    ? [{ a: 1.1, r: 250, y: 58, len: 54 }]
    : [
        { a: 0.85, r: 248, y: 64, len: 62 },
        { a: 2.6, r: 270, y: 78, len: 70 },
        { a: 4.4, r: 255, y: 52, len: 56 },
      ];
  for (const s of spans) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(s.len, 0.22, 0.9), cyan);
    beam.position.set(Math.cos(s.a) * s.r, s.y, Math.sin(s.a) * s.r * 0.78);
    beam.rotation.y = s.a + Math.PI / 2;
    scene.add(beam);
  }
}

function addSunDisc(scene, lowDetail) {
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(42, lowDetail ? 12 : 20),
    new THREE.MeshBasicMaterial({
      color: 0xffc078,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  sun.position.set(-420, 95, 620);
  sun.lookAt(0, 20, 0);
  scene.add(sun);
  if (!lowDetail) {
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(110, 20),
      new THREE.MeshBasicMaterial({
        color: 0xff9944,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    halo.position.copy(sun.position);
    halo.quaternion.copy(sun.quaternion);
    scene.add(halo);
  }
}
