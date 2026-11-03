import * as THREE from '../vendor/three.module.js';
import { RACERS, ITEMS } from './tracks.js?v=20261108';
import {
  createKart, updateKartVisual, createShell, createBanana, createStar, disposeObject,
} from './karts.js?v=20261108';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const wrapAngle = (a) => {
  let x = a;
  while (x > Math.PI) x -= TAU;
  while (x < -Math.PI) x += TAU;
  return x;
};
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const rand = (a, b) => a + Math.random() * (b - a);
const shortcutEnvelope = (f) => {
  const edge = 0.16;
  const t = clamp(Math.min(f, 1 - f) / edge, 0, 1);
  return t * t * (3 - 2 * t);
};

export function formatTime(seconds, ms = true) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const frac = Math.floor((t % 1) * 1000);
  const base = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return ms ? `${base}.${String(frac).padStart(3, '0')}` : base;
}

const DRIFT_TIERS = [
  { at: 0, color: '#8fe9ff', name: '' },
  { at: 0.85, color: '#6fd8ff', name: 'MINI' },
  { at: 1.75, color: '#ffb03d', name: 'SUPER' },
  { at: 2.7, color: '#d17bff', name: 'ULTRA' },
];

export class Race {
  constructor({ scene, world, track, playerRacer, opponents, difficulty, effects, audio, ui, onFinish }) {
    this.scene = scene;
    this.world = world;
    this.track = track;
    this.playerRacer = playerRacer;
    this.difficulty = difficulty || {
      id: 'normal', aiSpeed: 0.975, rubber: 0.9, aggression: 1, corner: 0.95,
    };
    this.effects = effects;
    this.audio = audio;
    this.ui = ui;
    this.onFinish = onFinish;

    this.N = world.N;
    this.laps = track.laps;
    this.clock = 0;
    this.time = 0;
    this.state = 'countdown';
    this.countdownTime = 3.05;
    this.goTimer = 0;
    this.countLabel = null;
    this.startOffset = new Map();
    this.karts = [];
    this.shells = [];
    this.bananas = [];
    this.coinTimers = [];
    this.finishTimer = 0;
    this.resultsShown = false;
    this.shake = 0;
    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 1600);
    this.cameraFov = 70;
    this.cameraLook = new THREE.Vector3();
    this.cameraInit = false;
    this.wrongWayTimer = 0;
    this.touchMode = false;

    this.shortcutGates = [];
    for (const sc of world.shortcuts || []) {
      const i0 = Math.round(sc.t0 * this.N);
      const i1 = Math.round(sc.t1 * this.N);
      for (let i = i0; i <= i1; i += 2) {
        const f = (i - i0) / Math.max(1, i1 - i0);
        const env = shortcutEnvelope(f);
        const s = world.samples[((i % this.N) + this.N) % this.N];
        const lat = sc.side * (world.half + 0.3 + sc.cut * env * 0.52);
        this.shortcutGates.push({
          x: s.p.x + s.side.x * lat,
          z: s.p.z + s.side.z * lat,
          r: 3.2 + sc.cut * env * 0.62,
          sc,
        });
      }
    }

    this.input = { throttle: 0, brake: 0, steer: 0, drift: false };

    const pool = (opponents && opponents.length)
      ? opponents.filter((r) => r.id !== playerRacer.id)
      : RACERS.filter((r) => r.id !== playerRacer.id);
    const others = pool.slice(0, 7);
    if (others.length < 7) {
      for (const r of RACERS) {
        if (others.length >= 7) break;
        if (r.id === playerRacer.id || others.some((o) => o.id === r.id)) continue;
        others.push(r);
      }
    }
    for (let slot = 0; slot < 8; slot++) {
      const racer = slot === 7 ? playerRacer : others[slot];
      this.spawnRacer(racer, slot);
    }
    this.player = this.karts.find((k) => k.isPlayer);

