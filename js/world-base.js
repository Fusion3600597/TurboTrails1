import * as THREE from '../vendor/three.module.js';
import {
  css, mulberry32, makeTexture, makeRoadTexture, makeGlowTexture, softDiscTexture,
} from './textures.js?v=20261108';
import { graphics } from './settings.js?v=20261108';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

export function buildSky(w) {
  const def = w.def;
  const night = def.environment === 'night' || def.environment === 'lava';
  const dusk = def.environment === 'dusk';
  const dir = new THREE.Vector3(
    night ? 0.28 : 0.38,
    night ? 0.52 : 0.68,
    night ? 0.3 : -0.55,
  ).normalize();
  w.sunDir = dir;

  const uniforms = {
    uTop: { value: new THREE.Color(def.skyTop) },
    uBottom: { value: new THREE.Color(def.skyBottom) },
    uSunColor: { value: new THREE.Color(def.sun) },
    uSunDir: { value: dir },
    uNight: { value: night ? 1 : dusk ? 0.65 : 0.0 },
    uGlow: { value: def.environment === 'lava' ? 1.4 : def.environment === 'night' ? 0.7 : 0.3 },
    uTime: { value: 0 },
  };

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1100, 40, 24),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        uniform float uNight;
        uniform float uGlow;
        uniform float uTime;
        varying vec3 vDir;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          float h = clamp(vDir.y * 0.62 + 0.38, 0.0, 1.0);
          vec3 col = mix(uBottom, uTop, pow(h, 0.7));
          float sun = pow(max(dot(vDir, uSunDir), 0.0), 820.0);
          float halo = pow(max(dot(vDir, uSunDir), 0.0), 7.0);
          col += uSunColor * sun * 2.4;
          col += uSunColor * halo * 0.18 * uGlow;

          float star = step(0.9972, hash(floor(vDir * 620.0 + 14.0)));
          star *= smoothstep(-0.04, 0.25, vDir.y) * uNight;
          col += vec3(0.86, 0.92, 1.0) * star * 1.3;

          float band = smoothstep(0.65, 0.9, sin(vDir.x * 4.0 + vDir.z * 5.0 + uTime * 0.025) * 0.5 + 0.5);
          col += vec3(0.15, 0.08, 0.3) * band * uNight * 0.16;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  w.group.add(sky);
  w.sky = sky;
  w.addAnimation((dt, time) => {
    uniforms.uTime.value = time;
  });

  if (night || dusk) {
    const count = night ? 1300 : 450;
    const positions = new Float32Array(count * 3);
    const rng = mulberry32(42 + def.id.length);
    for (let i = 0; i < count; i++) {
      const a = rng() * TAU;
      const y = 0.12 + rng() * 0.85;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      positions[i * 3] = Math.cos(a) * r * 900;
      positions[i * 3 + 1] = y * 900;
      positions[i * 3 + 2] = Math.sin(a) * r * 900;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xd9efff,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: night ? 0.9 : 0.45,
      depthWrite: false,
      fog: false,
    }));
    w.group.add(stars);
  }

  if (!night) {
    const sunPos = dir.clone().multiplyScalar(690);
    w.addGlowSprite(sunPos, def.sun, 90, 0.8);
  } else if (def.environment === 'night') {
    const moonPos = dir.clone().multiplyScalar(720);
    w.addGlowSprite(moonPos, 0xbfe6ff, 50, 0.85);
  }

  if (def.environment !== 'night' && def.environment !== 'lava') {
    const cloudTex = softDiscTexture();
    const rng = mulberry32(811 + def.id.length * 5);
    const cloudMat = new THREE.SpriteMaterial({
      map: cloudTex,
      color: def.environment === 'dusk' ? 0xc6d9ef : 0xffffff,
      transparent: true,
      opacity: def.environment === 'dusk' ? 0.30 : 0.38,
      depthWrite: false,
      fog: false,
    });
    const clouds = [];
    for (let i = 0; i < 22; i++) {
      const a = rng() * TAU;
      const rad = 200 + rng() * 500;
      const cx = Math.cos(a) * rad;
      const cz = Math.sin(a) * rad;
      const cy = 80 + rng() * 120;
      for (let j = 0; j < 3; j++) {
        const spr = new THREE.Sprite(cloudMat.clone());
        spr.position.set(cx + (rng() - 0.5) * 36, cy + (rng() - 0.5) * 12, cz + (rng() - 0.5) * 36);
        spr.scale.set(34 + rng() * 42, 12 + rng() * 12, 1);
        spr.material.opacity *= 0.55 + rng() * 0.45;
        w.group.add(spr);
        clouds.push(spr);
      }
    }
    w.addAnimation((dt) => {
      for (const c of clouds) {
        c.position.x += dt * 0.65;
        if (c.position.x > 720) c.position.x = -720;
      }
    });
  }
}

