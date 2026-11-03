import * as THREE from '../vendor/three.module.js';
import {
  css, mulberry32, makeSignTexture, makeStoneTexture, makeTexture, softDiscTexture,
} from './textures.js?v=20261108';
import { buildNeonScenery, buildJungleScenery, buildVolcanoScenery } from './scenery2.js?v=20261108';

const TAU = Math.PI * 2;

export function pbr(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
    ...opts,
  });
}

export function addArch(w, t, opts = {}) {
  const half = w.half;
  const spot = w.trackSpot(t, 0, 0);
  const group = new THREE.Group();
  group.position.copy(spot.pos);
  group.rotation.y = spot.yaw;
  w.group.add(group);
  const height = opts.height ?? 8;
  const pillarMat = pbr(opts.pillarColor ?? 0x292b38, {
    metalness: opts.metalness ?? 0.4,
    roughness: opts.roughness ?? 0.45,
  });
  const trimMat = new THREE.MeshBasicMaterial({
    color: opts.colorA ?? w.def.accent,
    toneMapped: false,
  });
  const trimMat2 = new THREE.MeshBasicMaterial({
    color: opts.colorB ?? w.def.accent2,
    toneMapped: false,
  });
  for (const sign of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, height, 1.1), pillarMat);
    pillar.position.set(sign * (half + 2.9), height / 2, 0);
    pillar.castShadow = true;
    group.add(pillar);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, height - 1.2, 1.24), sign > 0 ? trimMat : trimMat2);
    strip.position.set(sign * (half + 2.3), height / 2, 0);
    group.add(strip);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 6.9, 0.9, 1.2), pillarMat);
  bar.position.y = height;
  bar.castShadow = true;
  group.add(bar);
  const barGlow = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 6.3, 0.12, 1.35), trimMat);
  barGlow.position.y = height - 0.56;
  group.add(barGlow);
  const barGlow2 = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 5.7, 0.08, 1.4), trimMat2);
  barGlow2.position.y = height + 0.52;
  group.add(barGlow2);
  return group;
}

export function addBillboard(w, t, lateral, text, color, opts = {}) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + (lateral > 0 ? -Math.PI / 2 : Math.PI / 2);
  w.group.add(group);
  const scale = opts.scale ?? 1;
  const width = 12 * scale;
  const height = 6 * scale;
  const postH = (opts.height ?? 8) * scale;
  const postMat = pbr(opts.postColor ?? 0x3d4350, { metalness: 0.45, roughness: 0.4 });
  for (const x of [-width * 0.34, width * 0.34]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, postH + height * 0.25, 0.42), postMat);
    post.position.set(x, (postH + height * 0.25) / 2, 0);
    group.add(post);
  }
  const tex = makeSignTexture(text, color, opts.dark ?? '#11101a');
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.FrontSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  plane.position.set(0, postH + height * 0.05, 0.28);
  group.add(plane);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.7, height + 0.7, 0.38),
    pbr(0x23232e, { metalness: 0.5, roughness: 0.4 }),
  );
  back.position.set(0, postH + height * 0.05, 0);
  group.add(back);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  glow.scale.set(width * 1.8, height * 2.4, 1);
  glow.position.set(0, postH + height * 0.05, 0.2);
  group.add(glow);
  w.addAnimation((dt, time) => {
    mat.opacity = 0.94 + Math.sin(time * 1.4 + t * 20) * 0.06;
  });
  return group;
}

