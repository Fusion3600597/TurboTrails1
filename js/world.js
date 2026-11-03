import * as THREE from '../vendor/three.module.js';
import { buildWorld } from './world-parts.js?v=20261108';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export class TrackWorld {
  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.group = new THREE.Group();
    this.group.name = `track-${def.id}`;
    scene.add(this.group);

    this.animations = [];
    this.itemBoxes = [];
    this.coins = [];
    this.boostPads = [];
    this.startLights = [];
    this.width = def.width;
    this.half = def.width / 2;
    this.N = 1200;

    const pts = def.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
    this.curve.arcLengthDivisions = 2400;
    this.length = this.curve.getLength();

    this.samples = [];
    for (let i = 0; i < this.N; i++) {
      const t = i / this.N;
      const p = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t).normalize();
      const htan = new THREE.Vector3(tan.x, 0, tan.z).normalize();
      const side = new THREE.Vector3(htan.z, 0, -htan.x);
      this.samples.push({
        i,
        t,
        p,
        tan,
        htan,
        side,
        heading: Math.atan2(htan.x, htan.z),
      });
    }

    this.start = this.samples[0];
    this.startHeading = this.start.heading;
    this.startPoint = this.start.p.clone();

    this.shortcuts = (def.shortcuts || []).map((s) => {
      const turn = Math.atan2(
        Math.sin(this.headingAt(s.t1) - this.headingAt(s.t0)),
        Math.cos(this.headingAt(s.t1) - this.headingAt(s.t0)),
      );
      return { ...s, side: turn >= 0 ? 1 : -1 };
    });

    this.scene.fog = new THREE.FogExp2(def.fog, def.fogDensity);
    this.scene.background = new THREE.Color(def.skyBottom);

    buildWorld(this);
  }

  pointAt(t) {
    const tt = ((t % 1) + 1) % 1;
    return this.curve.getPointAt(tt);
  }

  sideAt(t) {
    const idx = Math.round((((t % 1) + 1) % 1) * this.N) % this.N;
    return this.samples[idx].side;
  }

  headingAt(t) {
    const idx = Math.round((((t % 1) + 1) % 1) * this.N) % this.N;
    return this.samples[idx].heading;
  }

  trackSpot(t, lateral = 0, yOff = 0) {
    const idx = Math.round((((t % 1) + 1) % 1) * this.N) % this.N;
    const s = this.samples[idx];
    return {
      pos: new THREE.Vector3(
        s.p.x + s.side.x * lateral,
        s.p.y + yOff,
        s.p.z + s.side.z * lateral,
      ),
      yaw: s.heading,
      sample: s,
    };
  }

  getStartGrid(slot) {
    const row = Math.floor(slot / 2);
    const col = slot % 2;
    const t = ((0.995 - row * 0.0046) % 1 + 1) % 1;
    const spot = this.trackSpot(t, col ? 2.9 : -2.9, 0.03);
    return spot;
  }

  groundHeightAt(x, z) {
    let bestD = Infinity;
    let bestY = 0;
    for (let i = 0; i < this.N; i += 5) {
      const s = this.samples[i];
      const dx = x - s.p.x;
      const dz = z - s.p.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        bestY = s.p.y;
      }
    }
    const dist = Math.sqrt(bestD);
    const base = -1.4 + Math.sin(x * 0.018) * 2.4 + Math.cos(z * 0.021) * 1.7
      + Math.sin((x + z) * 0.009) * 3.2;
    const near = bestY - 1.35 + Math.sin(x * 0.11) * 0.22 + Math.cos(z * 0.13) * 0.2;
    return THREE.MathUtils.lerp(base, near, smooth(110, 20, dist));
  }

  sideTransforms(count, minLat, maxLat, seed, yOff = 0, bothSides = true) {
    let a = seed >>> 0;
    const rng = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = rng();
      const sign = bothSides ? (rng() > 0.5 ? 1 : -1) : (i % 2 ? 1 : -1);
      const lat = sign * (this.half + minLat + rng() * (maxLat - minLat));
      const s = this.samples[Math.floor(t * this.N) % this.N];
      const x = s.p.x + s.side.x * lat;
      const z = s.p.z + s.side.z * lat;
      out.push({
        pos: new THREE.Vector3(x, this.groundHeightAt(x, z) + yOff, z),
        rotY: rng() * TAU,
        scale: 0.75 + rng() * 0.65,
        rnd: rng(),
        t,
        side: sign,
      });
    }
    return out;
  }

  addInstanced(geometry, material, transforms, opts = {}) {
    if (!transforms.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    transforms.forEach((tr, i) => {
      dummy.position.copy(tr.pos);
      dummy.rotation.set(tr.rotX || 0, tr.rotY || 0, tr.rotZ || 0);
      const s = tr.scale ?? 1;
      dummy.scale.set(
        (tr.scaleX ?? s),
        (tr.scaleY ?? s),
        (tr.scaleZ ?? s),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (tr.color !== undefined) {
        color.set(tr.color);
        mesh.setColorAt(i, color);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = !!opts.castShadow;
    mesh.receiveShadow = !!opts.receiveShadow;
    this.group.add(mesh);
    return mesh;
  }

  addAnimation(fn) {
    this.animations.push(fn);
  }

  addGlowSprite(pos, color, size, opacity = 0.7) {
    const mat = new THREE.SpriteMaterial({
      map: makeSoftGlow(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.setScalar(size);
    this.group.add(sprite);
    return sprite;
  }

  nearest(pos, hint = null, range = 150) {
    let bestD = Infinity;
    let bestIdx = 0;
    if (hint === null || hint === undefined) {
      for (let i = 0; i < this.N; i++) {
        const s = this.samples[i];
        const dx = pos.x - s.p.x;
        const dz = pos.z - s.p.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
    } else {
      for (let k = -range; k <= range; k++) {
        const i = ((hint + k) % this.N + this.N) % this.N;
        const s = this.samples[i];
        const dx = pos.x - s.p.x;
        const dz = pos.z - s.p.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
    }
    const s = this.samples[bestIdx];
    const rx = pos.x - s.p.x;
    const rz = pos.z - s.p.z;
    return {
      index: bestIdx,
      t: bestIdx / this.N,
      point: s.p,
      sample: s,
      tangent: s.tan,
      htan: s.htan,
      side: s.side,
      heading: s.heading,
      offset: rx * s.side.x + rz * s.side.z,
      along: rx * s.htan.x + rz * s.htan.z,
      distance: Math.sqrt(bestD),
    };
  }

  setStartLights(lit, go = false) {
    this.startLights.forEach((m, i) => {
      const on = go ? true : i < lit;
      m.color.set(on ? (go ? 0x47ff7a : 0xff2f45) : 0x1b0d12);
      m.emissive.set(on ? (go ? 0x47ff7a : 0xff2f45) : 0x090306);
      m.emissiveIntensity = on ? 4 : 0.25;
    });
  }

  update(dt, time, playerPos) {
    for (const fn of this.animations) fn(dt, time, playerPos);
    for (const box of this.itemBoxes) {
      if (!box.active && time >= box.respawnAt) {
        box.active = true;
        box.group.visible = true;
      }
      if (box.active) {
        box.group.rotation.y += dt * 1.9;
        box.group.position.y = box.baseY + Math.sin(time * 2.8 + box.phase) * 0.18;
      }
    }
    for (const coin of this.coins) {
      if (!coin.active) continue;
      coin.mesh.rotation.y += dt * 4.5;
      coin.mesh.position.y = coin.baseY + Math.sin(time * 3.4 + coin.phase) * 0.13;
    }
    for (const pad of this.boostPads) {
      if (pad.material.map) pad.material.map.offset.y = (pad.material.map.offset.y - dt * 1.35) % 1;
      pad.glow.material.opacity = 0.28 + Math.sin(time * 5 + pad.t * 30) * 0.12;
    }
  }

  getMinimapPoints(step = 12) {
    const pts = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < this.N; i += step) {
      const p = this.samples[i].p;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
      pts.push(p);
    }
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    return pts.map((p) => ({
      x: (p.x - minX) / span + (1 - (maxX - minX) / span) / 2,
      y: (p.z - minZ) / span + (1 - (maxZ - minZ) / span) / 2,
    }));
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          for (const key of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap']) {
            const tex = m[key];
            if (tex && tex.dispose && !tex.userData?.shared) tex.dispose();
          }
          m.dispose();
        }
      }
    });
    if (this.scene.fog) this.scene.fog = null;
  }
}

let _softGlow = null;
function makeSoftGlow() {
  if (_softGlow) return _softGlow;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _softGlow = new THREE.CanvasTexture(c);
  _softGlow.colorSpace = THREE.SRGBColorSpace;
  _softGlow.userData.shared = true;
  return _softGlow;
}
