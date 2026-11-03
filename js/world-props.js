import * as THREE from '../vendor/three.module.js';
import {
  css, mulberry32, makeBannerTexture, makeSignTexture, makeCheckerTexture,
  makeChevronTexture, makeQuestionTexture, makeStoneTexture, softDiscTexture,
  makeTexture, makeTurnTexture,
} from './textures.js?v=20261108';
import { graphics } from './settings.js?v=20261108';

const TAU = Math.PI * 2;

/* Flat props follow the road's slope instead of hovering above it. */
function groundPose(w, t, lane, yOff) {
  const spot = w.trackSpot(t, lane, yOff);
  const back = w.trackSpot(t - 0.004, lane, 0);
  const ahead = w.trackSpot(t + 0.004, lane, 0);
  const run = Math.hypot(ahead.pos.x - back.pos.x, ahead.pos.z - back.pos.z);
  const pitch = Math.atan2(ahead.pos.y - back.pos.y, Math.max(run, 0.001));
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';
  group.position.copy(spot.pos);
  group.rotation.y = spot.yaw;
  group.rotation.x = -pitch;
  return group;
}


export function buildStartArea(w) {
  const def = w.def;
  const half = w.half;
  const spot = w.trackSpot(0, 0, 0);
  const ground = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.copy(spot.pos);
  group.rotation.y = spot.yaw;
  w.group.add(group);

  const isJungle = def.environment === 'jungle';
  const isFrost = def.environment === 'dusk';
  const isNeon = def.environment === 'night';
  const isLava = def.environment === 'lava';

  const stoneTex = isJungle ? makeStoneTexture('#6e664d') : null;
  const pillarMat = new THREE.MeshStandardMaterial({
    color: isJungle ? 0x8b8062 : isFrost ? 0x9edcf2 : isNeon ? 0x171229 : isLava ? 0x352a2b : 0x2c3143,
    map: stoneTex,
    roughness: isFrost ? 0.28 : isNeon ? 0.4 : 0.75,
    metalness: isFrost ? 0.25 : isNeon ? 0.7 : isLava ? 0.6 : 0.15,
    emissive: isNeon ? 0x140822 : isLava ? 0x180704 : 0x000000,
    emissiveIntensity: isNeon || isLava ? 0.7 : 0,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: def.accent,
    emissive: isNeon || isLava ? def.accent : 0x000000,
    emissiveIntensity: isNeon || isLava ? 2.2 : 0.15,
    roughness: 0.35,
    metalness: isNeon ? 0.75 : 0.2,
  });

  const pillarGeo = new THREE.BoxGeometry(1.15, 8.2, 1.15);
  for (const sign of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(sign * (half + 3.1), 4.1, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.16, 1.34), trimMat);
    trim.position.set(sign * (half + 3.1), 6.5, 0);
    group.add(trim);
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.55, 2.1),
      isJungle ? new THREE.MeshStandardMaterial({ color: 0x77705b, map: stoneTex, roughness: 0.95 }) : pillarMat,
    );
    foot.position.set(sign * (half + 3.1), 0.27, 0);
    group.add(foot);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 7.5, 0.85, 1.15), pillarMat);
  beam.position.y = 8.4;
  beam.castShadow = true;
  group.add(beam);
  const beamTrim = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 6.7, 0.12, 1.25), trimMat);
  beamTrim.position.y = 8.88;
  group.add(beamTrim);

  const bannerTex = makeBannerTexture(def.name, `${def.region}  •  ${def.tag}`, def);
  const bannerGeo = new THREE.PlaneGeometry(half * 2 + 5.5, 2.25);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.FrontSide, toneMapped: false });
  const bannerA = new THREE.Mesh(bannerGeo, bannerMat);
  bannerA.position.set(0, 7.05, -0.62);
  bannerA.rotation.y = Math.PI;
  group.add(bannerA);
  const bannerB = new THREE.Mesh(bannerGeo, bannerMat);
  bannerB.position.set(0, 7.05, 0.62);
  group.add(bannerB);

  const checkerTex = makeCheckerTexture();
  checkerTex.repeat.set(6, 2);
  const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 0.7, 3.8),
    new THREE.MeshBasicMaterial({ map: checkerTex, transparent: true, opacity: 0.95, toneMapped: false }),
  );
  startLine.rotation.x = -Math.PI / 2;
  startLine.position.set(0, 0.075, 0);
  group.add(startLine);

  const lightGeo = new THREE.SphereGeometry(0.28, 12, 10);
  const lightXs = [-3.8, -1.9, 0, 1.9, 3.8];
  for (const x of lightXs) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1b0d12,
      emissive: 0x090306,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(lightGeo, mat);
    bulb.position.set(x, 6.7, -0.68);
    group.add(bulb);
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0x111018, roughness: 0.5, metalness: 0.6 }),
    );
    housing.rotation.x = Math.PI / 2;
    housing.position.set(x, 6.7, -0.83);
    group.add(housing);
    w.startLights.push(mat);
  }
  w.setStartLights(0);

  if (isNeon || isLava) {
    for (const sign of [-1, 1]) {
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 7, 1.3),
        new THREE.MeshBasicMaterial({
          color: sign > 0 ? def.accent2 : def.accent,
          toneMapped: false,
        }),
      );
      neon.position.set(sign * (half + 2.5), 4.1, 0);
      group.add(neon);
    }
  }

  if (isJungle) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(half * 2 + 8.5, 0.55, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x6e664f, map: stoneTex, roughness: 0.95 }),
    );
    roof.position.y = 9.05;
    group.add(roof);
    const roofTrim = new THREE.Mesh(
      new THREE.BoxGeometry(half * 2 + 9.5, 0.24, 4.2),
      new THREE.MeshStandardMaterial({ color: 0xd3b54b, roughness: 0.6, metalness: 0.2 }),
    );
    roofTrim.position.y = 9.35;
    group.add(roofTrim);
    for (const sign of [-1, 1]) {
      const head = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.35, 1),
        new THREE.MeshStandardMaterial({ color: 0x82765c, map: stoneTex, roughness: 0.95 }),
      );
      head.scale.set(1.3, 0.95, 1.1);
      head.position.set(sign * (half + 5.2), 5.4, -0.35);
      group.add(head);
      for (const eye of [-0.42, 0.42]) {
        const e = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffce38 }),
        );
        e.position.set(sign * (half + 5.2) + eye, 5.55, -1.37);
        group.add(e);
      }
    }
  }

  if (isFrost) {
    for (const sign of [-1, 1]) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1, 0),
        new THREE.MeshStandardMaterial({
          color: 0xbdeeff,
          emissive: 0x57dfff,
          emissiveIntensity: 1.4,
          transparent: true,
          opacity: 0.72,
          roughness: 0.1,
          metalness: 0.3,
        }),
      );
      crystal.scale.y = 2.2;
      crystal.position.set(sign * (half + 4.9), 3.6, 1.3);
      group.add(crystal);
    }
  }

  void ground;
}