export function addPalms(w, count, seed, minLat = 5, maxLat = 24, opts = {}) {
  const bases = w.sideTransforms(count, minLat, maxLat, seed, 0);
  const trunks = [];
  const frondsA = [];
  const frondsB = [];
  for (const b of bases) {
    const s = b.scale * (opts.scale ?? 1);
    const h = 5.0 * s;
    trunks.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h * 0.5, b.pos.z),
      rotY: b.rotY,
      scaleX: s * 0.8,
      scaleY: s,
      scaleZ: s * 0.8,
    });
    frondsA.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h * 0.96, b.pos.z),
      rotY: b.rotY,
      scaleX: s,
      scaleY: s,
      scaleZ: s,
    });
    frondsB.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h * 1.15, b.pos.z),
      rotY: b.rotY + 0.4,
      scaleX: s * 0.68,
      scaleY: s * 0.75,
      scaleZ: s * 0.68,
    });
  }
  w.addInstanced(
    new THREE.CylinderGeometry(0.17, 0.33, 5, 6),
    pbr(opts.trunkColor ?? 0x8a5b39, { roughness: 0.9 }),
    trunks,
  );
  const leafMat = pbr(opts.leafColor ?? 0x2d9c4c, {
    roughness: 0.76,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  w.addInstanced(new THREE.ConeGeometry(2.4, 1.5, 7, 1, true), leafMat, frondsA);
  w.addInstanced(new THREE.ConeGeometry(1.7, 1.1, 6, 1, true), leafMat, frondsB);
}

export function addPines(w, count, seed) {
  const bases = w.sideTransforms(count, 4, 28, seed, 0);
  const trunks = [];
  const layersA = [];
  const layersB = [];
  const layersC = [];
  const snowCaps = [];
  for (const b of bases) {
    const s = b.scale * (0.9 + b.rnd * 0.7);
    const h = 1.7 * s;
    trunks.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h * 0.5, b.pos.z),
      rotY: b.rotY,
      scaleX: s * 0.5,
      scaleY: s,
      scaleZ: s * 0.5,
    });
    const defs = [
      [2.4, 3.4, 2.0],
      [1.9, 3.0, 3.2],
      [1.35, 2.6, 4.4],
    ];
    defs.forEach((d, idx) => {
      const arr = idx === 0 ? layersA : idx === 1 ? layersB : layersC;
      arr.push({
        pos: new THREE.Vector3(b.pos.x, b.pos.y + d[2] * s, b.pos.z),
        rotY: b.rotY,
        scaleX: s,
        scaleY: s,
        scaleZ: s,
      });
      snowCaps.push({
        pos: new THREE.Vector3(b.pos.x, b.pos.y + (d[2] + d[1] * 0.27) * s, b.pos.z),
        rotY: b.rotY,
        scaleX: s * d[0] * 0.38,
        scaleY: s * d[1] * 0.35,
        scaleZ: s * d[0] * 0.38,
      });
    });
  }
  w.addInstanced(new THREE.CylinderGeometry(0.16, 0.25, 1.7, 5), pbr(0x5d4434), trunks);
  const pineMat = pbr(0x1b654d, { roughness: 0.9, flatShading: true });
  w.addInstanced(new THREE.ConeGeometry(2.4, 3.4, 7), pineMat, layersA);
  w.addInstanced(new THREE.ConeGeometry(1.9, 3.0, 7), pineMat, layersB);
  w.addInstanced(new THREE.ConeGeometry(1.35, 2.6, 7), pineMat, layersC);
  w.addInstanced(
    new THREE.ConeGeometry(1, 1, 7),
    pbr(0xeafcff, { roughness: 0.75, flatShading: true }),
    snowCaps,
  );
}

export function buildScenery(w) {
  switch (w.def.environment) {
    case 'day':
      if (w.def.id === 'sunbeam') buildSunbeam(w);
      else buildJungleScenery(w);
      break;
    case 'jungle':
      buildJungleScenery(w);
      break;
    case 'dusk':
      buildFrost(w);
      break;
    case 'night':
      buildNeonScenery(w);
      break;
    case 'lava':
      buildVolcanoScenery(w);
      break;
    default:
      break;
  }
}

