import * as THREE from '../vendor/three.module.js';
import {
  css, mulberry32, makeSignTexture, makeStoneTexture, makeTexture, makeWindowTexture,
  softDiscTexture,
} from './textures.js?v=20261108';
import { pbr, addArch, addBillboard, addPalms } from './scenery.js?v=20261108';

const TAU = Math.PI * 2;

export function buildNeonScenery(w) {
  const def = w.def;
  const winTex = makeWindowTexture();
  const buildingMat = new THREE.MeshStandardMaterial({
    map: winTex,
    emissiveMap: winTex,
    emissive: 0xffffff,
    emissiveIntensity: 1.8,
    color: 0x8c89b0,
    roughness: 0.34,
    metalness: 0.55,
  });
  const rng = mulberry32(9611);
  const bases = w.sideTransforms(88, 13, 78, 4207, 0);
  const buildings = bases.map((b) => {
    const h = 13 + Math.pow(b.rnd, 2.1) * 105;
    const wd = 7 + rng() * 12;
    const dp = 7 + rng() * 12;
    return {
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h / 2, b.pos.z),
      rotY: b.rotY,
      scaleX: wd,
      scaleY: h,
      scaleZ: dp,
      color: new THREE.Color().setHSL(0.6 + rng() * 0.16, 0.35 + rng() * 0.4, 0.5 + rng() * 0.25),
    };
  });
  w.addInstanced(new THREE.BoxGeometry(1, 1, 1), buildingMat, buildings);

  const antennas = [];
  const crowns = [];
  bases.forEach((b, i) => {
    if (i % 3 !== 0) return;
    const h = buildings[i].scaleY;
    antennas.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h + 4, b.pos.z),
      rotY: b.rotY,
      scaleX: 1,
      scaleY: 8,
      scaleZ: 1,
      color: i % 2 ? def.accent : def.accent2,
    });
    crowns.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + h + 0.18, b.pos.z),
      rotY: b.rotY,
      scaleX: buildings[i].scaleX * 0.72,
      scaleY: 0.22,
      scaleZ: buildings[i].scaleZ * 0.72,
      color: i % 2 ? def.accent : def.accent2,
    });
  });
  w.addInstanced(
    new THREE.CylinderGeometry(0.07, 0.07, 1, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    antennas,
  );
  w.addInstanced(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    crowns,
  );

  const glowStrips = [];
  for (let i = 0; i < w.N; i += 10) {
    const s = w.samples[i];
    for (const sign of [-1, 1]) {
      const lat = sign * (w.half + 0.84);
      glowStrips.push({
        pos: new THREE.Vector3(
          s.p.x + s.side.x * lat,
          s.p.y + 0.13,
          s.p.z + s.side.z * lat,
        ),
        rotY: s.heading,
        scaleX: 0.18,
        scaleY: 0.08,
        scaleZ: 3.2,
        color: i % 40 === 0 ? def.accent : i % 40 === 20 ? def.accent2 : 0x17b9df,
      });
    }
  }
  w.addInstanced(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    glowStrips,
  );

  addArch(w, 0.14, {
    height: 9,
    pillarColor: 0x16101f,
    colorA: def.accent,
    colorB: def.accent2,
    metalness: 0.75,
    roughness: 0.25,
  });
  addArch(w, 0.4, {
    height: 8.4,
    pillarColor: 0x0f1420,
    colorA: def.accent2,
    colorB: def.accent,
    metalness: 0.7,
    roughness: 0.3,
  });
  addArch(w, 0.66, {
    height: 9.4,
    pillarColor: 0x1b1027,
    colorA: def.accent,
    colorB: 0xffffff,
    metalness: 0.75,
    roughness: 0.22,
  });
  addArch(w, 0.88, {
    height: 8.8,
    pillarColor: 0x0d1320,
    colorA: def.accent2,
    colorB: def.accent,
    metalness: 0.75,
    roughness: 0.25,
  });

  makeHolo(w, 0.22, 26, 'NEXUS', def.accent2);
  makeHolo(w, 0.52, -30, 'TURBO', def.accent);
  makeHolo(w, 0.78, 31, 'SECTOR 9', def.accent2);

  makeFlyingCars(w);
  makeNeonSpire(w);
}

