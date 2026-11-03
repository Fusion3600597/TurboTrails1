import * as THREE from '../vendor/three.module.js';

export const css = (hex) => '#' + new THREE.Color(hex).getHexString();

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

let softDisc = null;
export function softDiscTexture() {
  if (softDisc) return softDisc;
  softDisc = makeTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.92)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  softDisc.userData.shared = true;
  return softDisc;
}

export function makeRoadTexture(def) {
  const tex = makeTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = css(def.road);
    ctx.fillRect(0, 0, w, h);
    const rng = mulberry32(141 + def.id.length * 97);
    for (let i = 0; i < 8500; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const a = 0.025 + rng() * 0.08;
      ctx.fillStyle = rng() > 0.52 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.25})`;
      ctx.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 2);
    }
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#020205';
    ctx.fillRect(92, 0, 38, h);
    ctx.fillRect(382, 0, 38, h);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(254, 0, 3, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,.24)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 17; i++) {
      const x = rng() * w;
      const y = rng() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 12, y + 16 + rng() * 42);
      ctx.lineTo(x + (rng() - 0.5) * 22, y + 34 + rng() * 66);
      ctx.stroke();
    }
    if (def.environment === 'night') {
      const sheen = ctx.createLinearGradient(0, 0, w, 0);
      sheen.addColorStop(0, 'rgba(255,40,200,.10)');
      sheen.addColorStop(0.35, 'rgba(60,220,255,.04)');
      sheen.addColorStop(0.65, 'rgba(255,40,200,.04)');
      sheen.addColorStop(1, 'rgba(60,220,255,.1)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeCheckerTexture() {
  const tex = makeTexture(256, 128, (ctx, w, h) => {
    const size = 32;
    for (let y = 0; y < h / size; y++) {
      for (let x = 0; x < w / size; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#16121a' : '#fff8e9';
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeBannerTexture(title, sub, def) {
  return makeTexture(1024, 192, (ctx, w, h) => {
    ctx.fillStyle = css(def.skyTop);
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, css(def.accent));
    g.addColorStop(0.45, '#1a1724');
    g.addColorStop(1, css(def.accent2));
    ctx.fillStyle = g;
    ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = 'rgba(10,8,18,.7)';
    ctx.fillRect(18, 18, w - 36, h - 36);
    ctx.save();
    ctx.translate(0, 0);
    const size = 34;
    ctx.globalAlpha = 0.22;
    for (let x = -h; x < w + h; x += size) {
      for (let y = 0; y < h; y += size) {
        if (((x / size) + (y / size)) % 2 === 0) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + y, y, size, size);
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 82px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#fff6dc';
    ctx.fillText(title.toUpperCase(), w / 2, 82);
    ctx.font = '700 26px "Trebuchet MS", sans-serif';
    ctx.fillStyle = css(def.accent);
    ctx.letterSpacing = '8px';
    ctx.fillText(sub.toUpperCase(), w / 2, 145);
    ctx.strokeStyle = css(def.accent2);
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, w - 32, h - 32);
  });
}

export function makeSignTexture(text, acc, dark = '#16121a', align = 'center') {
  return makeTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = acc;
    for (let i = 0; i < 22; i++) {
      ctx.fillRect(0, i * 14, w, 2);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.font = '900 96px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = acc;
    ctx.shadowColor = acc;
    ctx.shadowBlur = 18;
    ctx.fillText(text, w / 2, h / 2 + 4);
    ctx.shadowBlur = 0;
  });
}

export function makeWindowTexture() {
  return makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#131326';
    ctx.fillRect(0, 0, w, h);
    const rng = mulberry32(6001);
    for (let y = 8; y < h - 8; y += 18) {
      for (let x = 8; x < w - 8; x += 16) {
        const lit = rng() > 0.52;
        const hue = rng() > 0.8 ? '#ff69cf' : rng() > 0.6 ? '#62eaff' : '#ffd678';
        ctx.fillStyle = lit ? hue : '#0a0a15';
        ctx.globalAlpha = lit ? 0.6 + rng() * 0.4 : 1;
        ctx.fillRect(x, y, 8, 7);
      }
    }
    ctx.globalAlpha = 1;
  });
}

export function makeChevronTexture() {
  const tex = makeTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    for (let y = -64; y < h + 64; y += 120) {
      ctx.beginPath();
      ctx.moveTo(16, y + 128);
      ctx.lineTo(w / 2, y + 36);
      ctx.lineTo(w - 16, y + 128);
      ctx.lineTo(w - 16, y + 176);
      ctx.lineTo(w / 2, y + 84);
      ctx.lineTo(16, y + 176);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, y, 0, y + 180);
      grad.addColorStop(0, '#fff6b0');
      grad.addColorStop(0.5, '#ffb01f');
      grad.addColorStop(1, '#ff5a00');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

/* Big painted corner arrow for the approach to sharp turns. */
export function makeTurnTexture(dir = 'left') {
  return makeTexture(320, 420, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const sx = dir === 'left' ? -1 : 1;
    const cx = w / 2;
    const path = new Path2D();
    path.moveTo(cx, h - 52);
    path.bezierCurveTo(cx, h * 0.62, cx + sx * 8, h * 0.44, cx + sx * 92, h * 0.28);

    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#fff7cf');
    grad.addColorStop(0.55, '#ffc62e');
    grad.addColorStop(1, '#ff7a18');

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(22,12,8,.62)';
    ctx.lineWidth = 52;
    ctx.stroke(path);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 34;
    ctx.stroke(path);

    const endX = cx + sx * 92;
    const endY = h * 0.28;
    const dirX = sx * 0.82;
    const dirY = -0.57;
    const len = Math.hypot(dirX, dirY) || 1;
    const ux = dirX / len;
    const uy = dirY / len;
    const px = -uy;
    const py = ux;
    const tipX = endX + ux * 34;
    const tipY = endY + uy * 34;
    const baseX = endX - ux * 12;
    const baseY = endY - uy * 12;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX + px * 44, baseY + py * 44);
    ctx.lineTo(baseX + ux * 6, baseY + uy * 6);
    ctx.lineTo(baseX - px * 44, baseY - py * 44);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(22,12,8,.62)';
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.fillStyle = grad;
    ctx.fill();

    // White pupils along the tail make the direction readable at speed.
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      const x = cx + sx * (6 + t * 58);
      const y = h * 0.72 - t * h * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, 7 - i * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fill();
    }
  });
}

export function makeGlowTexture(color) {
  return makeTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.2, color);
    g.addColorStop(0.55, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeQuestionTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 108px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#fffbe4';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.fillText('?', w / 2, h / 2 + 4);
  });
}

export function makeStoneTexture(base = '#6f6650') {
  const tex = makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const rng = mulberry32(991);
    for (let i = 0; i < 850; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)';
      ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 5, 1 + rng() * 5);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.24)';
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      const x = rng() * w;
      const y = rng() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 40, y + rng() * 30);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
