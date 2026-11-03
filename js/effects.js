import * as THREE from '../vendor/three.module.js';
import { graphics } from './settings.js?v=20261108';

const MAX = 2200;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.alpha = new Float32Array(MAX);
    this.cursor = 0;
    for (let i = 0; i < MAX; i++) {
      this.pos[i * 3 + 1] = -9999;
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {},
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (360.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float d = length(p);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.08, d) * vAlpha;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);
  }

  spawn(opts) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    const p = {
      x: opts.x,
      y: opts.y,
      z: opts.z,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      vz: opts.vz || 0,
      life: opts.life || 1,
      maxLife: opts.life || 1,
      size: opts.size || 0.4,
      gravity: opts.gravity ?? 9,
      drag: opts.drag ?? 2.4,
      color: new THREE.Color(opts.color || 0xffffff),
      shrink: opts.shrink ?? 1,
    };
    this.particles[i] = p;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.size[i] = p.size;
    this.alpha[i] = 1;
    this.col[i * 3] = p.color.r;
    this.col[i * 3 + 1] = p.color.g;
    this.col[i * 3 + 2] = p.color.b;
    return i;
  }

  burst(pos, color, count = 12, opts = {}) {
    const speed = opts.speed ?? 6;
    const n = Math.max(1, Math.round(count * graphics().particles));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = (opts.up ?? 0.35) + Math.random() * (opts.spread ?? 0.8);
      const s = speed * (0.45 + Math.random() * 0.8);
      this.spawn({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        vx: Math.cos(a) * s,
        vy: up * s,
        vz: Math.sin(a) * s,
        life: (opts.life ?? 0.65) * (0.7 + Math.random() * 0.7),
        size: (opts.size ?? 0.5) * (0.65 + Math.random() * 0.9),
        gravity: opts.gravity ?? 8,
        drag: opts.drag ?? 1.8,
        color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
      });
    }
  }

  sparks(pos, color, count = 4, dir = 0) {
    const n = Math.max(1, Math.round(count * graphics().particles));
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * 1.8;
      const s = 2 + Math.random() * 7;
      this.spawn({
        x: pos.x + (Math.random() - 0.5) * 0.45,
        y: pos.y + Math.random() * 0.22,
        z: pos.z + (Math.random() - 0.5) * 0.45,
        vx: Math.cos(a) * s,
        vy: 0.4 + Math.random() * 3.8,
        vz: Math.sin(a) * s,
        life: 0.24 + Math.random() * 0.34,
        size: 0.16 + Math.random() * 0.24,
        gravity: 11,
        drag: 2.1,
        color,
      });
    }
  }

  confetti(pos, count = 150) {
    const colors = [0xff4b57, 0xffd23d, 0x42e0ff, 0x6dff7c, 0xff7edb, 0xffffff];
    const n = Math.max(4, Math.round(count * graphics().particles));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 14;
      this.spawn({
        x: pos.x + (Math.random() - 0.5) * 3,
        y: pos.y + Math.random() * 4,
        z: pos.z + (Math.random() - 0.5) * 3,
        vx: Math.cos(a) * s,
        vy: 7 + Math.random() * 15,
        vz: Math.sin(a) * s,
        life: 1.5 + Math.random() * 2.4,
        size: 0.28 + Math.random() * 0.35,
        gravity: 7,
        drag: 0.9,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt) {
    const pos = this.pos;
    const size = this.size;
    const alpha = this.alpha;
    const col = this.col;
    for (let i = 0; i < MAX; i++) {
      const p = this.particles[i];
      if (!p || p.life <= 0) {
        if (alpha[i] !== 0) alpha[i] = 0;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        alpha[i] = 0;
        pos[i * 3 + 1] = -9999;
        continue;
      }
      const drag = Math.max(0, 1 - p.drag * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = p.life / p.maxLife;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      size[i] = p.size * (0.35 + 0.65 * Math.pow(t, p.shrink));
      alpha[i] = Math.min(1, t * 2.6);
      col[i * 3] = p.color.r;
      col[i * 3 + 1] = p.color.g;
      col[i * 3 + 2] = p.color.b;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  }
}
