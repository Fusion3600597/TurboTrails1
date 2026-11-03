import * as THREE from '../vendor/three.module.js';
import { softDiscTexture } from './textures.js?v=20261108';

const TAU = Math.PI * 2;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.28,
    ...opts,
  });
}

function shadowAll(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

export function createKart(racer, isPlayer = false) {
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const visual = new THREE.Group();
  root.add(visual);

  const bodyColor = new THREE.Color(racer.color);
  const accentColor = new THREE.Color(racer.accent);
  const paint = mat(bodyColor, { roughness: 0.28, metalness: 0.42 });
  const paintDark = mat(bodyColor.clone().multiplyScalar(0.58), { roughness: 0.35, metalness: 0.34 });
  const accent = mat(accentColor, {
    roughness: 0.25,
    metalness: 0.48,
    emissive: accentColor.clone().multiplyScalar(0.13),
  });
  const dark = mat(0x17161c, { roughness: 0.52, metalness: 0.28 });
  const chrome = mat(0xc7ccd8, { roughness: 0.18, metalness: 0.92 });
  const skin = mat(racer.skin, { roughness: 0.58, metalness: 0.02 });
  const helmetMat = mat(racer.helmet, { roughness: 0.22, metalness: 0.32 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.38, 2.85), paint);
  chassis.position.y = 0.52;
  visual.add(chassis);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 2.45), paintDark);
  lower.position.y = 0.29;
  visual.add(lower);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.3, 1.45), paint);
  nose.position.set(0, 0.54, 1.48);
  nose.rotation.x = -0.12;
  visual.add(nose);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.2, 0.5), accent);
  noseTip.position.set(0, 0.46, 2.17);
  visual.add(noseTip);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.2, 0.28), dark);
  bumper.position.set(0, 0.34, 2.3);
  visual.add(bumper);

  for (const sign of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 1.55), accent);
    pod.position.set(sign * 0.92, 0.52, 0.04);
    visual.add(pod);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.8), helmetMat);
    stripe.position.set(sign * 1.08, 0.68, 0.05);
    visual.add(stripe);
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.8), dark);
    step.position.set(sign * 0.75, 0.43, -0.35);
    visual.add(step);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.34), dark);
  seat.position.set(0, 0.96, -0.65);
  seat.rotation.x = -0.12;
  visual.add(seat);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.5), paintDark);
  seatBack.position.set(0, 1.35, -0.82);
  visual.add(seatBack);
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.18), accent);
  headrest.position.set(0, 1.49, -0.83);
  visual.add(headrest);

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.43, 0.76, 12), chrome);
  engine.rotation.z = Math.PI / 2;
  engine.position.set(0, 0.78, -1.38);
  visual.add(engine);
  const engineTop = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.5), accent);
  engineTop.position.set(0, 1.07, -1.38);
  visual.add(engineTop);

  const spoilerBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.48), paintDark);
  spoilerBar.position.set(0, 1.33, -1.52);
  visual.add(spoilerBar);
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.68), accent);
  spoilerWing.position.set(0, 1.42, -1.55);
  visual.add(spoilerWing);
  for (const sign of [-1, 1]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.12), dark);
    support.position.set(sign * 0.52, 1.22, -1.52);
    visual.add(support);
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.78), accent);
    endplate.position.set(sign * 0.94, 1.42, -1.55);
    visual.add(endplate);
  }

  const exhaustFlames = [];
  for (const sign of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.48, 10), chrome);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sign * 0.36, 0.77, -1.72);
    visual.add(pipe);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.72, 6, 1, true),
      new THREE.MeshBasicMaterial({
        color: sign < 0 ? 0x67e8ff : 0xffd05a,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(sign * 0.36, 0.77, -2.08);
    flame.visible = false;
    visual.add(flame);
    exhaustFlames.push(flame);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.38, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const tireMat = mat(0x15151a, { roughness: 0.88, metalness: 0.02 });
  const wheels = [];
  const frontWheels = [];
  for (const signX of [-1, 1]) {
    for (const signZ of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(signX * 0.99, 0.43, signZ * 1.06);
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      pivot.add(wheel);
      const hub = new THREE.Mesh(hubGeo, accent);
      pivot.add(hub);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 5, 12), chrome);
      rim.rotation.y = Math.PI / 2;
      pivot.add(rim);
      visual.add(pivot);
      wheels.push(wheel);
      if (signZ > 0) frontWheels.push(pivot);
    }
  }

  const driver = new THREE.Group();
  driver.position.set(0, 0.98, -0.35);
  visual.add(driver);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), paint);
  torso.position.y = 0.35;
  torso.rotation.x = 0.08;
  driver.add(torso);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.06, 5, 12), accent);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.18;
  driver.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), skin);
  head.position.set(0, 0.94, 0.02);
  driver.add(head);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 16, 12, 0, TAU, 0, Math.PI * 0.62),
    helmetMat,
  );
  helmet.position.set(0, 0.99, -0.01);
  helmet.scale.set(1.06, 1.02, 1.02);
  driver.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.12), dark);
  visor.position.set(0, 1.02, 0.36);
  visor.rotation.x = -0.08;
  driver.add(visor);
  const visorShine = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xc8f6ff, transparent: true, opacity: 0.55 }),
  );
  visorShine.position.set(-0.06, 1.08, 0.43);
  driver.add(visorShine);

  const gloves = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.47, 4, 7), paint);
    arm.position.set(sign * 0.34, 0.28, 0.27);
    arm.rotation.z = sign * 0.27;
    arm.rotation.x = 0.9;
    driver.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dark);
    glove.position.set(sign * 0.47, 0.12, 0.58);
    driver.add(glove);
    gloves.push(glove);
  }

  addAnimalDetails(driver, racer, accent, skin, helmetMat);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.98, 1.33, 32),
    new THREE.MeshBasicMaterial({
      color: racer.color,
      transparent: true,
      opacity: isPlayer ? 0.45 : 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  visual.add(ring);

  shadowAll(root);
  ring.castShadow = false;
  ring.receiveShadow = false;

  return {
    root,
    visual,
    wheels,
    frontWheels,
    exhaustFlames,
    ring,
    driver,
    racer,
    isPlayer,
    wheelSpin: 0,
  };
}

function addAnimalDetails(driver, racer, accent, skin, helmetMat) {
  const kind = racer.kind;
  const earMat = mat(racer.color, { roughness: 0.6 });
  const pink = mat(0xffaac5, { roughness: 0.65 });
  const black = mat(0x16131a, { roughness: 0.5 });

  if (kind === 'fox') {
    for (const sign of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 4), earMat);
      ear.position.set(sign * 0.29, 1.52, -0.03);
      ear.rotation.z = sign * 0.3;
      driver.add(ear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 4), black);
      tip.position.set(sign * 0.33, 1.69, -0.03);
      tip.rotation.z = sign * 0.3;
      driver.add(tip);
    }
  } else if (kind === 'bunny') {
    for (const sign of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.48, 4, 6), earMat);
      ear.position.set(sign * 0.22, 1.72, -0.04);
      ear.rotation.z = sign * 0.13;
      driver.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 5), pink);
      inner.position.set(sign * 0.23, 1.72, 0.005);
      inner.rotation.z = sign * 0.13;
      driver.add(inner);
    }
  } else if (kind === 'tiger') {
    for (const sign of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), earMat);
      ear.position.set(sign * 0.35, 1.27, -0.03);
      ear.scale.z = 0.55;
      driver.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 5), black);
      inner.position.set(sign * 0.35, 1.28, 0.09);
      inner.scale.z = 0.4;
      driver.add(inner);
    }
    for (const y of [1.19, 1.34]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.04), black);
      stripe.position.set(0, y, 0.39);
      driver.add(stripe);
    }
  } else if (kind === 'frog') {
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin);
      eye.position.set(sign * 0.28, 1.42, 0.03);
      driver.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), black);
      pupil.position.set(sign * 0.28, 1.43, 0.18);
      driver.add(pupil);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.04), black);
    mouth.position.set(0, 0.95, 0.41);
    driver.add(mouth);
  } else if (kind === 'axolotl') {
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const gill = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), pink);
        gill.scale.set(1.9, 0.65, 0.65);
        gill.position.set(sign * (0.42 + i * 0.025), 1.06 + i * 0.13, -0.05);
        driver.add(gill);
      }
    }
    for (const sign of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), pink);
      cheek.position.set(sign * 0.29, 0.99, 0.34);
      driver.add(cheek);
    }
  } else if (kind === 'dino') {
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3 - i * 0.04, 4), accent);
      spike.position.set(0, 1.49 - i * 0.05, -0.08 - i * 0.17);
      spike.rotation.x = -0.4;
      driver.add(spike);
    }
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), black);
      eye.position.set(sign * 0.26, 1.12, 0.37);
      driver.add(eye);
    }
  } else if (kind === 'penguin') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.33, 5), accent);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.0, 0.49);
    driver.add(beak);
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), black);
      eye.position.set(sign * 0.2, 1.18, 0.37);
      driver.add(eye);
    }
  } else if (kind === 'octopus') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const tentacle = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 4, 5), accent);
      tentacle.position.set(Math.cos(a) * 0.26, 0.14, Math.sin(a) * 0.2 - 0.02);
      tentacle.rotation.z = Math.cos(a) * 0.5;
      driver.add(tentacle);
    }
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), helmetMat);
      eye.position.set(sign * 0.23, 1.17, 0.35);
      driver.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), black);
      pupil.position.set(sign * 0.23, 1.17, 0.46);
      driver.add(pupil);
    }
  } else if (kind === 'cat') {
    for (const sign of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 4), earMat);
      ear.position.set(sign * 0.27, 1.5, -0.02);
      ear.rotation.z = sign * 0.24;
      driver.add(ear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 4), pink);
      tip.position.set(sign * 0.28, 1.6, 0.01);
      tip.rotation.z = sign * 0.24;
      driver.add(tip);
    }
    for (const sign of [-1, 1]) {
      for (const y of [1.02, 1.09]) {
        const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), black);
        whisker.position.set(sign * 0.43, y, 0.36);
        whisker.rotation.z = sign * (y > 1.05 ? 0.13 : -0.1);
        driver.add(whisker);
      }
    }
  } else if (kind === 'owl') {
    for (const sign of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 4), earMat);
      tuft.position.set(sign * 0.24, 1.5, -0.02);
      tuft.rotation.z = sign * 0.42;
      driver.add(tuft);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), mat(0xfff5df, { roughness: 0.8 }));
      disc.position.set(sign * 0.16, 1.17, 0.4);
      driver.add(disc);
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 5), accent);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.02, 0.48);
    driver.add(beak);
  } else if (kind === 'shark') {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.46, 3), accent);
    fin.position.set(0, 1.5, -0.03);
    fin.rotation.y = Math.PI / 2;
    fin.rotation.z = -0.12;
    driver.add(fin);
    for (const sign of [-1, 1]) {
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.02), mat(0xb9f1ff, { roughness: 0.5 }));
      gill.position.set(sign * 0.29, 0.9, 0.34);
      driver.add(gill);
    }
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.02), mat(0xfff9e8, { roughness: 0.4 }));
    tooth.position.set(0, 0.82, 0.44);
    driver.add(tooth);
  } else if (kind === 'robot') {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), accent);
    stalk.position.set(0, 1.58, -0.02);
    driver.add(stalk);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), accent);
    bulb.position.set(0, 1.76, -0.02);
    driver.add(bulb);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.11, 0.05), mat(0x0e1a24, { roughness: 0.25, metalness: 0.65 }));
    visor.position.set(0, 1.16, 0.41);
    driver.add(visor);
    for (const sign of [-1, 1]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), accent);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(sign * 0.37, 1.02, -0.02);
      driver.add(bolt);
    }
  }
}