export function buildGrandstands(w) {
  const def = w.def;
  const half = w.half;
  const spot = w.trackSpot(0.003, 0, 0);
  const ground = w.groundHeightAt(spot.pos.x, spot.pos.z);
  const group = new THREE.Group();
  group.position.set(spot.pos.x, ground, spot.pos.z);
  group.rotation.y = spot.yaw;
  w.group.add(group);

  const standMat = new THREE.MeshStandardMaterial({
    color: def.environment === 'night' ? 0x131020 : def.environment === 'jungle' ? 0x77705a : 0x343747,
    roughness: 0.8,
    metalness: def.environment === 'night' ? 0.55 : 0.08,
    emissive: def.environment === 'night' ? 0x0b0416 : 0x000000,
    emissiveIntensity: 0.5,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: def.environment === 'night' ? 0x191328 : 0x665f69,
    roughness: 0.35,
    metalness: def.environment === 'night' ? 0.7 : 0.25,
  });
  const crowdGeo = new THREE.IcosahedronGeometry(0.21, 0);
  const crowd = [];
  const rng = mulberry32(662 + def.id.length);

  for (const sign of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const x = sign * (half + 6.3 + k * 1.75);
      const y = 0.55 + k * 0.77;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.78, 24), standMat);
      tier.position.set(x, y, 0);
      tier.castShadow = false;
      tier.receiveShadow = true;
      group.add(tier);
      for (let i = 0; i < 42; i++) {
        const hue = [0xff5a45, 0xffd247, 0x55dfff, 0x75e36f, 0xff7bcd, 0xffffff][Math.floor(rng() * 6)];
        crowd.push({
          pos: new THREE.Vector3(
            x + (rng() - 0.5) * 1.1,
            y + 0.47 + rng() * 0.2,
            -11 + rng() * 22,
          ),
          rotY: rng() * TAU,
          scale: 0.8 + rng() * 0.55,
          color: new THREE.Color(hue).multiplyScalar(0.7 + rng() * 0.45),
        });
      }
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.38, 25.5), roofMat);
    roof.position.set(sign * (half + 10.4), 6.9, 0);
    roof.rotation.z = sign * -0.05;
    group.add(roof);
    for (const z of [-11.5, 0, 11.5]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.2, 7, 8),
        new THREE.MeshStandardMaterial({ color: 0x8d94a0, metalness: 0.6, roughness: 0.3 }),
      );
      post.position.set(sign * (half + 14.1), 3.5, z);
      group.add(post);
    }
    const bannerTex = makeSignTexture('TURBO', sign > 0 ? def.accent : def.accent2, '#101018');
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 2.6),
      new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide, toneMapped: false }),
    );
    face.position.set(sign * (half + 4.55), 3.05, 0);
    face.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(face);
  }

  const crowdMesh = w.addInstanced(crowdGeo, new THREE.MeshStandardMaterial({
    roughness: 0.72,
  }), crowd);
  if (crowdMesh) crowdMesh.castShadow = false;

  w.addAnimation((dt, time) => {
    let idx = 0;
    void idx;
    if (!crowdMesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < crowd.length; i += 17) {
      const c = crowd[i];
      dummy.position.copy(c.pos);
      dummy.position.y += Math.sin(time * 5 + i * 0.9) * 0.035;
      dummy.rotation.set(0, c.rotY, 0);
      dummy.scale.setScalar(c.scale);
      dummy.updateMatrix();
      crowdMesh.setMatrixAt(i, dummy.matrix);
    }
    crowdMesh.instanceMatrix.needsUpdate = true;
  });
}