function buildSunbeam(w) {
  addPalms(w, 105, 3301, 5, 30, { leafColor: 0x2fa64d });
  addBillboard(w, 0.23, w.half + 17, 'TURBO', w.def.accent);
  addBillboard(w, 0.58, -(w.half + 20), 'ALOHA', w.def.accent2, { scale: 0.8 });
  addBillboard(w, 0.83, w.half + 20, 'SUNBEAM', w.def.accent);

  const flowerBases = w.sideTransforms(240, 1.5, 20, 991, 0.06);
  const flowers = flowerBases.map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.22, b.pos.z),
    rotY: b.rotY,
    scale: 0.19 + b.rnd * 0.17,
    color: [0xffe043, 0xff6d8c, 0xfff5e8, 0xff8f31, 0xd86bff][Math.floor(b.rnd * 5)],
  }));
  w.addInstanced(new THREE.IcosahedronGeometry(1, 0), pbr(0xffffff, { roughness: 0.65 }), flowers);

  const tuftBases = w.sideTransforms(260, 1.1, 14, 1123, 0);
  const tufts = tuftBases.map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.18, b.pos.z),
    rotY: b.rotY,
    scaleX: 0.2 + b.rnd * 0.2,
    scaleY: 0.3 + b.rnd * 0.4,
    scaleZ: 0.2 + b.rnd * 0.2,
    color: 0x3f9f3d,
  }));
  w.addInstanced(new THREE.ConeGeometry(1, 2, 4), pbr(0xffffff, { roughness: 1 }), tufts);

  const center = new THREE.Vector3();
  w.def.points.forEach((p) => center.add(new THREE.Vector3(p[0], 0, p[2])));
  center.multiplyScalar(1 / w.def.points.length);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(29, 56),
    new THREE.MeshPhysicalMaterial({
      color: 0x2eb8e8,
      roughness: 0.12,
      metalness: 0.12,
      transparent: true,
      opacity: 0.84,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(center.x, -1.05, center.z);
  w.group.add(water);
  const waterRing = new THREE.Mesh(
    new THREE.RingGeometry(28.4, 30.5, 56),
    new THREE.MeshStandardMaterial({ color: 0xffe9a2, roughness: 0.7 }),
  );
  waterRing.rotation.x = -Math.PI / 2;
  waterRing.position.set(center.x, -1.02, center.z);
  w.group.add(waterRing);
  w.addAnimation((dt, time) => {
    water.position.y = -1.05 + Math.sin(time * 0.9) * 0.035;
  });

  makeBalloon(w, 0.13, -42, 0xff5f4a, 0xffe25e, 24);
  makeBalloon(w, 0.38, 38, 0x3ac8ff, 0xfff5e1, 31);
  makeBalloon(w, 0.68, -35, 0xff77c5, 0x72e4ff, 27);
  makeBalloon(w, 0.92, 34, 0xffcf3c, 0xff6e50, 22);

  makeWindmill(w, 0.34, 58, 0);
  makeWindmill(w, 0.74, -56, 0.7);

  const pennants = [];
  for (let i = 0; i < w.N; i += 22) {
    const s = w.samples[i];
    for (const sign of [-1, 1]) {
      const lat = sign * (w.half + 3.2);
      pennants.push({
        pos: new THREE.Vector3(
          s.p.x + s.side.x * lat,
          s.p.y + 4.8 + Math.sin(i * 0.1) * 0.08,
          s.p.z + s.side.z * lat,
        ),
        rotY: s.heading,
        color: i % 44 === 0 ? 0xffffff : w.def.accent,
      });
    }
  }
  w.addInstanced(new THREE.PlaneGeometry(2.6, 0.8), pbr(0xffffff, {
    side: THREE.DoubleSide,
    roughness: 0.55,
  }), pennants);
}

function makeBalloon(w, t, lateral, colorA, colorB, height) {
  const spot = w.trackSpot(t, lateral, 0);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, spot.pos.y + height, spot.pos.z);
  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 18, 14),
    pbr(colorA, { roughness: 0.55 }),
  );
  balloon.scale.y = 1.18;
  group.add(balloon);
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(4.22, 0.24, 8, 28),
    pbr(colorB, { roughness: 0.5 }),
  );
  stripe.rotation.x = Math.PI / 2;
  group.add(stripe);
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.2, 1.7),
    pbr(0x8a5b35, { roughness: 0.9 }),
  );
  basket.position.y = -6.2;
  group.add(basket);
  for (const sx of [-0.7, 0.7]) {
    for (const sz of [-0.7, 0.7]) {
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 2.8, 4),
        pbr(0x4d4233),
      );
      rope.position.set(sx, -4.65, sz);
      rope.rotation.z = sx * 0.04;
      group.add(rope);
    }
  }
  w.group.add(group);
  const baseY = group.position.y;
  w.addAnimation((dt, time) => {
    group.position.y = baseY + Math.sin(time * 0.55 + t * 20) * 1.2;
    group.rotation.y += dt * 0.09;
  });
}

function makeWindmill(w, t, lateral, offset) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + offset;
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 3.6, 18, 10),
    pbr(0xf3e9d1, { roughness: 0.85 }),
  );
  tower.position.y = 9;
  group.add(tower);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 2.8, 10),
    pbr(0x9d4b36, { roughness: 0.8 }),
  );
  roof.position.y = 19.2;
  group.add(roof);
  const hub = new THREE.Group();
  hub.position.set(0, 17.3, 2.3);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 8.8, 0.18),
      pbr(0xf9f1dd, { roughness: 0.75 }),
    );
    blade.position.y = 4.2;
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * TAU;
    arm.add(blade);
    hub.add(arm);
  }
  group.add(hub);
  w.group.add(group);
  w.addAnimation((dt) => {
    hub.rotation.z -= dt * 0.65;
  });
}

