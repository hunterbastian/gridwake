import * as THREE from 'three';

/**
 * Black void + sparse cyan grid + few monumental Forerunner monoliths.
 * One cool key light. No party cyberpunk fill.
 */
export function createEnvironment(scene, options = {}) {
  const detail = options.detail != null ? options.detail : 1;
  const lowDetail = detail < 0.85;

  const skySegW = lowDetail ? 16 : 28;
  const skySegH = lowDetail ? 10 : 14;
  const skyGeo = new THREE.SphereGeometry(950, skySegW, skySegH);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
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
        vec3 voidBlack = vec3(0.004, 0.006, 0.012);
        vec3 navy = vec3(0.012, 0.028, 0.055);
        vec3 horizonCyan = vec3(0.04, 0.14, 0.20);
        vec3 col = mix(horizonCyan, navy, smoothstep(-0.08, 0.18, h));
        col = mix(col, voidBlack, smoothstep(0.12, 0.85, h));
        float band = smoothstep(-0.02, 0.12, h) * smoothstep(0.32, 0.10, h);
        col += vec3(0.02, 0.09, 0.14) * band * 0.45;
        float amber = smoothstep(-0.18, -0.04, h) * smoothstep(0.04, -0.06, h);
        col += vec3(0.22, 0.07, 0.01) * amber * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const starCount = lowDetail ? 400 : 900;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 420 + Math.random() * 480;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloat(-0.1, 1));
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
        color: 0xa8d8ef,
        size: 0.9,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    )
  );

  addInfiniteGrid(scene, lowDetail);
  addMonumentalMonoliths(scene, lowDetail);
  addRingCliffs(scene, lowDetail);
  addDistantSilhouetteWall(scene, lowDetail);

  scene.add(new THREE.AmbientLight(0x0a1520, 0.18));

  const key = new THREE.DirectionalLight(0xb8d8ef, 0.42);
  key.position.set(-70, 160, 40);
  key.castShadow = false;
  scene.add(key);

  if (!lowDetail) {
    const cyanFill = new THREE.DirectionalLight(0x33ccff, 0.08);
    cyanFill.position.set(60, 40, -90);
    scene.add(cyanFill);

    const amberRim = new THREE.DirectionalLight(0xff7700, 0.06);
    amberRim.position.set(-50, 15, 100);
    scene.add(amberRim);
  }

  scene.add(new THREE.HemisphereLight(0x1a3048, 0x020508, lowDetail ? 0.28 : 0.22));

  // Slightly cheaper fog density on mobile still looks deep
  scene.fog = new THREE.FogExp2(0x030810, lowDetail ? 0.0036 : 0.0032);

  return { lowDetail };
}