export function buildLamps(w) {
  const def = w.def;
  const half = w.half;
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.14, 1, 6);
  const bulbGeo = new THREE.SphereGeometry(0.28, 8, 7);
  const poleTransforms = [];
  const bulbTransforms = [];
  const step = 38;
  for (let i = 0; i < w.N; i += step) {
    const s = w.samples[i];
    for (const sign of [-1, 1]) {
      const lat = sign * (half + 4.2);
      const x = s.p.x + s.side.x * lat;
      const z = s.p.z + s.side.z * lat;
      const gy = w.groundHeightAt(x, z);
      poleTransforms.push({
        pos: new THREE.Vector3(x, gy + 2.7, z),
        rotY: s.heading,
        scaleY: 5.4,
        scaleX: 1,
        scaleZ: 1,
        color: 0x555a68,
      });
      bulbTransforms.push({
        pos: new THREE.Vector3(x, gy + 5.45, z),
        rotY: 0,
        scale: 1,
        color: new THREE.Color(def.railGlow),
      });
    }
  }
  w.addInstanced(poleGeo, new THREE.MeshStandardMaterial({
    roughness: 0.55, metalness: 0.5,
  }), poleTransforms);
  w.addInstanced(bulbGeo, new THREE.MeshStandardMaterial({
    emissive: def.railGlow,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  }), bulbTransforms);

  const flagGeo = new THREE.PlaneGeometry(1.1, 0.62, 1, 1);
  flagGeo.translate(0.55, 0, 0);
  const flagPoleGeo = new THREE.CylinderGeometry(0.035, 0.045, 1, 5);
  const flags = [];
  const poles = [];
  for (let i = 7; i < w.N; i += 49) {
    const s = w.samples[i];
    for (const sign of [-1, 1]) {
      const lat = sign * (half + 3.5);
      const x = s.p.x + s.side.x * lat;
      const z = s.p.z + s.side.z * lat;
      const gy = w.groundHeightAt(x, z);
      poles.push({
        pos: new THREE.Vector3(x, gy + 1.65, z),
        scaleY: 3.3,
      });
      flags.push({
        pos: new THREE.Vector3(x, gy + 3.18, z),
        rotY: s.heading + (sign > 0 ? 0.55 : -0.55),
        color: i % 98 === 7 ? def.accent2 : def.accent,
      });
    }
  }
  w.addInstanced(flagPoleGeo, new THREE.MeshStandardMaterial({ color: 0x8b8f99, metalness: 0.5, roughness: 0.4 }), poles);
  w.addInstanced(flagGeo, new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide, roughness: 0.6,
  }), flags);
  w.addAnimation((dt, time) => {
    // Flag poles share static instances; a gentle group sway is cheaper than per-instance updates.
    if (time < 0.01) return;
  });
}