function makeHolo(w, t, lateral, text, color) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy + 11, spot.pos.z);
  group.rotation.y = spot.yaw + (lateral > 0 ? -Math.PI / 2 : Math.PI / 2);
  const tex = makeSignTexture(text, color, '#07050d');
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat);
  group.add(screen);
  const frameMat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  for (const y of [-4.2, 4.2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(17, 0.12, 0.12), frameMat);
    bar.position.y = y;
    group.add(bar);
  }
  for (const x of [-8.2, 8.2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 8.4, 0.12), frameMat);
    bar.position.x = x;
    group.add(bar);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  glow.scale.set(28, 18, 1);
  group.add(glow);
  w.group.add(group);
  w.addAnimation((dt, time) => {
    mat.opacity = 0.7 + Math.sin(time * 4 + t * 40) * 0.14;
    group.position.y += Math.sin(time * 1.2 + t * 30) * dt * 0.3;
  });
}

function makeFlyingCars(w) {
  const cars = [];
  const rng = mulberry32(8442);
  const bodyMat = pbr(0x151522, { metalness: 0.8, roughness: 0.22 });
  const lightA = new THREE.MeshBasicMaterial({ color: 0xff3dd4, toneMapped: false });
  const lightB = new THREE.MeshBasicMaterial({ color: 0x5cf3ff, toneMapped: false });
  for (let i = 0; i < 9; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.42, 1.15), bodyMat);
    group.add(body);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      pbr(0x4d8aa8, { metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.65 }),
    );
    canopy.scale.set(1.2, 0.7, 0.8);
    canopy.position.set(0.2, 0.35, 0);
    group.add(canopy);
    for (const x of [-1.45, 1.45]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), x < 0 ? lightA : lightB);
      light.position.set(x, 0, 0);
      group.add(light);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDiscTexture(),
      color: 0xff43c8,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    glow.scale.set(4.5, 2.5, 1);
    group.add(glow);
    w.group.add(group);
    cars.push({
      group,
      radius: 145 + rng() * 140,
      height: 28 + rng() * 55,
      speed: 0.04 + rng() * 0.05,
      phase: rng() * TAU,
      tilt: (rng() - 0.5) * 0.22,
    });
  }
  w.addAnimation((dt, time) => {
    for (const c of cars) {
      const a = c.phase + time * c.speed;
      c.group.position.set(
        Math.cos(a) * c.radius,
        c.height + Math.sin(time * 0.8 + c.phase) * 3,
        Math.sin(a) * c.radius,
      );
      c.group.rotation.y = -a + Math.PI / 2;
      c.group.rotation.z = Math.sin(a * 2) * c.tilt;
    }
  });
}

function makeNeonSpire(w) {
  const spot = w.trackSpot(0.5, -62, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 5.5, 105, 6),
    pbr(0x121022, { metalness: 0.7, roughness: 0.28, emissive: 0x1a0730, emissiveIntensity: 1 }),
  );
  tower.position.y = 52.5;
  group.add(tower);
  const ringMat = new THREE.MeshBasicMaterial({ color: w.def.accent, toneMapped: false });
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5 - i * 0.42, 0.16, 6, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 24 + i * 14;
    group.add(ring);
  }
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.1, 1),
    new THREE.MeshBasicMaterial({ color: w.def.accent2, toneMapped: false }),
  );
  orb.position.y = 107;
  group.add(orb);
  w.addGlowSprite(new THREE.Vector3(spot.pos.x, gy + 107, spot.pos.z), w.def.accent2, 38, 0.5);
  w.group.add(group);
  w.addAnimation((dt, time) => {
    orb.rotation.y += dt * 0.9;
    ringMat.color.setHSL((0.8 + Math.sin(time * 0.3) * 0.1) % 1, 1, 0.62);
  });
}

