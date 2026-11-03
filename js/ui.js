import { ITEMS, DIFFICULTIES } from './tracks.js?v=20261108';
import { racerIcon, itemIconMarkup, soundIcon, flagIcon, pauseIcon, starIcon, coinIcon, arrowIcon } from './icons.js?v=20261108';
import { qualityById } from './settings.js?v=20261108';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SUFFIX = ['th', 'st', 'nd', 'rd'];
const ordinal = (n) => {
  const v = n % 100;
  return n + (SUFFIX[(v - 20) % 10] || SUFFIX[v] || SUFFIX[0]);
};
const hex = (n) => `#${Number(n).toString(16).padStart(6, '0')}`;

export function formatTime(seconds, ms = true) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const frac = Math.floor((t % 1) * 1000);
  return ms
    ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(frac).padStart(3, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const KIND_LABEL = {
  fox: 'Fox', bunny: 'Bunny', tiger: 'Tiger', frog: 'Frog',
  axolotl: 'Axolotl', dino: 'Dino', penguin: 'Penguin', octopus: 'Octopus',
  cat: 'Cat', owl: 'Owl', shark: 'Shark', robot: 'Robot',
};

function driverClass(stats) {
  const { speed, accel, handling } = stats;
  const max = Math.max(speed, accel, handling);
  if (speed === max && accel === max) return 'Powerhouse';
  if (speed === max) return 'Speedster';
  if (handling === max) return 'Handler';
  if (accel === max) return 'Launcher';
  return 'All-rounder';
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

function trackOutline(points, perSegment = 10) {
  const pts = points.map((p) => [p[0], p[2]]);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
    for (let s = 0; s < perSegment; s++) out.push(catmull(p0, p1, p2, p3, s / perSegment));
  }
  return out;
}

function pathBounds(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  return { minX, maxX, minY, maxY };
}

function fitPoints(pts, width, height, pad) {
  const b = pathBounds(pts);
  const spanX = b.maxX - b.minX || 1;
  const spanY = b.maxY - b.minY || 1;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return pts.map((p) => [
    offX + (p[0] - b.minX) * scale,
    offY + (p[1] - b.minY) * scale,
  ]);
}

export function estimateTrackLength(track) {
  let len = 0;
  for (let i = 0; i < track.points.length; i++) {
    const a = track.points[i];
    const b = track.points[(i + 1) % track.points.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return len * 1.045;
}

function drawTrack(canvas, track, opts = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const accent = track.accent;
  const accent2 = track.accent2;
  const pts = fitPoints(trackOutline(track.points, opts.segments ?? 10), w, h, opts.pad ?? Math.min(w, h) * 0.12);
  if (!pts.length) return;

  const path = new Path2D();
  pts.forEach((p, i) => {
    if (i === 0) path.moveTo(p[0], p[1]);
    else path.lineTo(p[0], p[1]);
  });
  path.closePath();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Soft accent bloom
  ctx.save();
  ctx.globalAlpha = opts.thumb ? 0.3 : 0.26;
  ctx.strokeStyle = accent;
  ctx.lineWidth = opts.thumb ? 16 : 34;
  ctx.shadowColor = accent;
  ctx.shadowBlur = opts.thumb ? 14 : 42;
  ctx.stroke(path);
  ctx.restore();

  // Tarmac
  ctx.strokeStyle = opts.thumb ? 'rgba(6,8,14,.85)' : 'rgba(7,9,17,.88)';
  ctx.lineWidth = opts.thumb ? 9 : 22;
  ctx.stroke(path);

  // Coloured edge
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, accent);
  grad.addColorStop(1, accent2);
  ctx.strokeStyle = grad;
  ctx.lineWidth = opts.thumb ? 4 : 8;
  ctx.globalAlpha = 0.95;
  ctx.stroke(path);
  ctx.globalAlpha = 1;

  // Centre dashes
  ctx.save();
  ctx.setLineDash(opts.thumb ? [4, 6] : [10, 15]);
  ctx.strokeStyle = 'rgba(255,255,255,.62)';
  ctx.lineWidth = opts.thumb ? 1.4 : 2.6;
  ctx.stroke(path);
  ctx.restore();

  if (!opts.thumb) {
    // Direction chevrons
    const n = pts.length;
    for (const frac of [0.14, 0.4, 0.66, 0.9]) {
      const i = Math.floor(frac * n) % n;
      const p = pts[i];
      const q = pts[(i + 4) % n];
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Start line
    const p0 = pts[0];
    const p1 = pts[3 % pts.length];
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + Math.PI / 2;
    ctx.save();
    ctx.translate(p0[0], p0[1]);
    ctx.rotate(ang);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 16;
    ctx.fillRect(-3, -16, 6, 32);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(p0[0], p0[1], 6, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

export class UI {
  constructor(callbacks = {}) {
    this.cb = callbacks;
    this.$ = (id) => document.getElementById(id);
    this.paused = false;
    this.messageTimer = null;
    this.countdownTimer = null;
    this.lastPos = null;
    this.rollTime = 0;
    this.rollingIcons = Object.keys(ITEMS).map((id) => itemIconMarkup(id));
    this.touchMode = false;
    this.diffLabel = 'Normal';
    this.gameMode = 'quick';
    this.currentCup = null;
    this.qualityId = 'high';

    this.el = {
      app: this.$('app'),
      loading: this.$('loading'),
      loadingLabel: this.$('loading-label'),
      menu: this.$('menu'),
      hud: this.$('hud'),
      racerGrid: this.$('racer-grid'),
      driverDetail: this.$('driver-detail'),
      trackList: this.$('track-list'),
      trackHero: this.$('track-hero'),
      heroMap: this.$('hero-map'),
      trackRegion: this.$('track-region'),
      trackName: this.$('track-name'),
      trackBlurb: this.$('track-blurb'),
      trackLaps: this.$('track-laps'),
      trackLength: this.$('track-length'),
      trackDiff: this.$('track-diff'),
      btnRace: this.$('btn-race'),
      launchDriver: this.$('launch-driver'),
      launchSub: this.$('launch-sub'),
      hudPosition: this.$('hud-position'),
      positionCard: document.querySelector('.position-card'),
      hudLap: this.$('hud-lap'),
      hudLapTotal: this.$('hud-lap-total'),
      hudCoins: this.$('hud-coins'),
      hudTime: this.$('hud-time'),
      hudBest: this.$('hud-best'),
      hudTrack: this.$('hud-track'),
      diffBlurb: this.$('diff-blurb'),
      qualityLabel: this.$('quality-label'),
      qualityBlurb: this.$('quality-blurb'),
      pauseQualityLabel: this.$('pause-quality-label'),
      cupStrip: this.$('cup-strip'),
      gpSummary: this.$('gp-summary'),
      gpCupName: this.$('gp-cup-name'),
      gpProgress: this.$('gp-progress'),
      gpStandings: this.$('gp-standings'),
      btnAgain: this.$('btn-again'),
      btnNext: this.$('btn-next'),
      btnTracks: this.$('btn-tracks'),
      hudItemIcon: this.$('hud-item-icon'),
      hudItemName: this.$('hud-item-name'),
      hudItemTip: this.$('hud-item-tip'),
      itemSlot: this.$('item-slot'),
      hudSpeed: this.$('hud-speed'),
      speedRing: this.$('speed-ring'),
      driftMeter: this.$('drift-meter'),
      driftFill: this.$('drift-fill'),
      driftTier: this.$('drift-tier'),
      boostBadge: this.$('boost-badge'),
      minimap: this.$('minimap'),
      countdown: this.$('countdown'),
      countdownNum: this.$('countdown').querySelector('span'),
      countdownSub: this.$('countdown').querySelector('em'),
      raceMessage: this.$('race-message'),
      messageTitle: this.$('message-title'),
      messageSub: this.$('message-sub'),
      pause: this.$('pause'),
      pauseTrack: this.$('pause-track'),
      pauseDriver: this.$('pause-driver'),
      results: this.$('results'),
      resultsEyebrow: this.$('results-eyebrow'),
      resultsTitle: this.$('results-title'),
      resultsSub: this.$('results-sub'),
      podium: this.$('podium'),
      resultsList: this.$('results-list'),
      help: this.$('help'),
      touch: this.$('touch'),
      flash: this.$('flash'),
      speedlines: this.$('speedlines'),
      btnSound: this.$('btn-sound'),
      toggleMusic: this.$('toggle-music'),
      toggleSfx: this.$('toggle-sfx'),
      webgl: this.$('webgl-fallback'),
    };

    const flagSlot = document.querySelector('.wordmark-flag');
    if (flagSlot) flagSlot.innerHTML = flagIcon();
    document.querySelectorAll('.pause-glyph').forEach((el) => { el.innerHTML = pauseIcon(); });
    document.querySelectorAll('.coin-icon').forEach((el) => { el.innerHTML = coinIcon(); });
    document.querySelectorAll('.steer-glyph').forEach((el) => {
      el.innerHTML = arrowIcon(el.dataset.dir === 'right' ? 'right' : 'left');
    });
    this.el.btnSound?.querySelectorAll('.sound-on').forEach((el) => { el.innerHTML = soundIcon(false); });
    this.el.btnSound?.querySelectorAll('.sound-off').forEach((el) => { el.innerHTML = soundIcon(true); });

    this.minimapCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.currentTrack = null;
    this.currentRacer = null;
    this.bindStatic();
  }

  bindStatic() {
    const click = (id, fn) => {
      const el = this.$(id);
      if (el) el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
    };
    click('btn-race', () => this.cb.start?.());
    click('btn-sound', () => this.cb.toggleSound?.());
    click('btn-help', () => this.openHelp());
    click('btn-close-help', () => this.closeHelp());
    click('btn-help-close-2', () => this.closeHelp());
    click('btn-pause', () => this.cb.pause?.());
    click('btn-resume', () => this.cb.resume?.());
    click('btn-restart', () => this.cb.restart?.());
    click('btn-quit', () => this.cb.quit?.());
    click('btn-again', () => this.cb.again?.());
    click('btn-next', () => this.cb.next?.());
    click('btn-tracks', () => this.cb.tracks?.());
    click('touch-pause', () => this.cb.pause?.());

    document.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cb.difficulty?.(btn.dataset.difficulty);
      });
    });

    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cb.mode?.(btn.dataset.mode);
      });
    });

    document.querySelectorAll('.quality-chip[data-quality]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cb.quality?.(btn.dataset.quality);
      });
    });

    this.el.toggleMusic?.addEventListener('change', (e) => this.cb.music?.(e.target.checked));
    this.el.toggleSfx?.addEventListener('change', (e) => this.cb.sfx?.(e.target.checked));

    this.bindTouch();
  }

  bindTouch() {
    const steer = (id, dir) => {
      const el = this.$(id);
      if (!el) return;
      const down = (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        el.setPointerCapture?.(e.pointerId);
        this.cb.touchSteer?.(dir, true);
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('pressed');
        this.cb.touchSteer?.(dir, false);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    steer('touch-left', -1);
    steer('touch-right', 1);

    const drift = this.$('touch-drift');
    if (drift) {
      const down = (e) => {
        e.preventDefault();
        drift.classList.add('pressed');
        drift.setPointerCapture?.(e.pointerId);
        this.cb.touchDrift?.(true);
      };
      const up = (e) => {
        e.preventDefault();
        drift.classList.remove('pressed');
        this.cb.touchDrift?.(false);
      };
      drift.addEventListener('pointerdown', down);
      drift.addEventListener('pointerup', up);
      drift.addEventListener('pointercancel', up);
      drift.addEventListener('pointerleave', up);
    }

    const item = this.$('touch-item');
    if (item) {
      item.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        item.classList.add('pressed');
        this.cb.touchItem?.();
        setTimeout(() => item.classList.remove('pressed'), 130);
      });
    }
  }

  // ───────────────────────────── menu ─────────────────────────────

  buildRacers(racers, selectedId) {
    const grid = this.el.racerGrid;
    if (!grid) return;
    grid.innerHTML = '';
    for (const r of racers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `racer-card${r.id === selectedId ? ' selected' : ''}`;
      btn.style.setProperty('--rc', hex(r.color));
      btn.dataset.id = r.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', r.id === selectedId ? 'true' : 'false');
      btn.innerHTML = `<span class="racer-avatar">${racerIcon(r)}</span><span class="racer-name">${r.name}</span><span class="racer-tick"></span>`;
      btn.addEventListener('click', () => this.cb.selectRacer?.(r.id));
      grid.appendChild(btn);
    }
  }

  buildTracks(tracks, selectedId) {
    const list = this.el.trackList;
    if (!list) return;
    list.dataset.count = String(tracks.length);
    list.innerHTML = '';
    for (const t of tracks) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `track-card${t.id === selectedId ? ' selected' : ''}`;
      btn.style.setProperty('--tc', t.accent);
      btn.dataset.id = t.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', t.id === selectedId ? 'true' : 'false');
      btn.innerHTML = `<span class="tc-num">${t.number}</span><span class="tc-name">${t.name}</span><canvas class="tc-mini" width="150" height="150"></canvas>`;
      drawTrack(btn.querySelector('canvas'), t, { thumb: true, pad: 20, segments: 7 });
      btn.addEventListener('click', () => this.cb.selectTrack?.(t.id));
      list.appendChild(btn);
    }
  }

  buildCups(cups, selectedId) {
    const list = this.el.cupStrip;
    if (!list) return;
    list.innerHTML = '';
    for (const cup of cups) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cup-card${cup.id === selectedId ? ' selected' : ''}`;
      btn.style.setProperty('--cup-c', cup.color);
      btn.dataset.id = cup.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', cup.id === selectedId ? 'true' : 'false');
      btn.innerHTML = `<em>${String(cup.tracks.length).padStart(2, '0')}</em><b>${cup.name}</b><small>${cup.tag}</small>`;
      btn.addEventListener('click', () => this.cb.selectCup?.(cup.id));
      list.appendChild(btn);
    }
  }

  selectCup(cup) {
    this.currentCup = cup;
    const cards = this.el.cupStrip?.querySelectorAll('.cup-card') || [];
    cards.forEach((c) => {
      const on = c.dataset.id === cup.id;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    this.updateLaunch();
  }

  setMode(mode) {
    this.gameMode = mode === 'gp' ? 'gp' : 'quick';
    document.querySelectorAll('[data-mode]').forEach((btn) => {
      const on = btn.dataset.mode === this.gameMode;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    this.el.cupStrip?.classList.toggle('hidden', this.gameMode !== 'gp');
    this.updateLaunch();
  }

  updateLaunch() {
    const track = this.currentTrack;
    const label = this.el.btnRace?.querySelector('.btn-race-label');
    if (label) label.textContent = this.gameMode === 'gp' ? 'Start Grand Prix' : 'Start Race';
    if (!this.el.launchSub || !track) return;
    if (this.gameMode === 'gp' && this.currentCup) {
      this.el.launchSub.textContent = `${this.currentCup.name} · ${this.currentCup.tracks.length} races · ${this.diffLabel || 'Normal'} CPU`;
    } else {
      this.el.launchSub.textContent = `8 racers · ${track.laps} laps · ${this.diffLabel || 'Normal'} CPU`;
    }
  }

  setQuality(id) {
    const q = qualityById(id);
    this.qualityId = q.id;
    document.querySelectorAll('.quality-chip[data-quality]').forEach((btn) => {
      const on = btn.dataset.quality === q.id;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (this.el.qualityLabel) this.el.qualityLabel.textContent = q.label;
    if (this.el.qualityBlurb) this.el.qualityBlurb.textContent = q.blurb;
    if (this.el.pauseQualityLabel) this.el.pauseQualityLabel.textContent = q.label;
  }

  selectRacer(racer) {
    this.currentRacer = racer;
    const cards = this.el.racerGrid.querySelectorAll('.racer-card');
    cards.forEach((c) => {
      const on = c.dataset.id === racer.id;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    this.renderDriver(racer);
  }

  renderDriver(racer) {
    const detail = this.el.driverDetail;
    if (!detail) return;
    const cls = driverClass(racer.stats);
    const statRow = (label, key) => `
      <div class="stat-row">
        <span>${label}</span>
        <span class="stat-bar"><i style="--v:${racer.stats[key]}"></i></span>
        <b>${racer.stats[key]}</b>
      </div>`;
    detail.innerHTML = `
      <div class="driver-id" style="--rc:${hex(racer.color)}">
        <div class="driver-avatar">${racerIcon(racer)}</div>
        <div>
          <h3>${racer.name}</h3>
          <p>${KIND_LABEL[racer.kind] ?? racer.kind} · ${cls}</p>
        </div>
        <span class="driver-class">${cls}</span>
      </div>
      <div class="stat-rows">
        ${statRow('Top speed', 'speed')}
        ${statRow('Accel', 'accel')}
        ${statRow('Handling', 'handling')}
      </div>`;
    if (this.el.launchDriver) this.el.launchDriver.textContent = `${racer.name} the ${KIND_LABEL[racer.kind] ?? 'Racer'}`;
  }

  selectTrack(track, actualLength = null) {
    this.currentTrack = track;
    const root = document.documentElement;
    root.style.setProperty('--accent', track.accent);
    root.style.setProperty('--accent2', track.accent2);
    if (this.el.trackHero) {
      this.el.trackHero.className = `track-hero env-${track.environment}`;
    }
    if (this.el.trackRegion) this.el.trackRegion.textContent = track.region;
    if (this.el.trackName) this.el.trackName.textContent = track.name;
    if (this.el.trackBlurb) this.el.trackBlurb.textContent = track.blurb;
    if (this.el.trackLaps) this.el.trackLaps.textContent = String(track.laps);
    if (this.el.trackLength) {
      const len = actualLength ?? estimateTrackLength(track);
      this.el.trackLength.textContent = `${(len / 1000).toFixed(2)} km`;
    }
    if (this.el.trackDiff) {
      this.el.trackDiff.innerHTML = [1, 2, 3]
        .map((n) => starIcon(n <= track.difficulty))
        .join('');
    }
    if (this.el.launchSub) {
      this.updateLaunch();
    }
    if (this.el.hudTrack) this.el.hudTrack.textContent = track.name;
    if (this.el.pauseTrack) this.el.pauseTrack.textContent = track.name;
    if (this.el.heroMap) drawTrack(this.el.heroMap, track, { pad: 78, segments: 12 });

    const cards = this.el.trackList.querySelectorAll('.track-card');
    cards.forEach((c) => {
      const on = c.dataset.id === track.id;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  setLength(length) {
    if (this.el.trackLength) this.el.trackLength.textContent = `${(length / 1000).toFixed(2)} km`;
  }

  setSoundMuted(muted) {
    this.el.btnSound?.classList.toggle('muted', muted);
    const on = this.el.btnSound?.querySelector('.sound-on');
    const off = this.el.btnSound?.querySelector('.sound-off');
    if (on) on.innerHTML = soundIcon(false);
    if (off) off.innerHTML = soundIcon(true);
  }

  setDifficulty(diff) {
    const def = DIFFICULTIES.find((d) => d.id === diff) || DIFFICULTIES[1];
    this.diffLabel = def.label;
    document.querySelectorAll('.diff-chip[data-difficulty]').forEach((btn) => {
      const on = btn.dataset.difficulty === def.id;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.style.setProperty('--diff-color', def.color);
    });
    if (this.el.diffBlurb) this.el.diffBlurb.textContent = def.blurb;
    this.updateLaunch();
    document.body.dataset.difficulty = def.id;
  }

  setMusic(on) {
    if (this.el.toggleMusic) this.el.toggleMusic.checked = on;
  }

  setSfx(on) {
    if (this.el.toggleSfx) this.el.toggleSfx.checked = on;
  }

  // ───────────────────────────── screens & overlays ─────────────────────────────

  showLoading(label = 'Shaping the circuit…') {
    if (this.el.loadingLabel) this.el.loadingLabel.textContent = label;
    this.el.loading?.classList.remove('hidden');
  }

  hideLoading() {
    this.el.loading?.classList.add('hidden');
  }

  showMenu() {
    this.el.menu?.classList.remove('hidden');
    this.el.hud?.classList.add('hidden');
    this.el.touch?.classList.add('hidden');
    this.el.pause?.classList.add('hidden');
    this.el.results?.classList.add('hidden');
    this.el.help?.classList.add('hidden');
    this.closeCountdown();
    this.hideMessage();
    this.paused = false;
    this.el.speedlines?.classList.remove('on');
    this.hideHudFx();
  }

  showRace() {
    this.el.menu?.classList.add('hidden');
    this.el.hud?.classList.remove('hidden');
    this.el.pause?.classList.add('hidden');
    this.el.results?.classList.add('hidden');
    this.el.help?.classList.add('hidden');
    if (this.touchMode) this.el.touch?.classList.remove('hidden');
    this.paused = false;
  }

  showPause(track, racer) {
    this.paused = true;
    if (this.el.pauseTrack) this.el.pauseTrack.textContent = track?.name ?? '';
    if (this.el.pauseDriver) this.el.pauseDriver.textContent = racer?.name ?? '';
    this.el.pause?.classList.remove('hidden');
  }

  hidePause() {
    this.paused = false;
    this.el.pause?.classList.add('hidden');
  }

  openHelp() {
    this.el.help?.classList.remove('hidden');
  }

  closeHelp() {
    this.el.help?.classList.add('hidden');
  }

  showWebGLFallback() {
    this.el.webgl?.classList.remove('hidden');
  }

  // ───────────────────────────── countdown & messages ─────────────────────────────

  countdown(label, sub, go = false) {
    const box = this.el.countdown;
    if (!box) return;
    box.classList.remove('hidden');
    box.classList.toggle('go', go);
    const num = this.el.countdownNum;
    num.textContent = label;
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = '';
    this.el.countdownSub.textContent = sub ?? '';
    clearTimeout(this.countdownTimer);
    this.countdownTimer = setTimeout(() => this.closeCountdown(), go ? 900 : 940);
  }

  closeCountdown() {
    clearTimeout(this.countdownTimer);
    this.el.countdown?.classList.add('hidden');
  }

  message(title, sub = '', tone = '', duration = 1400) {
    const box = this.el.raceMessage;
    if (!box) return;
    box.classList.remove('hidden', 'good', 'bad', 'final');
    if (tone) box.classList.add(tone);
    this.el.messageTitle.textContent = title;
    this.el.messageSub.textContent = sub;
    this.el.messageSub.style.display = sub ? '' : 'none';
    const strong = this.el.messageTitle;
    strong.style.animation = 'none';
    void strong.offsetWidth;
    strong.style.animation = '';
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.hideMessage(), duration);
  }

  hideMessage() {
    clearTimeout(this.messageTimer);
    this.el.raceMessage?.classList.add('hidden');
  }

  itemUsed() {
    const slot = this.el.itemSlot;
    if (!slot) return;
    slot.classList.remove('used');
    void slot.offsetWidth;
    slot.classList.add('used');
    setTimeout(() => slot.classList.remove('used'), 380);
  }

  flash() {
    const f = this.el.flash;
    if (!f) return;
    f.classList.add('fire');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('fire')));
  }

  hideHudFx() {
    this.el.speedlines?.classList.remove('on');
    this.el.boostBadge?.classList.remove('on');
  }

  setTouchMode(on) {
    this.touchMode = on;
    document.body.classList.toggle('touch-mode', on);
  }

  // ───────────────────────────── HUD ─────────────────────────────

  updateHUD(hud, race) {
    if (!hud) return;
    const el = this.el;

    if (hud.position !== this.lastPos) {
      this.lastPos = hud.position;
      el.hudPosition.innerHTML = `${hud.position}<sup>${ordinal(hud.position).replace(String(hud.position), '')}</sup>`;
      el.positionCard?.classList.toggle('p1', hud.position === 1);
    }
    el.hudLap.textContent = String(hud.lap);
    el.hudLapTotal.textContent = String(hud.laps);
    el.hudCoins.textContent = String(hud.coins);
    el.hudTime.textContent = formatTime(hud.time);
    el.hudBest.textContent = hud.bestLap ? `Best lap ${formatTime(hud.bestLap)}` : 'Best lap —';
    el.hudSpeed.textContent = String(hud.speed);
    el.app.style.setProperty('--speed-pct', String(Math.round(hud.speedRatio * 100)));

    // Item slot
    const slot = el.itemSlot;
    const rolling = hud.roulette > 0;
    this.rollTime += 0.016;
    if (rolling) {
      const icons = this.rollingIcons;
      const idx = Math.floor(performance.now() / 75) % icons.length;
      el.hudItemIcon.innerHTML = icons[idx];
      el.hudItemName.textContent = 'Rolling…';
      el.hudItemTip.textContent = 'Item incoming';
      slot.classList.add('rolling');
      slot.classList.remove('has-item');
      slot.style.setProperty('--item-color', hud.itemColor);
    } else {
      slot.classList.remove('rolling');
      el.hudItemIcon.innerHTML = itemIconMarkup(hud.item);
      el.hudItemName.textContent = hud.itemLabel;
      el.hudItemTip.textContent = hud.itemTip;
      slot.classList.toggle('has-item', !!hud.item);
      slot.style.setProperty('--item-color', hud.itemColor);
    }

    // Drift meter
    const driftActive = hud.drifting || hud.driftCharge > 0.05;
    el.driftMeter.classList.toggle('active', driftActive);
    el.driftFill.style.width = `${clamp((hud.driftCharge / 2.7) * 100, 0, 100)}%`;
    el.driftMeter.style.setProperty('--drift-color', hud.driftColor);
    const tierNames = ['', 'MINI', 'SUPER', 'ULTRA'];
    el.driftTier.textContent = tierNames[hud.driftTier] || 'CHARGING';
    el.driftTier.style.color = hud.driftColor;

    el.boostBadge.classList.toggle('on', hud.boosting);
    el.speedlines.classList.toggle('on', hud.boosting || hud.star);
    el.hud?.classList.toggle('drifting', !!hud.drifting);
    this.el.app.classList.toggle('offroad', hud.offroad);

    if (race) this.drawMinimap(race.minimapPoints, race.getMinimapDots(), hud.position);
  }

  drawMinimap(points, dots, position) {
    const ctx = this.minimapCtx;
    if (!ctx || !points?.length) return;
    const w = this.el.minimap.width;
    const h = this.el.minimap.height;
    ctx.clearRect(0, 0, w, h);
    const pad = 42;
    const span = w - pad * 2;
    const map = (p) => [pad + p.x * span, pad + p.y * span];

    // Faint grid rings
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.lineWidth = 2;
    for (const r of [0.28, 0.46]) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, span * r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    const path = new Path2D();
    points.forEach((p, i) => {
      const [x, y] = map(p);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.strokeStyle = 'rgba(4,6,12,.7)';
    ctx.lineWidth = 30;
    ctx.stroke(path);

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb52e';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 11;
    ctx.stroke(path);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([7, 12]);
    ctx.stroke(path);
    ctx.restore();

    // Start / finish
    const [sx, sy] = map(points[0]);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14;
    ctx.fillRect(-4, -13, 8, 26);
    ctx.restore();

    // Racers
    for (const d of dots) {
      const x = pad + d.x * span;
      const y = pad + d.y * span;
      if (d.isPlayer) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI - (d.heading ?? 0));
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(10, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, TAU);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(8,10,16,.85)';
        ctx.stroke();
      }
    }

    if (dots.length && this.el.minimap.parentElement) {
      this.el.minimap.parentElement.style.setProperty('--accent', accent);
    }
  }

  // ───────────────────────────── results ─────────────────────────────

  showResults(result, gp = null) {
    if (!result) return;
    this.paused = false;
    this.el.hud?.classList.add('hidden');
    this.el.touch?.classList.add('hidden');
    const place = result.playerPlace;
    const won = place === 1;
    let medal = place === 1 ? 'P1 — Beautiful.' : place === 2 ? 'P2 — So close.' : place === 3 ? 'P3 — Podium!' : `P${place} — Keep pushing.`;
    this.el.resultsEyebrow.textContent = won ? 'Chequered flag' : 'Race complete';
    this.el.resultsSub.textContent = `${result.track.name} · ${ordinal(place)} of ${result.entries.length} · ${formatTime(result.playerTime)}`;
    this.el.resultsTitle.textContent = medal;
    this.el.resultsTitle.style.color = won ? '#ffe27a' : '';

    if (gp) {
      const playerRow = gp.standings.find((s) => s.isPlayer);
      const gpPlace = gp.standings.indexOf(playerRow) + 1;
      this.el.gpSummary.classList.remove('hidden');
      this.el.gpCupName.textContent = gp.cup.name;
      this.el.gpProgress.textContent = gp.final ? 'Final standings' : `Race ${gp.raceIndex} of ${gp.total}`;
      this.el.gpStandings.innerHTML = gp.standings.map((s, i) => `
        <div class="gp-row${s.isPlayer ? ' player' : ''}">
          <span class="gp-pos">${i + 1}</span>
          <span class="gp-who"><i>${racerIcon(s.racer)}</i><span>${s.racer.name}${s.isPlayer ? ' · you' : ''}</span></span>
          <span class="gp-pts">${s.points}</span>
        </div>`).join('');
      if (gp.final) {
        const win = gpPlace === 1;
        medal = win ? 'Cup champion!' : `P${gpPlace} overall.`;
        this.el.resultsEyebrow.textContent = 'Grand Prix complete';
        this.el.resultsTitle.textContent = medal;
        this.el.resultsTitle.style.color = win ? '#ffe27a' : '';
        this.el.resultsSub.textContent = `${gp.cup.name} · ${ordinal(gpPlace)} overall · ${playerRow.points} pts`;
        this.el.btnAgain.classList.add('hidden');
        this.el.btnNext.textContent = 'Back to Menu';
        this.el.btnTracks.textContent = 'Change Cup';
      } else {
        this.el.btnAgain.classList.add('hidden');
        this.el.btnNext.textContent = 'Next Race →';
        this.el.btnTracks.textContent = 'Quit Cup';
      }
    } else {
      this.el.gpSummary.classList.add('hidden');
      this.el.btnAgain.classList.remove('hidden');
      this.el.btnAgain.textContent = 'Race Again';
      this.el.btnNext.textContent = 'Next Circuit →';
      this.el.btnTracks.textContent = 'Change Track';
    }

    const top = result.entries.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    this.el.podium.innerHTML = order.map((e, i) => `
      <div class="podium-slot ${e.place === 1 ? 'first' : e.place === 2 ? 'second' : 'third'}" style="--pc:${hex(e.racer.color)}">
        <div class="podium-avatar">${racerIcon(e.racer)}</div>
        <span class="podium-name">${e.racer.name}</span>
        <div class="podium-bar">${e.place}</div>
      </div>`).join('');

    this.el.resultsList.innerHTML = result.entries.map((e) => `
      <div class="results-row${e.isPlayer ? ' player' : ''}">
        <span class="rr-pos">${e.place}</span>
        <span class="rr-racer"><i>${racerIcon(e.racer)}</i><span>${e.racer.name}${e.isPlayer ? ' · you' : ''}</span></span>
        <span class="rr-time">${e.finished ? '' : '~'}${formatTime(e.time)}</span>
        <span class="rr-best">${e.finished && e.bestLap ? formatTime(e.bestLap) : '—'}</span>
      </div>`).join('');

    this.el.results.classList.remove('hidden');
    this.hideMessage();
    this.hideHudFx();
  }

  hideResults() {
    this.el.results?.classList.add('hidden');
    this.el.gpSummary?.classList.add('hidden');
  }
}