export function buildItems(w) {
  const def = w.def;
  const boxGeo = new THREE.BoxGeometry(1.45, 1.45, 1.45);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  const coreGeo = new THREE.IcosahedronGeometry(0.46, 0);
  const questionTex = makeQuestionTexture();
  const questionMat = new THREE.SpriteMaterial({
    map: questionTex,
    color: def.accent,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: def.accent,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.26,
    roughness: 0.15,
    metalness: 0.35,
    depthWrite: false,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: def.accent,
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: def.accent2,
    emissive: def.accent2,
    emissiveIntensity: 1.7,
    roughness: 0.2,
    metalness: 0.4,
  });

  for (const rowT of def.items) {
    for (const lane of [-4.15, 0, 4.15]) {
      const spot = w.trackSpot(rowT, lane, 0);
      const group = new THREE.Group();
      group.position.copy(spot.pos);
      group.position.y += 1.25;
      group.rotation.y = spot.yaw;
      const shell = new THREE.Mesh(boxGeo, shellMat);
      group.add(shell);
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      group.add(edges);
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);
      const sprite = new THREE.Sprite(questionMat);
      sprite.scale.setScalar(0.95);
      group.add(sprite);
      w.group.add(group);
      w.itemBoxes.push({
        group,
        baseY: group.position.y,
        active: true,
        respawnAt: 0,
        phase: Math.random() * TAU,
        lane,
        t: rowT,
      });
    }
  }

  const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.09, 18);
  coinGeo.rotateZ(Math.PI / 2);
  const ringGeo = new THREE.TorusGeometry(0.39, 0.045, 5, 18);
  ringGeo.rotateY(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffc928,
    emissive: 0x8a4c00,
    emissiveIntensity: 0.25,
    metalness: 0.88,
    roughness: 0.17,
  });
  const rng = mulberry32(707 + def.id.length);
  for (let i = 0; i < def.coins; i++) {
    const t = (i + 0.35) / def.coins;
    const lane = (rng() - 0.5) * (w.width - 4);
    const spot = w.trackSpot(t, lane, 0);
    const group = new THREE.Group();
    group.position.copy(spot.pos);
    group.position.y += 1.1;
    const coin = new THREE.Mesh(coinGeo, coinMat);
    group.add(coin);
    const ring = new THREE.Mesh(ringGeo, coinMat);
    group.add(ring);
    w.group.add(group);
    w.coins.push({
      mesh: group,
      baseY: group.position.y,
      phase: rng() * TAU,
      active: true,
      t,
      lane,
    });
  }
}