export function buildLights(w) {
  const def = w.def;
  const night = def.environment === 'night' || def.environment === 'lava';
  const hemi = new THREE.HemisphereLight(
    def.skyBottom,
    def.ground2,
    night ? 4.2 : 1.45,
  );
  w.group.add(hemi);

  const q = graphics();
  const sun = new THREE.DirectionalLight(def.sun, night ? 3.2 : 2.7);
  sun.position.set(85, 110, 45);
  sun.castShadow = q.shadows;
  sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -105;
  sun.shadow.camera.right = 105;
  sun.shadow.camera.top = 105;
  sun.shadow.camera.bottom = -105;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  w.group.add(sun);
  w.group.add(sun.target);
  w.sunLight = sun;
  w.addAnimation((dt, time, playerPos) => {
    if (!playerPos) return;
    sun.position.set(playerPos.x + 75, playerPos.y + 105, playerPos.z + 38);
    sun.target.position.set(playerPos.x, playerPos.y, playerPos.z);
    sun.target.updateMatrixWorld();
  });

  if (def.environment === 'night') {
    const p1 = new THREE.PointLight(0xff2bd6, 45, 90, 2);
    p1.position.set(-20, 12, -12);
    w.group.add(p1);
    const p2 = new THREE.PointLight(0x24e8ff, 35, 80, 2);
    p2.position.set(50, 10, 38);
    w.group.add(p2);
  } else if (def.environment === 'lava') {
    const p = new THREE.PointLight(0xff4b12, 75, 130, 2);
    p.position.set(25, 12, 5);
    w.group.add(p);
  } else if (def.environment === 'dusk') {
    const p = new THREE.PointLight(0x8bdcff, 18, 120, 2);
    p.position.set(-20, 24, 0);
    w.group.add(p);
  }
}

export function buildTerrain(w) {
  const def = w.def;
  const seg = 104;
  const size = 1600;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(def.ground);
  const low = new THREE.Color(def.ground2);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = w.groundHeightAt(x, z);
    pos.setY(i, y);
    const n = (Math.sin(x * 0.06) * Math.cos(z * 0.052) + 1) * 0.5;
    const h = THREE.MathUtils.clamp((y + 4) / 18, 0, 1);
    tmp.copy(low).lerp(base, 0.35 + n * 0.5 + h * 0.2);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: def.environment === 'night' ? 0.5 : 0.96,
    metalness: def.environment === 'night' ? 0.25 : 0.02,
  });
  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  w.group.add(terrain);

  if (def.environment === 'night') {
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600),
      new THREE.MeshStandardMaterial({ color: 0x07070d, roughness: 0.4, metalness: 0.35 }),
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.y = -1.62;
    asphalt.receiveShadow = true;
    w.group.add(asphalt);
  }

  buildMountains(w);
}

function buildMountains(w) {
  const def = w.def;
  if (def.environment === 'night') return;
  const rng = mulberry32(723 + def.id.length * 13);
  const count = def.environment === 'lava' ? 22 : 18;
  const transforms = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + (rng() - 0.5) * 0.2;
    const rad = 270 + rng() * 300;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    const h = 42 + rng() * 95;
    const gy = w.groundHeightAt(x, z);
    transforms.push({
      pos: new THREE.Vector3(x, gy + h * 0.42, z),
      rotY: rng() * TAU,
      scaleX: 45 + rng() * 65,
      scaleY: h,
      scaleZ: 45 + rng() * 65,
      color: new THREE.Color(def.ground2).lerp(new THREE.Color(def.ground), 0.2 + rng() * 0.5),
    });
  }
  const geo = new THREE.ConeGeometry(1, 1, 7, 1);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 1,
    flatShading: true,
  });
  w.addInstanced(geo, mat, transforms, { receiveShadow: false });

  if (def.environment === 'dusk') {
    const caps = transforms.map((t) => ({
      pos: new THREE.Vector3(t.pos.x, t.pos.y + t.scaleY * 0.30, t.pos.z),
      rotY: t.rotY,
      scaleX: t.scaleX * 0.34,
      scaleY: t.scaleY * 0.25,
      scaleZ: t.scaleZ * 0.34,
    }));
    w.addInstanced(
      new THREE.ConeGeometry(1, 1, 7, 1),
      new THREE.MeshStandardMaterial({ color: 0xf3fbff, roughness: 0.8, flatShading: true }),
      caps,
    );
  } else if (def.environment === 'lava') {
    const caps = transforms.map((t) => ({
      pos: new THREE.Vector3(t.pos.x, t.pos.y + t.scaleY * 0.31, t.pos.z),
      rotY: t.rotY,
      scaleX: t.scaleX * 0.22,
      scaleY: t.scaleY * 0.16,
      scaleZ: t.scaleZ * 0.22,
    }));
    w.addInstanced(
      new THREE.ConeGeometry(1, 1, 7, 1),
      new THREE.MeshStandardMaterial({
        color: 0x3a1b17,
        emissive: 0xff3d00,
        emissiveIntensity: 0.9,
        roughness: 0.95,
        flatShading: true,
      }),
      caps,
    );
  }
}