function addInfiniteGrid(scene, lowDetail) {
  const groundSegs = lowDetail ? 24 : 48;
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(560, groundSegs),
    new THREE.MeshBasicMaterial({ color: 0x020508 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.4;
  scene.add(ground);

  const gridSize = 1000;
  const gridGeo = new THREE.PlaneGeometry(gridSize, gridSize, 1, 1);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uCyan: { value: new THREE.Color(0x22d4ff) },
      uAmber: { value: new THREE.Color(0xff7700) },
      uFade: { value: lowDetail ? 360.0 : 420.0 },
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
      uniform float uFade;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 1000.0;
        float cell = 22.0;
        vec2 g = abs(fract(p / cell) - 0.5);
        float line = 1.0 - smoothstep(0.0, 0.018, min(g.x, g.y));
        vec2 mg = abs(fract(p / (cell * 5.0)) - 0.5);
        float major = 1.0 - smoothstep(0.0, 0.012, min(mg.x, mg.y));
        float dist = length(p);
        float fade = 1.0 - smoothstep(uFade * 0.25, uFade, dist);
        vec3 col = mix(uCyan, uAmber, major * 0.35);
        float a = (line * 0.12 + major * 0.28) * fade;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -2.25;
  scene.add(grid);
}

function addMonumentalMonoliths(scene, lowDetail) {
  const stone = new THREE.MeshStandardMaterial({
    color: 0x1a2430,
    metalness: 0.72,
    roughness: 0.42,
    emissive: 0x061018,
    emissiveIntensity: 0.25,
    flatShading: true,
  });
  const seam = new THREE.MeshBasicMaterial({
    color: 0x33ddff,
    transparent: true,
    opacity: 0.85,
  });
  const amberSeam = new THREE.MeshBasicMaterial({
    color: 0xff7700,
    transparent: true,
    opacity: 0.7,
  });

  const specs = [
    { a: 0.35, r: 95, h: 72, w: 14, d: 9, yaw: 0.4 },
    { a: 1.1, r: 130, h: 95, w: 18, d: 11, yaw: -0.2 },
    { a: 2.0, r: 110, h: 58, w: 12, d: 8, yaw: 0.8 },
    { a: 2.8, r: 160, h: 110, w: 22, d: 12, yaw: 0.15 },
    { a: 3.6, r: 120, h: 68, w: 15, d: 9, yaw: -0.5 },
    { a: 4.4, r: 145, h: 88, w: 16, d: 10, yaw: 0.6 },
    { a: 5.2, r: 100, h: 52, w: 11, d: 7, yaw: -0.3 },
    { a: 5.9, r: 175, h: 120, w: 24, d: 14, yaw: 0.25 },
  ];

  const use = lowDetail ? specs.filter((_, i) => i % 2 === 0) : specs;
  const _offset = new THREE.Vector3();
  const _yAxis = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < use.length; i++) {
    const s = use[i];
    const x = Math.cos(s.a) * s.r;
    const z = Math.sin(s.a) * s.r;

    const levels = lowDetail ? 2 : 3 + (i % 2);
    let yBase = -2.2;
    for (let lv = 0; lv < levels; lv++) {
      const shrink = 1 - lv * 0.14;
      const lh = s.h / levels;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(s.w * shrink, lh, s.d * shrink),
        stone
      );
      block.position.set(x, yBase + lh * 0.5, z);
      block.rotation.y = s.yaw;
      scene.add(block);
      yBase += lh;

      if (lv < levels - 1) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(s.w * shrink * 0.92, 0.08, s.d * shrink * 0.92),
          i % 3 === 0 ? amberSeam : seam
        );
        strip.position.set(x, yBase, z);
        strip.rotation.y = s.yaw;
        scene.add(strip);
      }
    }

    const channel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, s.h * 0.85, 0.12),
      seam
    );
    _offset.set(s.w * 0.42, s.h * 0.4 - 2, 0);
    _offset.applyAxisAngle(_yAxis, s.yaw);
    channel.position.set(x + _offset.x, _offset.y, z + _offset.z);
    scene.add(channel);
  }
}

function addRingCliffs(scene, lowDetail) {
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x101820,
    metalness: 0.6,
    roughness: 0.48,
    emissive: 0x050c14,
    emissiveIntensity: 0.2,
    flatShading: true,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x22ccff,
    transparent: true,
    opacity: 0.55,
  });

  const count = lowDetail ? 4 : 7;
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 1.35 + 0.55;
    const r = 280 + (i % 3) * 35;
    const h = 55 + (i % 4) * 22;
    const w = 42 + (i % 3) * 18;
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(w, h, 10), cliffMat);
    cliff.position.set(Math.cos(t) * r, h * 0.32 - 6, Math.sin(t) * r);
    cliff.lookAt(0, cliff.position.y, 0);
    cliff.rotation.y += Math.PI;
    scene.add(cliff);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.18, 0.35), glowMat);
    strip.position.copy(cliff.position);
    strip.position.y += h * 0.12;
    strip.quaternion.copy(cliff.quaternion);
    scene.add(strip);

    if (!lowDetail && i % 2 === 0) {
      const strip2 = strip.clone();
      strip2.position.y -= h * 0.22;
      scene.add(strip2);
    }
  }
}

function addDistantSilhouetteWall(scene, lowDetail) {
  const segments = lowDetail ? 24 : 36;
  const radius = 380;
  const peakH = 70;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const step = Math.floor(t * 9) / 9;
    const noise =
      Math.sin(step * 4.2) * 0.45 +
      Math.sin(step * 11) * 0.2 +
      Math.cos(step * 2.7 + 1.1) * 0.3;
    const h = Math.max(0.05, (0.35 + noise) * peakH);
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    positions.push(x, -2, z);
    positions.push(x * 0.98, h - 2, z * 0.98);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  scene.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: 0x050a10,
        side: THREE.DoubleSide,
        flatShading: true,
      })
    )
  );
}