export function buildBoosts(w) {
  const def = w.def;
  const chevron = makeChevronTexture();
  const entries = def.boosts.map((b) => ({ t: b.t, lane: b.lane }));
  for (const sc of w.shortcuts || []) {
    entries.push({
      t: (sc.t0 + sc.t1) / 2,
      lane: sc.side * (w.half + sc.cut * 0.55),
    });
  }
  for (const item of entries) {
    const group = groundPose(w, item.t, item.lane, 0.05);
    const mat = new THREE.MeshBasicMaterial({
      map: chevron,
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7.2), mat);
    pad.rotation.set(-Math.PI / 2, 0, Math.PI);
    group.add(pad);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 8.1),
      new THREE.MeshBasicMaterial({
        map: chevron,
        color: def.accent,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    glow.rotation.set(-Math.PI / 2, 0, Math.PI);
    glow.position.y = -0.012;
    group.add(glow);
    group.renderOrder = 3;
    w.group.add(group);
    w.boostPads.push({
      t: item.t,
      lane: item.lane,
      pos: group.position.clone(),
      group,
      material: mat,
      glow,
      yaw: group.rotation.y,
    });
  }
}

export function buildTurnMarkers(w) {
  const N = w.N;
  const look = Math.max(16, Math.round(N * 0.014));
  const scores = new Float32Array(N);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  for (let i = 0; i < N; i++) {
    const a = w.samples[i].heading;
    const b = w.samples[(i + look) % N].heading;
    scores[i] = wrap(b - a);
  }

  const peaks = [];
  for (let i = 0; i < N; i++) {
    const mag = Math.abs(scores[i]);
    if (mag < 0.16) continue;
    let peak = true;
    for (let k = -6; k <= 6; k++) {
      if (Math.abs(scores[(i + k + N) % N]) > mag) { peak = false; break; }
    }
    if (peak) peaks.push({ i, mag });
  }
  peaks.sort((a, b) => b.mag - a.mag);

  const minGap = Math.round(N * 0.034);
  const chosen = [];
  const fits = (i) => chosen.every((j) => {
    const d = Math.abs(i - j) % N;
    return Math.min(d, N - d) >= minGap;
  });

  // Strongest corners first, then top up gentler circuits so every lap gets arrows.
  for (const p of peaks) {
    if (chosen.length >= 5) break;
    if (p.mag < 0.34) continue;
    if (fits(p.i)) chosen.push(p.i);
  }
  if (chosen.length < 2) {
    for (const p of peaks) {
      if (chosen.length >= 2) break;
      if (fits(p.i)) chosen.push(p.i);
    }
  }

  const tex = { left: makeTurnTexture('left'), right: makeTurnTexture('right') };
  w.turnMarkers = [];
  for (const i of chosen) {
    const dir = scores[i] > 0 ? 'left' : 'right';
    const t = ((i + 5) % N) / N;
    const group = groundPose(w, t, 0, 0.065);
    const mat = new THREE.MeshBasicMaterial({
      map: tex[dir],
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 8.1), mat);
    decal.rotation.set(-Math.PI / 2, 0, Math.PI);
    group.add(decal);
    group.renderOrder = 2;
    w.group.add(group);
    w.turnMarkers.push({ t, dir, group });
  }
}

export function buildWeather(w) {
  const def = w.def;
  if (def.weather === 'sparks') makeSparks(w);
  else if (def.weather === 'dust') makeDust(w);
  else if (def.environment === 'dusk') makeSnow(w);
  else if (def.environment === 'night') makeRain(w);
  else if (def.environment === 'lava') makeEmbers(w);
  else if (def.environment === 'jungle') makeFireflies(w);
}

function makeSnow(w) {
  const count = Math.max(90, Math.round(1050 * graphics().weather));
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count);
  const rng = mulberry32(222);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rng() - 0.5) * 100;
    pos[i * 3 + 1] = rng() * 34;
    pos[i * 3 + 2] = (rng() - 0.5) * 100;
    vel[i] = 1.8 + rng() * 3.8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: softDiscTexture(),
    color: 0xffffff,
    size: 0.36,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  pts.frustumCulled = false;
  w.group.add(pts);
  w.addAnimation((dt, time, player) => {
    const cx = player ? player.x : 0;
    const cz = player ? player.z : 0;
    const cy = player ? player.y : 0;
    for (let i = 0; i < count; i++) {
      let x = pos[i * 3];
      let y = pos[i * 3 + 1];
      let z = pos[i * 3 + 2];
      y -= vel[i] * dt;
      x += Math.sin(time * 0.7 + i) * dt * 0.45;
      z += Math.cos(time * 0.5 + i * 1.7) * dt * 0.3;
      if (y < -5) {
        y = 34;
        x = (rng() - 0.5) * 100;
        z = (rng() - 0.5) * 100;
      }
      if (x > 50) x -= 100;
      if (x < -50) x += 100;
      if (z > 50) z -= 100;
      if (z < -50) z += 100;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    pts.position.set(cx, cy, cz);
    geo.attributes.position.needsUpdate = true;
  });
}