    this.mapBounds = this.computeMapBounds();
    this.minimapPoints = world.getMinimapPoints(8);
    this.updateCamera(0.016, true);
    this.audio.startMusic('race');
    this.audio.setEngine(true, 1, false, false);
  }

  computeMapBounds() {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of this.world.samples) {
      minX = Math.min(minX, s.p.x);
      maxX = Math.max(maxX, s.p.x);
      minZ = Math.min(minZ, s.p.z);
      maxZ = Math.max(maxZ, s.p.z);
    }
    const span = Math.max(maxX - minX, maxZ - minZ) || 1;
    return {
      minX, minZ, span,
      padX: (1 - (maxX - minX) / span) / 2,
      padZ: (1 - (maxZ - minZ) / span) / 2,
    };
  }

  mapPoint(pos) {
    const b = this.mapBounds;
    return {
      x: (pos.x - b.minX) / b.span + b.padX,
      y: (pos.z - b.minZ) / b.span + b.padZ,
    };
  }

  spawnRacer(racer, slot) {
    const kartVisual = createKart(racer, slot === 7);
    this.scene.add(kartVisual.root);

    const spot = this.world.getStartGrid(slot);
    kartVisual.root.position.copy(spot.pos);
    kartVisual.root.rotation.y = spot.yaw;

    const nearest = this.world.nearest(spot.pos);
    const offset = (this.N - nearest.index) % this.N;
    const stat = racer.stats;
    const maxSpeed = 25.4 + stat.speed * 1.55;
    const k = {
      racer,
      isPlayer: slot === 7,
      slot,
      visual: kartVisual,
      pos: spot.pos.clone(),
      yaw: spot.yaw,
      speed: 0,
      steer: 0,
      input: { throttle: 1, brake: 0, steer: 0, drift: false },
      maxSpeed,
      accel: 10.5 + stat.accel * 1.75,
      turn: 0.82 + stat.handling * 0.09,
      trackIndex: nearest.index,
      prevIndex: nearest.index,
      progress: 0,
      startOffset: offset,
      targetProgress: this.laps * this.N - offset,
      lap: 1,
      lapMark: 0,
      lapTimes: [],
      bestLap: null,
      finished: false,
      finishTime: null,
      finishRank: null,
      coins: 0,
      item: null,
      roulette: 0,
      boost: 0,
      star: 0,
      shrink: 0,
      spin: 0,
      hitLock: 0,
      drift: false,
      driftCharge: 0,
      driftTier: 0,
      driftEmit: 0,
      driftSlip: 0,
      pitchTarget: 0,
      offroad: false,
      padCooldown: 0,
      dustTimer: 0,
      starEmit: 0,
      bumpCooldown: 0,
      aiSkill: slot === 7 ? 1 : rand(0.955, 1.015) * this.difficulty.aiSpeed,
      aiLane: rand(-2.1, 2.1),
      aiPhase: rand(0, TAU),
      aiItemTimer: Infinity,
      aiCatchup: rand(2, 7),
      wrongWay: 0,
    };
    k.starMesh = createStar();
    k.starMesh.position.set(0, 2.55, -0.15);
    k.starMesh.scale.setScalar(0.55);
    k.starMesh.visible = false;
    kartVisual.root.add(k.starMesh);

    this.karts.push(k);
    return k;
  }

  setTouchMode(on) {
    this.touchMode = on;
  }

  setPlayerInput(input) {
    this.input = input;
  }

  shortcutAt(t) {
    for (const sc of this.world.shortcuts || []) {
      if (t >= sc.t0 && t <= sc.t1) {
        const f = (t - sc.t0) / (sc.t1 - sc.t0);
        return { ...sc, f, grow: sc.cut * shortcutEnvelope(f) };
      }
    }
    return null;
  }

  shortcutContaining(pos) {
    for (const g of this.shortcutGates) {
      const dx = pos.x - g.x;
      const dz = pos.z - g.z;
      if (dx * dx + dz * dz < g.r * g.r) return g.sc;
    }
    return null;
  }

  usePlayerItem() {
    if (this.state !== 'racing' || this.player.finished) return;
    this.useItem(this.player);
  }

  resetPlayer() {
    const k = this.player;
    if (!k || k.finished) return;
    const near = this.world.nearest(k.pos);
    const spot = this.world.trackSpot(near.t, clamp(near.offset, -2, 2));
    k.pos.copy(spot.pos);
    k.pos.y += 0.05;
    k.yaw = spot.yaw;
    k.speed = 0;
    k.spin = 0;
    k.hitLock = 0;
    k.trackIndex = near.index;
    k.prevIndex = near.index;
    k.visual.root.position.copy(k.pos);
    k.visual.root.rotation.y = k.yaw;
    this.audio.click();
    this.ui.message('Recovered', 'Back on the racing line', '', 900);
  }

  // ───────────────────────────── main loop ─────────────────────────────

  update(dt) {
    dt = Math.min(dt, 0.045);
    this.clock += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);

    if (this.state === 'countdown') this.updateCountdown(dt);
    else if (this.state === 'racing') this.time += dt;

    const racing = this.state === 'racing' || this.state === 'finished';
    if (racing) {
      for (const k of this.karts) {
        if (this.state === 'finished') {
          k.input = { throttle: 0, brake: 1, steer: 0, drift: false };
          if (k.isPlayer) k.input.brake = 1;
          else k.input.throttle = 0.3;
        } else if (k.isPlayer) {
          k.input = this.input;
        } else if (!k.finished) {
          k.input = this.aiInput(k, dt);
        } else {
          k.input = { throttle: 0.25, brake: 0, steer: 0, drift: false };
        }
        this.driveKart(k, k.input, dt, racing);
        if (!k.isPlayer && !k.finished) this.aiItemLogic(k, dt);
        this.checkPickups(k);
        this.updateVisual(k, dt);
      }
      this.resolveKartCollisions(dt);
      this.updateShells(dt);
      this.updateBananas(dt);
      this.updateCoins(dt);
      this.checkLaps();
      this.updateRanks();
    } else {
      for (const k of this.karts) {
        this.updateVisual(k, dt);
      }
      this.updateIdleCamera(dt);
    }

    if (this.state === 'countdown') {
      const remain = this.countdownTime;
      const lit = remain > 2 ? 0 : remain > 1 ? 1 : remain > 0 ? 2 : 3;
      this.world.setStartLights(lit, remain <= 0);
    } else if (this.goTimer > 0) {
      this.goTimer -= dt;
      if (this.goTimer <= 0) this.world.setStartLights(0, false);
    }

    this.world.update(dt, this.clock, this.player.pos);
    this.updateCamera(dt);
    this.updateAudio();

    if (this.state === 'finished') {
      this.finishTimer += dt;
      if (!this.resultsShown && this.finishTimer > 2.35) {
        this.resultsShown = true;
        this.audio.setEngine(false);
        this.audio.stopMusic();
        this.onFinish?.(this.buildResults());
      }
    }

    this.wrongWayTimer -= dt;
    if (racing && !this.player.finished && this.player.wrongWay > 0.6 && this.wrongWayTimer <= 0) {
      this.ui.message('Wrong way', 'Turn around, champ', 'bad', 1100);
      this.wrongWayTimer = 2.4;
    }
  }

  updateCountdown(dt) {
    this.countdownTime -= dt;
    const remain = this.countdownTime;
    if (remain > 2) {
      this.setCountLabel('3', 'Engines ready');
    } else if (remain > 1) {
      this.setCountLabel('2', 'Hold the line');
    } else if (remain > 0) {
      this.setCountLabel('1', 'Send it');
    }
    if (remain <= 0) {
      this.state = 'racing';
      this.time = 0;
      this.goTimer = 1.05;
      this.shake = 0.22;
      this.setCountLabel('GO!', 'Race!', true);
      this.audio.countdown(0);
      this.audio.setEngine(true, 3, false, false);
      this.world.setStartLights(3, true);
      for (const k of this.karts) k.lapMark = 0;
    }
  }

  setCountLabel(label, sub, go = false) {
    if (label === this.countLabel) return;
    this.countLabel = label;
    this.ui.countdown(label, sub, go);
    if (/^\d$/.test(label)) this.audio.countdown(Number(label));
  }

  updateIdleCamera(dt) {
    const k = this.player;
    const angle = k.yaw + 0.75 + this.clock * 0.16;
    const target = new THREE.Vector3(
      k.pos.x + Math.sin(angle) * 9.5,
      k.pos.y + 4.1 + Math.sin(this.clock * 0.5) * 0.45,
      k.pos.z + Math.cos(angle) * 9.5,
    );
    if (!this.cameraInit) {
      this.camera.position.copy(target);
      this.cameraInit = true;
    } else {
      this.camera.position.lerp(target, 1 - Math.exp(-dt * 2.4));
    }
    this.cameraLook.lerp(new THREE.Vector3(k.pos.x, k.pos.y + 1.15, k.pos.z), 1 - Math.exp(-dt * 5));
    this.camera.lookAt(this.cameraLook);
    this.cameraFov = damp(this.cameraFov, 58, 3, dt);
    this.camera.fov = this.cameraFov;
    this.camera.updateProjectionMatrix();
  }

  // ───────────────────────────── kart physics ─────────────────────────────

  driveKart(k, input, dt, racing) {
    const half = this.world.half;
    const control = k.spin > 0 || k.hitLock > 0 || k.finished ? 0 : 1;
    const steerInput = clamp(input.steer, -1, 1) * control;
    k.steer = damp(k.steer, steerInput, 12, dt);

    k.boost = Math.max(0, k.boost - dt);
    k.star = Math.max(0, k.star - dt);
    k.shrink = Math.max(0, k.shrink - dt);
    k.spin = Math.max(0, k.spin - dt);
    k.hitLock = Math.max(0, k.hitLock - dt);
    k.padCooldown = Math.max(0, k.padCooldown - dt);
    k.bumpCooldown = Math.max(0, k.bumpCooldown - dt);
    k.wrongWay = Math.max(0, k.wrongWay - dt);
    if (k.roulette > 0) k.roulette = Math.max(0, k.roulette - dt);

    // Drift charging
    if (k.drift && control && k.speed > 8) {
      if (Math.abs(k.steer) > 0.2) {
        k.driftCharge += dt * (0.82 + Math.abs(k.steer) * 0.55 + (k.boost > 0 ? 0.2 : 0));
      } else {
        k.driftCharge = Math.max(0, k.driftCharge - dt * 1.6);
      }
    }
    if (!input.drift && k.drift) {
      this.releaseDrift(k);
    }
    const wasDrifting = k.drift;
    k.drift = !!input.drift && control && k.speed > 9 && Math.abs(k.steer) > 0.12;
    if (wasDrifting && !k.drift) this.releaseDrift(k);
    let tier = 0;
    for (let i = DRIFT_TIERS.length - 1; i >= 1; i--) {
      if (k.driftCharge >= DRIFT_TIERS[i].at) { tier = i; break; }
    }
    k.driftTier = tier;

    // Steering
    const speedRatio = clamp(Math.abs(k.speed) / 18, 0, 1);
    const driftTurn = k.drift ? 1.18 : 1;
    const highSpeedEase = 1 - clamp((Math.abs(k.speed) - 24) / 60, 0, 0.18);
    const turnRate = k.turn * (0.42 + 0.58 * speedRatio) * driftTurn * highSpeedEase;
    const directionSign = k.speed >= 0 ? 1 : -1;
    if (control) k.yaw += k.steer * turnRate * directionSign * dt;
    k.driftSlip = damp(k.driftSlip || 0, k.drift ? -k.steer * 0.16 : 0, 5.5, dt);

    // Longitudinal
    const boostMax = k.boost > 0 ? 13.5 : 0;
    const starMax = k.star > 0 ? 4.2 : 0;
    const coinMax = Math.min(10, k.coins) * 0.26;
    let maxSpeed = k.maxSpeed + boostMax + starMax + coinMax;
    if (k.shrink > 0) maxSpeed *= 0.68;
    const preNear = this.world.nearest(k.pos, k.trackIndex, 34);
    const preGate = this.shortcutContaining(k.pos);
    const preShortcut = preGate || this.shortcutAt(preNear.t);
    const preGrow = preShortcut && (preGate || Math.sign(preNear.offset) === preShortcut.side)
      ? preShortcut.grow : 0;
    const offroad = !preGate && Math.abs(preNear.offset) > half + 0.55 + preGrow;
    k.offroad = offroad;
    if (offroad) maxSpeed = Math.min(maxSpeed, 13.5);
    if (k.finished) maxSpeed = Math.min(maxSpeed, 12);

    const throttle = clamp(input.throttle, 0, 1) * control;
    const brake = clamp(input.brake, 0, 1) * control;
    if (throttle > 0.02) {
      const boostAccel = k.boost > 0 ? 2.1 : 1;
      k.speed += k.accel * throttle * boostAccel * dt;
    }
    if (brake > 0.02) {
      if (k.speed > 0) k.speed -= 26 * brake * dt;
      else k.speed -= 9 * brake * dt;
    }
    if (throttle <= 0.02 && brake <= 0.02) {
      k.speed -= k.speed * 0.42 * dt;
    }
    if (k.drift && k.speed > 8) {
      k.speed -= k.speed * 0.045 * dt;
    }
    if (k.speed > maxSpeed) {
      k.speed -= (k.speed - maxSpeed) * Math.min(1, dt * (k.boost > 0 ? 1.4 : 3.4));
    }
    if (k.speed < -8.5) k.speed = -8.5;
    if (Math.abs(k.speed) < 0.03 && throttle > 0.5) k.speed = 0;

    // Move — drifting adds a little outward slide so the kart visibly slips.
    const forward = new THREE.Vector3(Math.sin(k.yaw), 0, Math.cos(k.yaw));
    const sideVec = new THREE.Vector3(Math.cos(k.yaw), 0, -Math.sin(k.yaw));
    const slip = (k.driftSlip || 0) * Math.abs(k.speed);
    k.pos.x += (forward.x * k.speed + sideVec.x * slip) * dt;
    k.pos.z += (forward.z * k.speed + sideVec.z * slip) * dt;

    // Track query and barrier
    let near = this.world.nearest(k.pos, k.trackIndex, 92);
    const gate = this.shortcutContaining(k.pos);
    let limit = half + 2.35;
    const sc = gate ? null : this.shortcutAt(near.t);
    if (sc && Math.sign(near.offset) === sc.side) limit += sc.grow;
    if (!gate && Math.abs(near.offset) > limit) {
      const sign = Math.sign(near.offset);
      const pull = Math.abs(near.offset) - limit;
      k.pos.x -= near.side.x * pull * sign;
      k.pos.z -= near.side.z * pull * sign;
      k.speed *= 0.94;
      k.yaw = k.yaw + wrapAngle(near.heading - k.yaw) * Math.min(1, dt * 2.2);
      if (k.isPlayer && k.bumpCooldown <= 0) {
        this.audio.bump();
        this.shake = Math.max(this.shake, 0.16);
        k.bumpCooldown = 0.5;
      }
      near = this.world.nearest(k.pos, k.trackIndex, 92);
    }

    // Elevation following — springs the kart over crests a little.
    const groundY = near.point.y + 0.03;
    k.pos.y = damp(k.pos.y, groundY, 14, dt);
    const ahead = this.world.samples[(near.index + 8) % this.N];
    const behind = this.world.samples[(near.index - 8 + this.N) % this.N];
    const run = Math.hypot(ahead.p.x - behind.p.x, ahead.p.z - behind.p.z) || 1;
    k.pitchTarget = -Math.atan2(ahead.p.y - behind.p.y, run);

    k.trackIndex = near.index;
    let delta = near.index - k.prevIndex;
    if (delta < -this.N / 2) delta += this.N;
    if (delta > this.N / 2) delta -= this.N;
    if (Math.abs(delta) < 120) k.progress += delta;
    k.prevIndex = near.index;

    // Wrong-way detection
    const dot = forward.x * near.htan.x + forward.z * near.htan.z;
    if (dot < -0.35 && k.speed > 3) k.wrongWay += dt;
    else k.wrongWay = 0;

    // Drift particles
    if (k.drift && k.driftTier > 0) {
      k.driftEmit -= dt;
      if (k.driftEmit <= 0) {
        k.driftEmit = 0.035;
        const color = DRIFT_TIERS[k.driftTier].color;
        const back = new THREE.Vector3(
          k.pos.x - forward.x * 1.15 + near.side.x * (Math.random() - 0.5) * 1.8,
          k.pos.y + 0.2,
          k.pos.z - forward.z * 1.15 + near.side.z * (Math.random() - 0.5) * 1.8,
        );
        this.effects.sparks(back, color, 2, Math.atan2(forward.x, forward.z) + Math.PI);
      }
    }
    if (offroad && Math.abs(k.speed) > 4) {
      k.dustTimer -= dt;
      if (k.dustTimer <= 0) {
        k.dustTimer = 0.06;
        const c = this.track.environment === 'dusk' ? 0xffffff
          : this.track.environment === 'lava' ? 0x8b5a45
            : this.track.environment === 'jungle' ? 0x86a85c : 0xb59a6b;
        this.effects.spawn({
          x: k.pos.x - forward.x * 1.2 + (Math.random() - 0.5) * 1.6,
          y: k.pos.y + 0.12,
          z: k.pos.z - forward.z * 1.2 + (Math.random() - 0.5) * 1.6,
          vx: rand(-1.4, 1.4),
          vy: rand(0.7, 2.2),
          vz: rand(-1.4, 1.4),
          life: rand(0.35, 0.75),
          size: rand(0.28, 0.6),
          gravity: 1.2,
          drag: 1.2,
          color: c,
        });
      }
    }
    if (k.star > 0) {
      k.starEmit -= dt;
      if (k.starEmit <= 0) {
        k.starEmit = 0.055;
        this.effects.spawn({
          x: k.pos.x + rand(-1.1, 1.1),
          y: k.pos.y + rand(0.4, 2.1),
          z: k.pos.z + rand(-1.1, 1.1),
          vx: rand(-1, 1),
          vy: rand(1, 3.5),
          vz: rand(-1, 1),
          life: rand(0.3, 0.7),
          size: rand(0.2, 0.48),
          gravity: -1,
          drag: 1.4,
          color: [0xffe14d, 0xfff4b0, 0xffa63d, 0x9fffdf][Math.floor(Math.random() * 4)],
        });
      }
    }
  }

  releaseDrift(k) {
    if (k.driftCharge >= 0.85 && k.speed > 6) {
      const tier = k.driftCharge >= 2.7 ? 2 : k.driftCharge >= 1.75 ? 1 : 0;
      const duration = [0.7, 1.05, 1.45][tier];
      this.applyBoost(k, duration, true);
      if (k.isPlayer) {
        this.audio.boost();
        if (tier === 2) this.ui.message('Ultra mini-turbo', 'Perfect drift', 'good', 900);
      }
      this.effects.burst(
        new THREE.Vector3(k.pos.x, k.pos.y + 0.35, k.pos.z),
        [0x8fe9ff, 0xffb03d, 0xd17bff],
        12,
        { speed: 7, life: 0.55, size: 0.4, up: 0.2 },
      );
    }
    k.driftCharge = 0;
    k.drift = false;
    k.driftTier = 0;
  }

  applyBoost(k, duration = 1, silent = false) {
    k.boost = Math.max(k.boost, duration);
    k.speed = Math.max(k.speed, Math.min(k.maxSpeed + 9, k.speed + 5.5));
    if (k.isPlayer && !silent) this.audio.boost();
  }

  updateVisual(k, dt) {
    const boosting = k.boost > 0;
    updateKartVisual(k.visual, {
      speed: Math.abs(k.speed),
      steer: k.steer,
      boosting,
      drift: k.drift ? 1 : 0,
      time: this.clock,
      spin: k.spin,
    }, dt);
    k.visual.root.position.copy(k.pos);
    k.visual.root.rotation.y = k.yaw + (k.drift ? k.steer * 0.2 : 0);
    k.visual.root.rotation.x = damp(
      Number.isFinite(k.visual.root.rotation.x) ? k.visual.root.rotation.x : 0,
      k.pitchTarget || 0,
      7,
      dt,
    );

    const targetScale = k.shrink > 0 ? 0.62 : 1;
    const s = damp(k.visual.visual.scale.x, targetScale, 8, dt);
    k.visual.visual.scale.setScalar(s);

    k.starMesh.visible = k.star > 0;
    if (k.star > 0) {
      k.starMesh.rotation.y += dt * 3.4;
      k.starMesh.position.y = 2.5 + Math.sin(this.clock * 5) * 0.14;
      k.visual.ring.material.opacity = 0.55 + Math.sin(this.clock * 12) * 0.25;
    } else if (k.isPlayer) {
      k.visual.ring.material.opacity = 0.32 + Math.sin(this.clock * 3.4) * 0.12;
    }
    if (k.boost > 0 && k.boost < 0.35) {
      k.visual.ring.material.opacity = 0.25;
    }
  }

  // ───────────────────────────── AI ─────────────────────────────

  aiInput(k, dt) {
    const N = this.N;
    const idx = k.trackIndex;
    const speed = Math.abs(k.speed);
    const look = Math.round(11 + speed * 0.9);
    const lane = k.aiLane + Math.sin(this.clock * 0.42 + k.aiPhase) * 1.35;
    const target = this.world.trackSpot((idx + look) / N, clamp(lane, -3.4, 3.4));
    const dx = target.pos.x - k.pos.x;
    const dz = target.pos.z - k.pos.z;
    const desired = Math.atan2(dx, dz);
    const diff = wrapAngle(desired - k.yaw);
    const steer = clamp(diff * 2.4, -1, 1);

    const s0 = this.world.samples[(idx + 20) % N];
    const s1 = this.world.samples[(idx + 78) % N];
    const curve = Math.abs(wrapAngle(s1.heading - s0.heading));
    let targetSpeed = k.maxSpeed * k.aiSkill;
    targetSpeed *= 1 - clamp((curve * 0.54) / this.difficulty.corner, 0, 0.45);
    if (k.boost > 0) targetSpeed = k.maxSpeed + 10;
    if (Math.abs(k.steer) > 0.6 && speed > 15) targetSpeed *= 0.97;

    // Gentle rubber band keeps the pack close without feeling fake.
    const gap = k.progress - this.player.progress;
    const rubber = this.difficulty.rubber;
    if (gap > 95) targetSpeed *= 1 - 0.035 * rubber;
    else if (gap < -95) targetSpeed *= 1 + 0.035 * rubber;

    const throttle = speed < targetSpeed ? 1 : speed > targetSpeed * 1.08 ? 0 : 0.45;
    const brake = speed > targetSpeed * 1.13 && speed > 8 ? 0.7 : 0;

    if (gap < -130 && k.aiCatchup <= 0 && k.boost <= 0) {
      this.applyBoost(k, 0.85, true);
      k.aiCatchup = rand(7, 12);
    }

    // Nudge around bananas directly ahead.
    let avoid = 0;
    for (const b of this.bananas) {
      const bdx = b.pos.x - k.pos.x;
      const bdz = b.pos.z - k.pos.z;
      const d2 = bdx * bdx + bdz * bdz;
      if (d2 < 90 && d2 > 1) {
        const fwd = bdx * Math.sin(k.yaw) + bdz * Math.cos(k.yaw);
        if (fwd > 0) avoid += (bdx * Math.cos(k.yaw) - bdz * Math.sin(k.yaw)) > 0 ? -0.5 : 0.5;
      }
    }
    return {
      throttle,
      brake,
      steer: clamp(steer + avoid, -1, 1),
      drift: false,
    };
  }

  aiItemLogic(k, dt) {
    k.aiCatchup = Math.max(0, k.aiCatchup - dt);
    if (!k.item) return;
    k.aiItemTimer -= dt;
    if (k.aiItemTimer <= 0) {
      this.useItem(k);
    }
  }

  // ───────────────────────────── pickups & items ─────────────────────────────

  checkPickups(k) {
    if (k.finished) return;
    for (const box of this.world.itemBoxes) {
      if (!box.active) continue;
      const dx = box.group.position.x - k.pos.x;
      const dz = box.group.position.z - k.pos.z;
      if (dx * dx + dz * dz < 5.29) {
        box.active = false;
        box.group.visible = false;
        box.respawnAt = this.clock + 2.4;
        this.effects.burst(box.group.position, [this.track.accent, this.track.accent2, 0xffffff], 22, {
          speed: 8, life: 0.65, size: 0.5, up: 0.5,
        });
        if (!k.item) {
          const item = this.pickItemForKart(k);
          k.item = item;
          if (k.isPlayer) {
            k.roulette = 0.95;
            this.audio.pickup();
            this.ui.message('Item box', 'Rolling…', '', 700);
          } else {
            k.aiItemTimer = rand(2.2, 6.5) / this.difficulty.aggression;
          }
        }
      }
    }

    for (const coin of this.world.coins) {
      if (!coin.active) continue;
      const dx = coin.mesh.position.x - k.pos.x;
      const dz = coin.mesh.position.z - k.pos.z;
      if (dx * dx + dz * dz < 4.4) {
        coin.active = false;
        coin.mesh.visible = false;
        coin.respawnAt = this.clock + 11;
        k.coins = Math.min(10, k.coins + 1);
        this.effects.burst(new THREE.Vector3(coin.mesh.position.x, coin.mesh.position.y, coin.mesh.position.z), [0xffd23d, 0xfff4b0], 7, {
          speed: 4, life: 0.42, size: 0.3, up: 0.8,
        });
        if (k.isPlayer) this.audio.click();
      }
    }

    for (const pad of this.world.boostPads) {
      if (k.padCooldown > 0) break;
      const dx = pad.pos.x - k.pos.x;
      const dz = pad.pos.z - k.pos.z;
      if (dx * dx + dz * dz < 11.5) {
        k.padCooldown = 1.1;
        this.applyBoost(k, 1.05, true);
        if (k.isPlayer) {
          this.audio.boost();
          this.shake = Math.max(this.shake, 0.15);
        }
        this.effects.burst(new THREE.Vector3(k.pos.x, k.pos.y + 0.3, k.pos.z), [this.track.accent, this.track.accent2, 0xffffff], 14, {
          speed: 7, life: 0.45, size: 0.35, up: 0.3,
        });
        break;
      }
    }
  }

  pickItemForKart(k) {
    const rank = this.rankOf(k);
    const total = this.karts.length;
    let table;
    if (rank === 1) {
      table = [['banana', 34], ['shell', 36], ['mushroom', 30]];
    } else if (rank <= 3) {
      table = [['banana', 20], ['shell', 28], ['redshell', 20], ['mushroom', 24], ['star', 4], ['lightning', 2]];
    } else if (rank <= 5) {
      table = [['banana', 14], ['shell', 20], ['redshell', 24], ['mushroom', 27], ['star', 9], ['lightning', 6]];
    } else {
      table = [['banana', 8], ['shell', 12], ['redshell', 25], ['mushroom', 30], ['star', 15], ['lightning', 10]];
    }
    if (rank === total) {
      table = [['mushroom', 30], ['redshell', 25], ['star', 22], ['lightning', 18], ['shell', 5]];
    }
    let roll = Math.random() * table.reduce((a, b) => a + b[1], 0);
    for (const [id, weight] of table) {
      roll -= weight;
      if (roll <= 0) return id;
    }
    return 'mushroom';
  }

  useItem(k) {
    if (!k.item || k.roulette > 0 || k.finished) return;
    const id = k.item;
    k.item = null;
    k.aiItemTimer = Infinity;
    const forward = new THREE.Vector3(Math.sin(k.yaw), 0, Math.cos(k.yaw));
    switch (id) {
      case 'mushroom': {
        this.applyBoost(k, 1.75);
        if (k.isPlayer) {
          this.audio.boost();
          this.ui.message('Turbo Shroom', 'Full send', 'good', 800);
        }
        break;
      }
      case 'banana': {
        const mesh = createBanana();
        const pos = new THREE.Vector3(
          k.pos.x - forward.x * 2.9,
          k.pos.y + 0.42,
          k.pos.z - forward.z * 2.9,
        );
        mesh.position.copy(pos);
        this.scene.add(mesh);
        this.bananas.push({ mesh, pos, owner: k, life: 30, spin: Math.random() * TAU });
        if (k.isPlayer) this.audio.click();
        break;
      }
      case 'shell':
      case 'redshell': {
        const homing = id === 'redshell';
        const mesh = createShell(homing);
        const pos = new THREE.Vector3(
          k.pos.x + forward.x * 2.9,
          k.pos.y + 0.75,
          k.pos.z + forward.z * 2.9,
        );
        mesh.position.copy(pos);
        this.scene.add(mesh);
        this.shells.push({
          mesh,
          pos,
          vel: new THREE.Vector3(forward.x * 47, 0, forward.z * 47),
          type: id,
          owner: k,
          life: homing ? 8 : 6,
          age: 0,
          target: null,
          bounces: 0,
          trackIndex: k.trackIndex,
        });
        if (k.isPlayer) this.audio.item();
        break;
      }
      case 'star': {
        k.star = 7.4;
        k.speed = Math.max(k.speed, k.maxSpeed * 0.92);
        this.effects.burst(new THREE.Vector3(k.pos.x, k.pos.y + 1, k.pos.z), [0xffe14d, 0xffa63d, 0xffffff], 42, {
          speed: 9, life: 0.95, size: 0.55, up: 0.65,
        });
        if (k.isPlayer) {
          this.audio.item();
          this.ui.message('SUPER STAR', 'Invincible — go hunting', 'good', 1500);
          this.shake = Math.max(this.shake, 0.28);
        }
        break;
      }
      case 'lightning': {
        if (k.isPlayer) {
          this.audio.item();
          this.ui.message('LIGHTNING', 'Everyone else shrinks', 'good', 1300);
        }
        this.effects.burst(new THREE.Vector3(k.pos.x, k.pos.y + 5, k.pos.z), [0x9ee8ff, 0xffffff, 0x6d8bff], 46, {
          speed: 16, life: 0.8, size: 0.7, up: 0.9,
        });
        for (const other of this.karts) {
          if (other === k || other.finished || other.star > 0) continue;
          other.shrink = 2.8;
          other.speed *= 0.62;
          other.spin = Math.max(other.spin, 0.35);
          this.effects.burst(new THREE.Vector3(other.pos.x, other.pos.y + 1, other.pos.z), [0x9ee8ff, 0xffffff], 18, {
            speed: 6, life: 0.5, size: 0.4, up: 0.6,
          });
          if (other.isPlayer) {
            this.audio.hit();
            this.ui.message('Shrunk!', 'Lightning strike', 'bad', 1200);
            this.shake = Math.max(this.shake, 0.35);
          }
        }
        break;
      }
      default: break;
    }
    if (k.isPlayer) {
      this.ui.itemUsed();
    }
  }

  hitKart(k, reason = 'shell') {
    if (k.star > 0 || k.finished || this.state !== 'racing') return false;
    k.spin = 1.15;
    k.hitLock = 1.15;
    k.speed *= 0.16;
    k.drift = false;
    k.driftCharge = 0;
    k.driftTier = 0;
    this.effects.burst(new THREE.Vector3(k.pos.x, k.pos.y + 0.9, k.pos.z), [0xffe14d, 0xffffff, 0xff7a3a], 28, {
      speed: 9, life: 0.8, size: 0.55, up: 0.65,
    });
    if (k.isPlayer) {
      this.audio.hit();
      this.shake = Math.max(this.shake, 0.55);
      this.ui.message(reason === 'banana' ? 'Banana peel' : 'Shell hit', 'Shake it off', 'bad', 1150);
    }
    return true;
  }

  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt;
      s.age += dt;

      if (s.type === 'redshell') {
        if (!s.target || s.target.finished || s.target === s.owner) {
          s.target = this.kartAhead(s.owner);
          if (!s.target) s.target = null;
        }
        if (s.target) {
          const ang = Math.atan2(s.vel.x, s.vel.z);
          const desired = Math.atan2(s.target.pos.x - s.pos.x, s.target.pos.z - s.pos.z);
          const diff = wrapAngle(desired - ang);
          const spd = 48;
          const turn = clamp(diff, -3.4 * dt, 3.4 * dt);
          const na = ang + turn;
          s.vel.set(Math.sin(na) * spd, 0, Math.cos(na) * spd);
        }
      }

      s.pos.x += s.vel.x * dt;
      s.pos.z += s.vel.z * dt;

      const near = this.world.nearest(s.pos, s.trackIndex, 70);
      s.trackIndex = near.index;
      const limit = this.world.half - 0.15;
      if (Math.abs(near.offset) > limit) {
        const sign = Math.sign(near.offset);
        const pull = Math.abs(near.offset) - limit;
        s.pos.x -= near.side.x * pull * sign;
        s.pos.z -= near.side.z * pull * sign;
        const dot = s.vel.x * near.side.x + s.vel.z * near.side.z;
        s.vel.x -= 2 * dot * near.side.x;
        s.vel.z -= 2 * dot * near.side.z;
        s.bounces += 1;
        if (s.bounces > 8) s.life = 0;
        this.effects.sparks(new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z), 0x8fe9ff, 4);
      }
      s.pos.y = near.point.y + 0.72;
      s.mesh.position.copy(s.pos);
      s.mesh.rotation.y = Math.atan2(s.vel.x, s.vel.z);
      s.mesh.rotation.z += dt * 7;

      let hit = false;
      for (const k of this.karts) {
        if (k.finished) continue;
        if (k === s.owner && s.age < 0.4) continue;
        const dx = k.pos.x - s.pos.x;
        const dz = k.pos.z - s.pos.z;
        if (dx * dx + dz * dz < 3.2) {
          if (k.star > 0) {
            this.effects.burst(new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z), [0xffe14d, 0xffffff], 14, {
              speed: 6, life: 0.5, size: 0.4,
            });
          } else {
            this.hitKart(k, 'shell');
          }
          hit = true;
          break;
        }
      }
      if (hit || s.life <= 0) {
        this.scene.remove(s.mesh);
        disposeObject(s.mesh);
        this.shells.splice(i, 1);
      }
    }
  }

  updateBananas(dt) {
    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const b = this.bananas[i];
      b.life -= dt;
      b.spin += dt * 1.6;
      b.mesh.rotation.y = b.spin;
      b.mesh.position.y = b.pos.y + Math.sin(this.clock * 3 + b.spin) * 0.05;
      let hit = false;
      for (const k of this.karts) {
        if (k.finished || k === b.owner) continue;
        const dx = k.pos.x - b.pos.x;
        const dz = k.pos.z - b.pos.z;
        if (dx * dx + dz * dz < 2.1) {
          if (k.star > 0) {
            this.effects.sparks(b.pos, 0xffd23d, 8);
          } else {
            this.hitKart(k, 'banana');
          }
          hit = true;
          break;
        }
      }
      if (hit || b.life <= 0) {
        this.scene.remove(b.mesh);
        disposeObject(b.mesh);
        this.bananas.splice(i, 1);
      }
    }
  }

  updateCoins(dt) {
    for (const coin of this.world.coins) {
      if (!coin.active && coin.respawnAt && this.clock >= coin.respawnAt) {
        coin.active = true;
        coin.mesh.visible = true;
        coin.respawnAt = 0;
      }
    }
  }

  resolveKartCollisions(dt) {
    for (let i = 0; i < this.karts.length; i++) {
      const a = this.karts[i];
      for (let j = i + 1; j < this.karts.length; j++) {
        const b = this.karts[j];
        if (a.finished && b.finished) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 4.6 || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const push = (2.15 - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        a.pos.x -= nx * push;
        a.pos.z -= nz * push;
        b.pos.x += nx * push;
        b.pos.z += nz * push;
        if (a.star > 0 && b.star <= 0) this.hitKart(b, 'shell');
        else if (b.star > 0 && a.star <= 0) this.hitKart(a, 'shell');
        if ((a.isPlayer || b.isPlayer) && a.bumpCooldown <= 0 && b.bumpCooldown <= 0) {
          this.audio.bump();
          a.bumpCooldown = 0.45;
          b.bumpCooldown = 0.45;
          this.shake = Math.max(this.shake, 0.07);
        }
        a.speed *= 0.985;
        b.speed *= 0.985;
      }
    }
  }

  kartAhead(k) {
    let best = null;
    let bestGap = Infinity;
    for (const other of this.karts) {
      if (other === k || other.finished) continue;
      let gap = other.progress - k.progress;
      if (gap > 0 && gap < bestGap) {
        bestGap = gap;
        best = other;
      }
    }
    return best;
  }

  // ───────────────────────────── laps & ranking ─────────────────────────────

  checkLaps() {
    for (const k of this.karts) {
      if (k.finished) continue;
      const lapPos = (k.progress + k.startOffset) / this.N;
      const display = clamp(Math.floor(lapPos) + 1, 1, this.laps);
      if (lapPos >= this.laps) {
        this.finishKart(k);
        continue;
      }
      if (display > k.lap) {
        const lapTime = this.time - k.lapMark;
        k.lapMark = this.time;
        k.lapTimes.push(lapTime);
        k.bestLap = Math.min(k.bestLap ?? Infinity, lapTime);
        k.lap = display;
        if (k.isPlayer) {
          this.audio.lap(display === this.laps);
          if (display === this.laps) {
            this.ui.message('Final lap', 'Everything you have', '', 1600);
          } else {
            this.ui.message(`Lap ${display}`, `${this.laps - display + 1} to go`, '', 1200);
          }
        }
      }
    }
  }

  finishKart(k) {
    if (k.finished) return;
    k.finished = true;
    k.finishTime = this.time;
    k.lapTimes.push(this.time - k.lapMark);
    k.bestLap = Math.min(k.bestLap ?? Infinity, this.time - k.lapMark);
    k.lap = this.laps;
    k.finishRank = this.rankOf(k, true);
    if (k.isPlayer) {
      this.state = 'finished';
      this.finishTimer = 0;
      const won = k.finishRank === 1;
      this.audio.setEngine(false);
      this.audio.finish(won);
      this.effects.confetti(new THREE.Vector3(k.pos.x, k.pos.y, k.pos.z), won ? 260 : 130);
      this.ui.message(
        won ? 'FINISH — P1' : `FINISH — ${ordinal(k.finishRank)}`,
        won ? 'Untouchable' : 'That is how you race',
        won ? 'good' : '',
        2400,
      );
      this.shake = 0.45;
    }
  }

  standings() {
    return this.karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  }

  rankOf(k, useLive = false) {
    if (k.finished && !useLive) {
      const finished = this.karts.filter((x) => x.finished).sort((a, b) => a.finishTime - b.finishTime);
      return finished.indexOf(k) + 1;
    }
    const sorted = this.standings();
    return sorted.indexOf(k) + 1;
  }

  updateRanks() {
    this.player.rank = this.rankOf(this.player);
  }

  buildResults() {
    const entries = this.karts.map((k) => {
      const finished = k.finished;
      let time = k.finishTime;
      if (!finished) {
        const metresLeft = Math.max(0, k.targetProgress - k.progress) * (this.world.length / this.N);
        const pace = Math.max(13, k.maxSpeed * 0.86);
        time = this.time + metresLeft / pace;
      }
      return {
        racer: k.racer,
        isPlayer: k.isPlayer,
        finished,
        time,
        bestLap: k.bestLap,
        lapTimes: k.lapTimes,
        coins: k.coins,
      };
    });
    entries.sort((a, b) => a.time - b.time);
    entries.forEach((e, i) => { e.place = i + 1; });
    const playerEntry = entries.find((e) => e.isPlayer);
    return {
      track: this.track,
      entries,
      playerPlace: playerEntry.place,
      playerTime: playerEntry.time,
      bestLap: playerEntry.bestLap,
      finished: playerEntry.finished,
    };
  }

  // ───────────────────────────── camera & audio ─────────────────────────────

  updateCamera(dt, snap = false) {
    const k = this.player;
    const forward = new THREE.Vector3(Math.sin(k.yaw), 0, Math.cos(k.yaw));
    const speedNorm = clamp(Math.abs(k.speed) / Math.max(1, k.maxSpeed), 0, 1.4);
    const chaseDist = 6.3 + speedNorm * 2.1;
    const chaseHigh = 2.7 + speedNorm * 0.45;
    const chasePos = new THREE.Vector3(
      k.pos.x - forward.x * chaseDist,
      k.pos.y + chaseHigh,
      k.pos.z - forward.z * chaseDist,
    );
    const chaseLook = new THREE.Vector3(
      k.pos.x + forward.x * (5 + speedNorm * 4.5),
      k.pos.y + 1.2,
      k.pos.z + forward.z * (5 + speedNorm * 4.5),
    );

    let targetPos = chasePos;
    let targetLook = chaseLook;

    if (this.state === 'countdown') {
      const blend = smoothstep(0, 1.25, this.countdownTime);
      const angle = k.yaw + 0.62 + this.clock * 0.1;
      const cinePos = new THREE.Vector3(
        k.pos.x + Math.sin(angle) * 9.4,
        k.pos.y + 4.2,
        k.pos.z + Math.cos(angle) * 9.4,
      );
      targetPos = cinePos.lerp(chasePos, 1 - blend);
      targetLook = new THREE.Vector3(k.pos.x, k.pos.y + 1.2, k.pos.z).lerp(chaseLook, 1 - blend);
    } else if (this.state === 'finished') {
      const angle = k.yaw + 0.85 + this.finishTimer * 0.25;
      targetPos = new THREE.Vector3(
        k.pos.x + Math.sin(angle) * 8.5,
        k.pos.y + 3.7,
        k.pos.z + Math.cos(angle) * 8.5,
      );
      targetLook = new THREE.Vector3(k.pos.x, k.pos.y + 1.15, k.pos.z);
    }

    if (snap || !this.cameraInit) {
      this.camera.position.copy(targetPos);
      this.cameraLook.copy(targetLook);
      this.cameraInit = true;
    } else {
      const posLambda = this.state === 'finished' ? 2.4 : 6.5;
      this.camera.position.lerp(targetPos, 1 - Math.exp(-posLambda * dt));
      this.cameraLook.lerp(targetLook, 1 - Math.exp(-8 * dt));
    }

    if (this.shake > 0.001) {
      const amp = this.shake * 0.5;
      this.camera.position.x += rand(-amp, amp);
      this.camera.position.y += rand(-amp, amp) * 0.6;
      this.camera.position.z += rand(-amp, amp);
    }

    // Keep the camera above the road surface on blind crests.
    const camNear = this.world.nearest(this.camera.position, k.trackIndex, 80);
    if (this.camera.position.y < camNear.point.y + 0.85) {
      this.camera.position.y = camNear.point.y + 0.85;
    }

    this.camera.lookAt(this.cameraLook);

    const boosting = k.boost > 0 || k.star > 0;
    const targetFov = (this.state === 'countdown' ? 60 : 68) + speedNorm * 5 + (boosting ? 9 : 0);
    this.cameraFov = snap ? targetFov : damp(this.cameraFov, targetFov, 4, dt);
    this.camera.fov = this.cameraFov;
    this.camera.updateProjectionMatrix();
  }

  updateAudio() {
    const k = this.player;
    if (this.state === 'finished') {
      this.audio.setEngine(false);
      return;
    }
    this.audio.setEngine(
      this.state === 'countdown' || this.state === 'racing',
      Math.abs(k.speed),
      k.boost > 0,
      k.drift,
    );
  }

  // ───────────────────────────── HUD data ─────────────────────────────

  getHUD() {
    const k = this.player;
    const item = k.item ? ITEMS[k.item] : null;
    const driftColor = DRIFT_TIERS[Math.max(1, k.driftTier)]?.color ?? '#8fe9ff';
    return {
      position: this.rankOf(k),
      total: this.karts.length,
      lap: clamp(k.lap, 1, this.laps),
      laps: this.laps,
      coins: k.coins,
      time: this.time,
      bestLap: k.bestLap,
      speed: Math.max(0, Math.round(Math.abs(k.speed) * 3.6)),
      maxSpeed: Math.round(k.maxSpeed * 3.6),
      boosting: k.boost > 0,
      star: k.star > 0,
      shrinking: k.shrink > 0,
      finished: k.finished,
      item: k.item,
      roulette: k.roulette,
      itemLabel: item?.label ?? 'No item',
      itemColor: item?.color ?? '#ffb52e',
      itemTip: k.item ? 'Press Space to use' : 'Drive through a ? box',
      drifting: k.drift,
      driftCharge: k.driftCharge,
      driftTier: k.driftTier,
      driftColor,
      offroad: k.offroad,
      speedRatio: clamp(Math.abs(k.speed) / Math.max(1, k.maxSpeed + 13.5), 0, 1),
    };
  }

  getMinimapDots() {
    return this.karts.map((k) => {
      const p = this.mapPoint(k.pos);
      return {
        x: p.x,
        y: p.y,
        color: `#${new THREE.Color(k.racer.color).getHexString()}`,
        isPlayer: k.isPlayer,
        finished: k.finished,
        heading: k.yaw,
      };
    });
  }

  dispose() {
    for (const k of this.karts) {
      this.scene.remove(k.visual.root);
      disposeObject(k.visual.root);
    }
    for (const s of this.shells) {
      this.scene.remove(s.mesh);
      disposeObject(s.mesh);
    }
    for (const b of this.bananas) {
      this.scene.remove(b.mesh);
      disposeObject(b.mesh);
    }
    this.karts = [];
    this.shells = [];
    this.bananas = [];
    this.audio.setEngine(false);
    this.audio.stopMusic();
  }
}

export { ordinal, DRIFT_TIERS };