export function updateKartVisual(kart, data, dt = 1 / 60) {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
  dt = step;
  const { speed = 0, steer = 0, boosting = false, drift = 0, time = 0, spin = 0 } = data;
  const targetRoll = -steer * (drift ? 0.2 : 0.13);
  kart.visual.rotation.z += (targetRoll - kart.visual.rotation.z) * Math.min(1, dt * 10);
  const targetPitch = Math.sin(time * 14) * Math.min(0.015, speed * 0.00035) - (boosting ? 0.025 : 0);
  kart.visual.rotation.x += (targetPitch - kart.visual.rotation.x) * Math.min(1, dt * 8);
  kart.visual.position.y = Math.sin(time * 15 + kart.racer.id.length) * Math.min(0.018, speed * 0.0006);
  kart.wheelSpin += speed * dt * 2.4;
  for (const wheel of kart.wheels) wheel.rotation.x = kart.wheelSpin;
  for (const pivot of kart.frontWheels) {
    pivot.rotation.y += (steer * 0.42 - pivot.rotation.y) * Math.min(1, dt * 12);
  }
  for (const flame of kart.exhaustFlames) {
    flame.visible = boosting;
    if (boosting) {
      const pulse = 0.75 + Math.sin(time * 35) * 0.25;
      flame.scale.set(pulse, 0.7 + Math.random() * 0.5, pulse);
    }
  }
  if (spin > 0) {
    kart.visual.rotation.y += dt * 11;
  } else {
    kart.visual.rotation.y += (0 - kart.visual.rotation.y) * Math.min(1, dt * 9);
  }
  kart.ring.material.opacity = kart.isPlayer ? 0.32 + Math.sin(time * 3.4) * 0.12 : 0.1;
}