export function buildJungleScenery(w) {
  const def = w.def;
  addPalms(w, 96, 1351, 5, 30, { leafColor: 0x2a9342, trunkColor: 0x745337 });
  addBillboard(w, 0.17, w.half + 17, 'RAPTOR', def.accent);
  addBillboard(w, 0.52, -(w.half + 18), 'EMERALD', def.accent2, { scale: 0.82 });
  addBillboard(w, 0.8, w.half + 18, 'JUNGLE', def.accent);

  const ferns = w.sideTransforms(180, 2.2, 18, 7141, 0).map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.5 * b.scale, b.pos.z),
    rotY: b.rotY,
    scaleX: b.scale * 1.8,
    scaleY: b.scale * 0.8,
    scaleZ: b.scale * 1.8,
    color: new THREE.Color().setHSL(0.3 + b.rnd * 0.08, 0.55, 0.22 + b.rnd * 0.18),
  }));
  w.addInstanced(
    new THREE.ConeGeometry(1, 1, 7, 1, true),
    pbr(0xffffff, { roughness: 0.85, side: THREE.DoubleSide, flatShading: true }),
    ferns,
  );

  const rocks = w.sideTransforms(55, 4, 25, 2341, 0).map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.6 * b.scale, b.pos.z),
    rotY: b.rotY,
    scaleX: b.scale * 1.5,
    scaleY: b.scale * 1.2,
    scaleZ: b.scale * 1.3,
  }));
  w.addInstanced(new THREE.DodecahedronGeometry(1, 0), pbr(0x5c5c4d, { roughness: 1, flatShading: true }), rocks);

  makeJungleArch(w, 0.42);
  makeRuinPillar(w, 0.1, w.half + 11);
  makeRuinPillar(w, 0.27, -(w.half + 12));
  makeRuinPillar(w, 0.61, w.half + 12);
  makeRuinPillar(w, 0.87, -(w.half + 10));
  makeWaterfall(w, 0.22, -35);
  makeTRex(w, 0.72, -27);
  makeVines(w);
}

function makeJungleArch(w, t) {
  const stoneTex = makeStoneTexture('#6c634c');
  const spot = w.trackSpot(t, 0, 0);
  const group = new THREE.Group();
  group.position.copy(spot.pos);
  group.rotation.y = spot.yaw;
  w.group.add(group);
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x958a6b,
    roughness: 0.94,
    metalness: 0.02,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd8ad3f,
    metalness: 0.55,
    roughness: 0.35,
    emissive: 0x4b2c00,
    emissiveIntensity: 0.5,
  });
  for (const sign of [-1, 1]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 3.4), stoneMat);
    base.position.set(sign * (w.half + 3.5), 0.75, 0);
    group.add(base);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 9, 2.6), stoneMat);
    pillar.position.set(sign * (w.half + 3.5), 5.2, 0);
    pillar.castShadow = true;
    group.add(pillar);
    for (let i = 0; i < 3; i++) {
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.08), goldMat);
      glyph.position.set(sign * (w.half + 3.5) + (i - 1) * 0.75, 5.4 + Math.sin(i * 2) * 0.7, -1.34);
      group.add(glyph);
    }
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshBasicMaterial({ color: 0xffd44d, toneMapped: false }),
    );
    crystal.position.set(sign * (w.half + 3.5), 10.5, 0);
    group.add(crystal);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(w.half * 2 + 10.5, 1.7, 3.2), stoneMat);
  lintel.position.y = 10.2;
  group.add(lintel);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w.half * 2 + 12.5, 0.8, 4.4), stoneMat);
  roof.position.y = 11.4;
  group.add(roof);
  const roofGold = new THREE.Mesh(new THREE.BoxGeometry(w.half * 2 + 11.4, 0.18, 3.2), goldMat);
  roofGold.position.y = 11.9;
  group.add(roofGold);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffce3d, toneMapped: false }),
  );
  eye.position.set(0, 9.4, -1.7);
  group.add(eye);
  const pupil = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.85, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x17120a }),
  );
  pupil.position.set(0, 9.4, -2.18);
  group.add(pupil);
  w.addGlowSprite(new THREE.Vector3(spot.pos.x, spot.pos.y + 9.4, spot.pos.z), 0xffd24d, 12, 0.35);
}

function makeRuinPillar(w, t, lateral) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + 0.4;
  const stone = new THREE.MeshStandardMaterial({
    map: makeStoneTexture('#6c634c'),
    color: 0x8e8366,
    roughness: 0.95,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1, 3.2), stone);
  base.position.y = 0.5;
  group.add(base);
  const h = 4.5 + (t * 7) % 5;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, 2.3), stone);
  shaft.position.y = 1 + h / 2;
  group.add(shaft);
  if (t !== 0.61) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 3), stone);
    cap.position.y = 1.5 + h;
    group.add(cap);
  }
  const gold = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.25, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd7ab3d, metalness: 0.5, roughness: 0.4 }),
  );
  gold.position.set(0, 1.5 + h * 0.55, -1.18);
  group.add(gold);
  w.group.add(group);
}