function buildFrost(w) {
  addPines(w, 124, 5581);
  addBillboard(w, 0.18, w.half + 16, 'FROST', w.def.accent);
  addBillboard(w, 0.49, -(w.half + 18), 'ALPINE', w.def.accent2, { scale: 0.82 });
  addBillboard(w, 0.79, w.half + 17, 'FJORD', w.def.accent);

  const stone = pbr(0xbfd8e3, { roughness: 0.92, flatShading: true });
  const rocks = w.sideTransforms(70, 4, 24, 2231, 0).map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.5 * b.scale, b.pos.z),
    rotY: b.rotY,
    scaleX: b.scale * 1.7,
    scaleY: b.scale * 0.9,
    scaleZ: b.scale * 1.5,
  }));
  w.addInstanced(new THREE.DodecahedronGeometry(1, 0), stone, rocks);

  const crystals = w.sideTransforms(38, 2.5, 15, 7771, 0).map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.9 * b.scale, b.pos.z),
    rotY: b.rotY,
    rotZ: (b.rnd - 0.5) * 0.4,
    scaleX: b.scale * 0.55,
    scaleY: b.scale * 1.8,
    scaleZ: b.scale * 0.55,
  }));
  w.addInstanced(
    new THREE.OctahedronGeometry(1, 0),
    pbr(0xaeeeff, {
      emissive: 0x37c8ff,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.78,
      roughness: 0.15,
      metalness: 0.25,
    }),
    crystals,
  );

  makeAurora(w);
  makeIceArch(w, 0.3);
  makeIceArch(w, 0.68);
  makeSnowman(w, 0.12, 13);
  makeSnowman(w, 0.41, -15);
  makeSnowman(w, 0.73, 17);
  makeSnowman(w, 0.91, -13);

  const center = new THREE.Vector3();
  w.def.points.forEach((p) => center.add(new THREE.Vector3(p[0], 0, p[2])));
  center.multiplyScalar(1 / w.def.points.length);
  const ice = new THREE.Mesh(
    new THREE.CircleGeometry(38, 56),
    new THREE.MeshPhysicalMaterial({
      color: 0x9ce8ff,
      roughness: 0.06,
      metalness: 0.2,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
  );
  ice.rotation.x = -Math.PI / 2;
  ice.position.set(center.x, -1.02, center.z);
  w.group.add(ice);
}

function makeAurora(w) {
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float wave = sin(vUv.x * 17.0 + uTime * 0.35) * 0.5 + 0.5;
        float wave2 = sin(vUv.x * 9.0 - uTime * 0.22 + 1.7) * 0.5 + 0.5;
        float band = smoothstep(0.1, 0.85, wave * 0.6 + wave2 * 0.4);
        float fade = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
        vec3 col = mix(vec3(0.16, 0.9, 0.75), vec3(0.55, 0.3, 1.0), vUv.y);
        float alpha = band * fade * 0.34;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const aurora = new THREE.Mesh(new THREE.PlaneGeometry(760, 190, 1, 1), mat);
  aurora.position.set(-80, 160, -430);
  aurora.rotation.y = 0.2;
  w.group.add(aurora);
  const aurora2 = new THREE.Mesh(new THREE.PlaneGeometry(600, 150), mat.clone());
  aurora2.position.set(330, 130, -300);
  aurora2.rotation.y = -0.5;
  w.group.add(aurora2);
  w.addAnimation((dt, time) => {
    uniforms.uTime.value = time;
    aurora2.material.uniforms.uTime.value = time + 18;
  });
}

function makeIceArch(w, t) {
  const arch = addArch(w, t, {
    height: 8.5,
    pillarColor: 0x9ce4f7,
    colorA: 0x66e7ff,
    colorB: 0xe5fbff,
    metalness: 0.15,
    roughness: 0.16,
  });
  for (const sign of [-1, 1]) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      pbr(0xbdf4ff, {
        emissive: 0x52dcff,
        emissiveIntensity: 1.6,
        transparent: true,
        opacity: 0.8,
      }),
    );
    crystal.scale.y = 2;
    crystal.position.set(sign * (w.half + 2.9), 9.6, 0);
    arch.add(crystal);
  }
}

function makeSnowman(w, t, lateral) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + 1.2;
  const white = pbr(0xf7ffff, { roughness: 0.8 });
  const sizes = [0.72, 1.0, 0.82];
  let y = 0;
  sizes.forEach((s, i) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), white);
    y += s + (i ? 0.45 : 0.55);
    ball.position.y = y;
    group.add(ball);
  });
  const headY = y + 0.35;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 6), pbr(0xff8b2d));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, headY, 0.8);
  group.add(nose);
  for (const ex of [-0.28, 0.28]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), pbr(0x17121a));
    eye.position.set(ex, headY + 0.18, 0.71);
    group.add(eye);
  }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.75, 10), pbr(0x222533));
  hat.position.set(0, headY + 0.8, 0);
  group.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 10), pbr(0x222533));
  brim.position.set(0, headY + 0.45, 0);
  group.add(brim);
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.53, 0.11, 6, 16),
    pbr(0xff4b4b),
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = headY - 0.55;
  group.add(scarf);
  w.group.add(group);
}

export { makeTexture, makeStoneTexture, makeSignTexture, css, mulberry32, TAU };