export function createShell(homing) {
  const group = new THREE.Group();
  const color = homing ? 0xff3434 : 0x39dd3d;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 9),
    mat(color, { roughness: 0.2, metalness: 0.4, emissive: color, emissiveIntensity: 0.12 }),
  );
  shell.scale.y = 0.72;
  group.add(shell);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.1, 6, 18),
    mat(0xfff3d0, { roughness: 0.4 }),
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 5),
      mat(0xffe9b0, { roughness: 0.4 }),
    );
    spot.position.set(Math.cos(a) * 0.3, 0.22, Math.sin(a) * 0.3);
    spot.scale.y = 0.4;
    group.add(spot);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.set(2.2, 2.2, 1);
  group.add(glow);
  shadowAll(group);
  return group;
}

export function createBanana() {
  const group = new THREE.Group();
  const bananaMat = mat(0xffd633, {
    roughness: 0.55,
    emissive: 0x4a2b00,
    emissiveIntensity: 0.25,
  });
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), bananaMat);
    const a = -0.9 + i * 0.62;
    seg.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.3 + 0.14, 0);
    seg.scale.set(1.3, 0.52, 0.5);
    seg.rotation.z = a;
    group.add(seg);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 5), mat(0x5b3c12));
  tip.position.set(0.6, 0.54, 0);
  group.add(tip);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color: 0xffcf33,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.set(1.6, 1.6, 1);
  group.add(glow);
  shadowAll(group);
  return group;
}

export function createStar() {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const spikes = 5;
  const outer = 0.6;
  const inner = 0.26;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * TAU - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 });
  geo.center();
  const star = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xffe23d,
    emissive: 0xffa500,
    emissiveIntensity: 1.4,
    metalness: 0.35,
    roughness: 0.22,
  }));
  group.add(star);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDiscTexture(),
    color: 0xffe45a,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.set(2.6, 2.6, 1);
  group.add(glow);
  return group;
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        m.dispose();
      }
    }
  });
}