function makeWaterfall(w, t, lateral) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + (lateral > 0 ? -Math.PI / 2 : Math.PI / 2);
  const cliff = new THREE.Mesh(
    new THREE.DodecahedronGeometry(15, 0),
    pbr(0x5c6250, { roughness: 1, flatShading: true }),
  );
  cliff.scale.set(1.4, 1.8, 0.9);
  cliff.position.y = 14;
  group.add(cliff);
  const tex = makeTexture(128, 512, (ctx, wd, ht) => {
    ctx.fillStyle = 'rgba(90,200,230,.55)';
    ctx.fillRect(0, 0, wd, ht);
    const rng = mulberry32(700);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,.36)' : 'rgba(70,170,210,.36)';
      ctx.fillRect(rng() * wd, rng() * ht, 1 + rng() * 5, 20 + rng() * 90);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 28),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  water.position.set(0, 12, 7.4);
  group.add(water);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0x42c7e0,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
      metalness: 0.1,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.1, 9);
  group.add(pool);
  const splash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color: 0xc7f5ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  splash.scale.set(11, 6, 1);
  splash.position.set(0, 1.4, 9);
  group.add(splash);
  w.group.add(group);
  w.addAnimation((dt, time) => {
    tex.offset.y = (tex.offset.y - dt * 0.55) % 1;
    splash.material.opacity = 0.35 + Math.sin(time * 3.2) * 0.12;
  });
}

function makeTRex(w, t, lateral) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + (lateral > 0 ? -Math.PI / 2 : Math.PI / 2) + 0.35;
  const stone = pbr(0x696553, { roughness: 0.96, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), stone);
  body.scale.set(1.0, 1.2, 1.8);
  body.position.y = 11;
  group.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.8, 6, 7), stone);
  neck.position.set(0, 15.5, -3.2);
  neck.rotation.x = 0.45;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 5.4), stone);
  head.position.set(0, 18.4, -5.3);
  group.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 4.4), stone);
  jaw.position.set(0, 16.8, -5.7);
  group.add(jaw);
  for (const x of [-1.2, 1.2]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc42, toneMapped: false }),
    );
    eye.position.set(x, 19.2, -8);
    group.add(eye);
  }
  for (const x of [-2.6, 2.6]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 8, 7), stone);
    leg.position.set(x, 5.4, 1.2);
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 4.2), stone);
    foot.position.set(x, 1.1, 0.3);
    group.add(foot);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3.2, 6), stone);
    arm.position.set(x * 0.55, 13.2, -3.4);
    arm.rotation.x = -0.65;
    group.add(arm);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(2.7, 13, 7), stone);
  tail.rotation.x = Math.PI / 2.8;
  tail.position.set(0, 9.8, 8.8);
  group.add(tail);
  w.group.add(group);
}

function makeVines(w) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2d7233, roughness: 0.95 });
  const vines = [];
  for (let i = 0; i < 60; i++) {
    const t = (i + 0.5) / 60;
    const spot = w.trackSpot(t, (i % 2 ? 1 : -1) * (w.half + 2 + (i % 4) * 2.4), 0);
    const baseY = Math.max(spot.pos.y, w.groundHeightAt(spot.pos.x, spot.pos.z));
    vines.push({
      pos: new THREE.Vector3(spot.pos.x, baseY + 5 + (i % 5), spot.pos.z),
      rotZ: (i % 3 - 1) * 0.4,
      scaleX: 1,
      scaleY: 1.7 + (i % 4) * 0.5,
      scaleZ: 1,
    });
  }
  w.addInstanced(new THREE.CylinderGeometry(0.06, 0.08, 2, 4), mat, vines);
}