function makeRain(w) {
  const count = Math.max(80, Math.round(900 * graphics().weather));
  const positions = new Float32Array(count * 6);
  const drops = [];
  const rng = mulberry32(514);
  for (let i = 0; i < count; i++) {
    drops.push({
      x: (rng() - 0.5) * 100,
      y: rng() * 45,
      z: (rng() - 0.5) * 100,
      v: 28 + rng() * 22,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0x86dcff,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  lines.frustumCulled = false;
  w.group.add(lines);
  w.addAnimation((dt, time, player) => {
    const cx = player ? player.x : 0;
    const cy = player ? player.y : 0;
    const cz = player ? player.z : 0;
    for (let i = 0; i < count; i++) {
      const d = drops[i];
      d.y -= d.v * dt;
      if (d.y < -6) {
        d.y = 40 + rng() * 8;
        d.x = (rng() - 0.5) * 100;
        d.z = (rng() - 0.5) * 100;
      }
      positions[i * 6] = d.x;
      positions[i * 6 + 1] = d.y;
      positions[i * 6 + 2] = d.z;
      positions[i * 6 + 3] = d.x - 0.13;
      positions[i * 6 + 4] = d.y + 1.2;
      positions[i * 6 + 5] = d.z - 0.07;
    }
    lines.position.set(cx, cy, cz);
    geo.attributes.position.needsUpdate = true;
    void time;
  });
}

function makeEmbers(w) {
  const count = Math.max(70, Math.round(760 * graphics().weather));
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count);
  const rng = mulberry32(918);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rng() - 0.5) * 110;
    pos[i * 3 + 1] = rng() * 28;
    pos[i * 3 + 2] = (rng() - 0.5) * 110;
    vel[i] = 2 + rng() * 5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: softDiscTexture(),
    color: 0xff7a22,
    size: 0.3,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false;
  w.group.add(pts);
  w.addAnimation((dt, time, player) => {
    const cx = player ? player.x : 0;
    const cz = player ? player.z : 0;
    const cy = player ? player.y : 0;
    for (let i = 0; i < count; i++) {
      let x = pos[i * 3];
      let y = pos[i * 3 + 1] + vel[i] * dt;
      let z = pos[i * 3 + 2];
      x += Math.sin(time * 1.5 + i) * dt * 0.8;
      z += Math.cos(time * 1.1 + i * 0.8) * dt * 0.6;
      if (y > 34) {
        y = -2;
        x = (rng() - 0.5) * 110;
        z = (rng() - 0.5) * 110;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    pts.position.set(cx, cy, cz);
    geo.attributes.position.needsUpdate = true;
  });
}

function makeFireflies(w) {
  const count = Math.max(50, Math.round(260 * graphics().weather));
  const pos = new Float32Array(count * 3);
  const base = [];
  const rng = mulberry32(844);
  for (let i = 0; i < count; i++) {
    const t = rng();
    const side = rng() > 0.5 ? 1 : -1;
    const lat = side * (w.half + 4 + rng() * 28);
    const s = w.samples[Math.floor(t * w.N)];
    const x = s.p.x + s.side.x * lat;
    const z = s.p.z + s.side.z * lat;
    const y = w.groundHeightAt(x, z) + 1.2 + rng() * 5;
    base.push({ x, y, z, phase: rng() * TAU, amp: 0.5 + rng() * 1.4 });
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: softDiscTexture(),
    color: 0xffec75,
    size: 0.36,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  w.group.add(pts);
  w.addAnimation((dt, time) => {
    for (let i = 0; i < count; i++) {
      const b = base[i];
      pos[i * 3] = b.x + Math.sin(time * 0.9 + b.phase) * b.amp;
      pos[i * 3 + 1] = b.y + Math.cos(time * 1.3 + b.phase) * b.amp * 0.55;
      pos[i * 3 + 2] = b.z + Math.cos(time * 0.7 + b.phase * 1.4) * b.amp;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.65 + Math.sin(time * 2.1) * 0.25;
  });
}

function makeDust(w) {
  const count = Math.max(90, Math.round(760 * graphics().weather));
  const pos = new Float32Array(count * 3);
  const seed = [];
  const rng = mulberry32(717);
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 118;
    const y = 0.4 + rng() * 10;
    const z = (rng() - 0.5) * 118;
    seed.push({ y, phase: rng() * TAU, speed: 2.2 + rng() * 5.4, drift: 0.3 + rng() * 1.3 });
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: softDiscTexture(),
    color: 0xf6d29b,
    size: 0.62,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  w.group.add(pts);
  w.addAnimation((dt, time, player) => {
    for (let i = 0; i < count; i++) {
      const s = seed[i];
      let x = pos[i * 3] + s.speed * dt;
      let y = pos[i * 3 + 1] + Math.sin(time * 0.7 + s.phase) * dt * 0.5;
      let z = pos[i * 3 + 2] + s.drift * dt;
      if (x > 59) x -= 118;
      if (z > 59) z -= 118;
      if (y < 0.3) y = 10.4;
      if (y > 10.6) y = 0.4;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    pts.position.set(player ? player.x : 0, player ? player.y : 0, player ? player.z : 0);
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.24 + Math.sin(time * 0.9) * 0.08;
  });
}

function makeSparks(w) {
  const count = Math.max(80, Math.round(560 * graphics().weather));
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const seed = [];
  const rng = mulberry32(933);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 130;
    const y = rng() * 32;
    const z = (rng() - 0.5) * 130;
    seed.push({ phase: rng() * TAU, rise: 0.6 + rng() * 2.6, hue: rng() });
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    c.setHSL(seed[i].hue > 0.55 ? 0.52 : 0.74, 0.95, 0.68);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    map: softDiscTexture(),
    vertexColors: true,
    size: 0.42,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  w.group.add(pts);
  w.addAnimation((dt, time, player) => {
    for (let i = 0; i < count; i++) {
      const s = seed[i];
      let y = pos[i * 3 + 1] + s.rise * dt;
      let x = pos[i * 3] + Math.sin(time * 0.8 + s.phase) * dt * 0.7;
      if (y > 34) y = 0;
      if (x > 65) x -= 130;
      if (x < -65) x += 130;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
    }
    pts.position.set(player ? player.x : 0, player ? player.y : 0, player ? player.z : 0);
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.62 + Math.sin(time * 2.2) * 0.24;
  });
}

export { css };