function ribbonGeometry(w, offsetA, offsetB, yA, yB, vScale = 10) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const N = w.N;
  for (let i = 0; i <= N; i++) {
    const s = w.samples[i % N];
    const v = (i / N) * w.length / vScale;
    positions.push(
      s.p.x + s.side.x * offsetA, s.p.y + yA, s.p.z + s.side.z * offsetA,
      s.p.x + s.side.x * offsetB, s.p.y + yB, s.p.z + s.side.z * offsetB,
    );
    uvs.push(0, v, 1, v);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function wallGeometry(w, offset, y0, y1, vScale = 8) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= w.N; i++) {
    const s = w.samples[i % w.N];
    const v = (i / w.N) * w.length / vScale;
    positions.push(
      s.p.x + s.side.x * offset, s.p.y + y0, s.p.z + s.side.z * offset,
      s.p.x + s.side.x * offset, s.p.y + y1, s.p.z + s.side.z * offset,
    );
    uvs.push(v, 0, v, 1);
  }
  for (let i = 0; i < w.N; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeCurbTexture(def) {
  const tex = makeTexture(64, 128, (ctx, w, h) => {
    ctx.fillStyle = css(def.curbA);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(def.curbB);
    ctx.fillRect(0, 0, w, 64);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(0, 0, w, 4);
    ctx.fillRect(0, 62, w, 4);
    ctx.fillRect(61, 0, 3, h);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

function makeShortcutTexture(def) {
  const base = def.environment === 'night' ? '#241a44'
    : def.environment === 'lava' ? '#3b221d'
      : def.environment === 'dusk' ? '#5d6a86'
        : def.environment === 'jungle' ? '#4a5a2c' : '#6b5a3e';
  const tex = makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const rng = mulberry32(41 + def.id.length * 7);
    for (let i = 0; i < 260; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 0.6 + rng() * 2.4;
      ctx.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.09})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = def.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 7;
    ctx.strokeRect(0, 0, w, h);
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const yy of [34, 96]) {
      ctx.beginPath();
      ctx.moveTo(40, yy + 16);
      ctx.lineTo(64, yy - 10);
      ctx.lineTo(88, yy + 16);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function shortcutEnvelope(f) {
  const edge = 0.16;
  const t = Math.min(1, Math.min(f, 1 - f) / edge);
  return t * t * (3 - 2 * t);
}

function shortcutRibbonGeometry(w, sc, fromFrac = 0, toFrac = 1) {
  const N = w.N;
  const i0 = Math.round(sc.t0 * N);
  const i1 = Math.round(sc.t1 * N);
  const steps = Math.max(10, i1 - i0);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let n = 0; n <= steps; n++) {
    const f = n / steps;
    const i = i0 + Math.round((i1 - i0) * f);
    const s = w.samples[((i % N) + N) % N];
    const env = shortcutEnvelope(f);
    const inner = w.half + 0.15;
    const outer = inner + sc.cut * env;
    const a = sc.side * (inner + (outer - inner) * fromFrac);
    const b = sc.side * (inner + (outer - inner) * toFrac);
    positions.push(
      s.p.x + s.side.x * a, s.p.y + 0.055, s.p.z + s.side.z * a,
      s.p.x + s.side.x * b, s.p.y + 0.055, s.p.z + s.side.z * b,
    );
    uvs.push(0, f * 5, 1, f * 5);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildShortcutSurfaces(w) {
  const def = w.def;
  for (const sc of w.shortcuts || []) {
    const surface = new THREE.Mesh(
      shortcutRibbonGeometry(w, sc, 0, 1),
      new THREE.MeshStandardMaterial({
        map: makeShortcutTexture(def),
        roughness: def.environment === 'night' ? 0.45 : 0.92,
        metalness: def.environment === 'night' ? 0.3 : 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    surface.receiveShadow = true;
    w.group.add(surface);

    const edge = new THREE.Mesh(
      shortcutRibbonGeometry(w, sc, 0.86, 1),
      new THREE.MeshBasicMaterial({
        color: def.accent,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    w.group.add(edge);
  }
}

export function buildRoad(w) {
  const def = w.def;
  const half = w.half;
  const roadTex = makeRoadTexture(def);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    color: 0xffffff,
    roughness: def.environment === 'night' ? 0.34 : 0.82,
    metalness: def.environment === 'night' ? 0.38 : 0.04,
  });
  const road = new THREE.Mesh(
    ribbonGeometry(w, -half, half, 0.02, 0.02, 11),
    roadMat,
  );
  road.receiveShadow = true;
  w.group.add(road);
  w.roadMat = roadMat;

  const skirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.road).multiplyScalar(0.55),
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  for (const sign of [-1, 1]) {
    const skirt = new THREE.Mesh(
      wallGeometry(w, sign * half, 0.02, -2.4, 8),
      skirtMat,
    );
    w.group.add(skirt);
  }

  const shoulderColor = def.environment === 'dusk' ? 0xcdedf5
    : def.environment === 'night' ? 0x0b0a12
      : def.environment === 'lava' ? 0x25191b
        : def.environment === 'jungle' ? 0x355f2c : 0x4e9d48;
  const shoulderMat = new THREE.MeshStandardMaterial({
    color: shoulderColor,
    roughness: 0.97,
  });
  for (const sign of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      ribbonGeometry(w, sign * (half + 0.48), sign * (half + 2.9), 0, -0.04, 9),
      shoulderMat,
    );
    shoulder.receiveShadow = true;
    w.group.add(shoulder);
  }

  const curbTex = makeCurbTexture(def);
  const curbMat = new THREE.MeshStandardMaterial({
    map: curbTex,
    roughness: 0.62,
    metalness: def.environment === 'night' ? 0.35 : 0.02,
  });
  for (const sign of [-1, 1]) {
    const curb = new THREE.Mesh(
      ribbonGeometry(w, sign * (half - 0.1), sign * (half + 0.62), 0.045, 0.045, 5),
      curbMat,
    );
    curb.receiveShadow = true;
    w.group.add(curb);
  }

  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xfff7dd,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  for (const sign of [-1, 1]) {
    const line = new THREE.Mesh(
      ribbonGeometry(w, sign * (half - 0.78), sign * (half - 0.56), 0.055, 0.055, 8),
      lineMat,
    );
    w.group.add(line);
  }

  const dashGeo = new THREE.PlaneGeometry(0.16, 2.7);
  dashGeo.rotateX(-Math.PI / 2);
  const dashCount = Math.floor(w.length / 13);
  const dashes = [];
  for (let i = 0; i < dashCount; i++) {
    const spot = w.trackSpot(i / dashCount, 0, 0.06);
    dashes.push({ pos: spot.pos, rotY: spot.yaw });
  }
  w.addInstanced(dashGeo, new THREE.MeshBasicMaterial({
    color: 0xfff5d5,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  }), dashes);

  const supportMat = new THREE.MeshStandardMaterial({ color: 0x8b8b91, roughness: 0.9 });
  const pillarGeo = new THREE.BoxGeometry(1, 1, 1);
  const pillars = [];
  const beams = [];
  for (let i = 0; i < w.N; i += 34) {
    const s = w.samples[i];
    const gy = w.groundHeightAt(s.p.x, s.p.z);
    const h = s.p.y - gy;
    if (h < 2.4) continue;
    for (const sign of [-1, 1]) {
      const off = sign * (half - 1.6);
      pillars.push({
        pos: new THREE.Vector3(s.p.x + s.side.x * off, gy + h / 2, s.p.z + s.side.z * off),
        rotY: s.heading,
        scaleX: 1.05,
        scaleY: h,
        scaleZ: 1.05,
      });
    }
    beams.push({
      pos: new THREE.Vector3(s.p.x, s.p.y - 0.7, s.p.z),
      rotY: s.heading,
      scaleX: half * 2.2,
      scaleY: 0.65,
      scaleZ: 1.1,
    });
  }
  w.addInstanced(pillarGeo, supportMat, pillars);
  w.addInstanced(pillarGeo, supportMat, beams);

  buildShortcutSurfaces(w);
}