export function buildVolcanoScenery(w) {
  const def = w.def;
  addBillboard(w, 0.19, w.half + 17, 'MOLTEN', def.accent);
  addBillboard(w, 0.51, -(w.half + 18), 'CINDER', def.accent2, { scale: 0.82 });
  addBillboard(w, 0.81, w.half + 18, 'FINALE', def.accent);

  const rocks = w.sideTransforms(120, 3, 28, 6131, 0).map((b) => ({
    pos: new THREE.Vector3(b.pos.x, b.pos.y + 0.65 * b.scale, b.pos.z),
    rotY: b.rotY,
    rotZ: (b.rnd - 0.5) * 0.5,
    scaleX: b.scale * 1.8,
    scaleY: b.scale * 1.4,
    scaleZ: b.scale * 1.6,
  }));
  w.addInstanced(
    new THREE.DodecahedronGeometry(1, 0),
    pbr(0x2b2225, { roughness: 0.95, flatShading: true }),
    rocks,
  );

  const deadTrunks = [];
  const deadBranches = [];
  w.sideTransforms(38, 5, 24, 9241, 0).forEach((b) => {
    const s = b.scale * 0.85;
    deadTrunks.push({
      pos: new THREE.Vector3(b.pos.x, b.pos.y + 2.5 * s, b.pos.z),
      rotY: b.rotY,
      rotZ: (b.rnd - 0.5) * 0.25,
      scaleX: s,
      scaleY: s,
      scaleZ: s,
    });
    for (let j = 0; j < 3; j++) {
      deadBranches.push({
        pos: new THREE.Vector3(b.pos.x, b.pos.y + (3.4 + j * 0.5) * s, b.pos.z),
        rotY: b.rotY + j * 2.1,
        rotZ: 0.7 + j * 0.15,
        scaleX: s * 0.55,
        scaleY: s * 0.55,
        scaleZ: s * 0.55,
      });
    }
  });
  const barkMat = pbr(0x312726, { roughness: 1, flatShading: true });
  w.addInstanced(new THREE.CylinderGeometry(0.16, 0.34, 5, 5), barkMat, deadTrunks);
  w.addInstanced(new THREE.CylinderGeometry(0.06, 0.15, 2.8, 4), barkMat, deadBranches);

  const center = new THREE.Vector3();
  w.def.points.forEach((p) => center.add(new THREE.Vector3(p[0], 0, p[2])));
  center.multiplyScalar(1 / w.def.points.length);
  const lavaTex = makeTexture(256, 256, (ctx, wd, ht) => {
    ctx.fillStyle = '#180605';
    ctx.fillRect(0, 0, wd, ht);
    const rng = mulberry32(511);
    for (let i = 0; i < 90; i++) {
      const x = rng() * wd;
      const y = rng() * ht;
      const r = 2 + rng() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,220,80,.95)');
      g.addColorStop(0.35, 'rgba(255,90,0,.85)');
      g.addColorStop(1, 'rgba(60,4,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  lavaTex.repeat.set(2, 2);
  const lava = new THREE.Mesh(
    new THREE.CircleGeometry(23, 48),
    new THREE.MeshStandardMaterial({
      map: lavaTex,
      emissive: 0xff3c00,
      emissiveMap: lavaTex,
      emissiveIntensity: 1.8,
      roughness: 0.55,
      metalness: 0.1,
    }),
  );
  lava.rotation.x = -Math.PI / 2;
  lava.position.set(center.x, -0.72, center.z);
  w.group.add(lava);
  const lavaGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color: 0xff4b00,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  lavaGlow.scale.set(58, 58, 1);
  lavaGlow.position.set(center.x, 3, center.z);
  w.group.add(lavaGlow);
  w.addAnimation((dt, time) => {
    lavaTex.offset.x = Math.sin(time * 0.08) * 0.06;
    lavaTex.offset.y += dt * 0.012;
    lavaGlow.material.opacity = 0.25 + Math.sin(time * 1.6) * 0.08;
  });

  makePipes(w, 0.28, w.half + 13);
  makePipes(w, 0.61, -(w.half + 14));
  makePipes(w, 0.85, w.half + 14);
  addArch(w, 0.35, {
    height: 9,
    pillarColor: 0x2e2526,
    colorA: def.accent,
    colorB: 0xffe066,
    metalness: 0.65,
    roughness: 0.35,
  });
  addArch(w, 0.71, {
    height: 8.5,
    pillarColor: 0x261d1f,
    colorA: 0xffca4d,
    colorB: def.accent,
    metalness: 0.65,
    roughness: 0.35,
  });

  makeGeysers(w);
  makeSmoke(w);
  makeLavaCracks(w);
}

function makePipes(w, t, lateral) {
  const spot = w.trackSpot(t, lateral, 0);
  const gy = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, gy, spot.pos.z);
  group.rotation.y = spot.yaw + (lateral > 0 ? -Math.PI / 2 : Math.PI / 2);
  const pipeMat = pbr(0x5c5151, { metalness: 0.65, roughness: 0.4 });
  const bandMat = pbr(0xff6a1e, {
    emissive: 0x7a1f00,
    emissiveIntensity: 0.7,
    metalness: 0.4,
    roughness: 0.35,
  });
  for (let i = 0; i < 2; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 24, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 5 + i * 2.2, i * 1.4);
    group.add(pipe);
    for (let j = -2; j <= 2; j++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 6, 12), bandMat);
      band.rotation.y = Math.PI / 2;
      band.position.set(j * 4.5, 5 + i * 2.2, i * 1.4);
      group.add(band);
    }
  }
  for (const x of [-8, 8]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), pipeMat);
    support.position.set(x, 3.6, 0.7);
    group.add(support);
  }
  const steam = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color: 0x918b8d,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }));
  steam.scale.set(9, 7, 1);
  steam.position.set(6, 8.2, 0);
  group.add(steam);
  w.group.add(group);
  w.addAnimation((dt, time) => {
    steam.material.opacity = 0.2 + Math.sin(time * 1.7 + t * 20) * 0.12;
  });
}

function makeGeysers(w) {
  const bases = w.sideTransforms(14, 4, 22, 3311, 0);
  const geysers = [];
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff741f,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  for (const b of bases) {
    const group = new THREE.Group();
    group.position.set(b.pos.x, b.pos.y, b.pos.z);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 5, 7, 1, true), mat.clone());
    cone.position.y = 2.5;
    group.add(cone);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDiscTexture(),
      color: 0xff8a1f,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    glow.scale.set(5, 8, 1);
    glow.position.y = 5;
    group.add(glow);
    w.group.add(group);
    geysers.push({ group, cone, glow, phase: b.rnd * TAU, speed: 0.7 + b.rnd });
  }
  w.addAnimation((dt, time) => {
    for (const g of geysers) {
      const p = Math.max(0, Math.sin(time * g.speed + g.phase));
      g.cone.scale.y = 0.15 + p * 1.1;
      g.cone.position.y = 1.8 + p * 1.4;
      g.cone.material.opacity = 0.22 + p * 0.55;
      g.glow.material.opacity = 0.12 + p * 0.4;
    }
  });
}

function makeSmoke(w) {
  const sprites = [];
  const rng = mulberry32(6121);
  for (let i = 0; i < 22; i++) {
    const spot = w.trackSpot(rng(), (rng() > 0.5 ? 1 : -1) * (w.half + 15 + rng() * 45), 0);
    const gy = Math.max(spot.pos.y, w.groundHeightAt(spot.pos.x, spot.pos.z));
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDiscTexture(),
      color: 0x6a5b60,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }));
    spr.position.set(spot.pos.x, gy + 5 + rng() * 16, spot.pos.z);
    const size = 8 + rng() * 12;
    spr.scale.set(size, size, 1);
    w.group.add(spr);
    sprites.push({ spr, baseY: spr.position.y, speed: 0.35 + rng() * 0.5, phase: rng() * TAU });
  }
  w.addAnimation((dt, time) => {
    for (const s of sprites) {
      s.spr.position.y += s.speed * dt;
      if (s.spr.position.y > s.baseY + 22) s.spr.position.y = s.baseY;
      s.spr.material.opacity = 0.1 + Math.sin(time * 0.5 + s.phase) * 0.06;
    }
  });
}

function makeLavaCracks(w) {
  const cracks = [];
  const rng = mulberry32(8001);
  for (let i = 0; i < 80; i++) {
    const t = rng();
    const s = w.samples[Math.floor(t * w.N)];
    const sign = rng() > 0.5 ? 1 : -1;
    const lat = sign * (w.half + 2.4 + rng() * 8);
    const x = s.p.x + s.side.x * lat;
    const z = s.p.z + s.side.z * lat;
    cracks.push({
      pos: new THREE.Vector3(x, w.groundHeightAt(x, z) + 0.06, z),
      rotY: rng() * TAU,
      scaleX: 1.5 + rng() * 4,
      scaleY: 1,
      scaleZ: 0.16 + rng() * 0.2,
      color: rng() > 0.5 ? 0xff5a00 : 0xffb21f,
    });
  }
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  w.addInstanced(
    geo,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    cracks,
  );
}
