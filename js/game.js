import * as THREE from '../vendor/three.module.js';
import { TRACKS, RACERS, DIFFICULTIES, CUPS, racerById, difficultyById, cupById, trackById } from './tracks.js?v=20261108';
import { TrackWorld } from './world.js?v=20261108';
import { Race } from './race.js?v=20261108';
import { UI } from './ui.js?v=20261108';
import { Effects } from './effects.js?v=20261108';
import { GameAudio } from './audio.js?v=20261108';
import { createKart, updateKartVisual, disposeObject } from './karts.js?v=20261108';
import { GRAPHICS, qualityById, setGraphics, graphics, pixelRatioFor } from './settings.js?v=20261108';

const STORE_KEY = 'turboTales.save.v1';
const TAU = Math.PI * 2;
const EXPOSURE = { day: 1.05, dusk: 1.08, jungle: 1.03, night: 1.42, lava: 1.45 };
const GP_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

function shuffled(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return typeof data === 'object' && data ? data : {};
  } catch {
    return {};
  }
}

class TurboTales {
  constructor(store) {
    this.store = store;
    this.selectedRacer = racerById(store.racerId);
    this.raceMode = store.mode === 'gp' ? 'gp' : 'quick';
    this.selectedCup = cupById(store.cupId || 'coast');
    let initialTrack = trackById(store.trackId);
    if (this.raceMode === 'gp' && !this.selectedCup.tracks.includes(initialTrack.id)) {
      initialTrack = trackById(this.selectedCup.tracks[0]);
    }
    this.selectedTrack = initialTrack;
    this.selectedTrackId = initialTrack.id;
    this.quality = qualityById(store.quality).id;
    setGraphics(this.quality);

    this.difficulty = difficultyById(store.difficulty).id;

    this.muted = !!store.muted;
    this.musicOn = store.music !== false;
    this.sfxOn = store.sfx !== false;
    this.audioReady = false;

    this.mode = 'boot';
    this.menuClock = 0;
    this.menuKarts = [];
    this.menuFocus = new THREE.Vector3();
    this.menuFocusIndex = 0;
    this.menuSnap = true;
    this.menuLightCycle = -1;
    this.menuLoading = false;
    this.menuToken = 0;
    this.starting = false;
    this.startToken = 0;
    this.queuedStart = false;
    this.paused = false;
    this.resultsOpen = false;
    this.gp = null;
    this.keys = { up: false, down: false, left: false, right: false, drift: false };
    this.touch = { left: false, right: false, drift: false };
    this.lastTime = performance.now();

    this.hasTouch = (navigator.maxTouchPoints || 0) > 0
      || window.matchMedia?.('(pointer: coarse)').matches;

    this.audio = new GameAudio();
    this.audio.musicEnabled = this.musicOn;
    this.audio.sfxEnabled = this.sfxOn;
    this.audio.muted = this.muted;

    this.ui = new UI({
      start: () => this.startRace(),
      selectRacer: (id) => this.changeRacer(id),
      selectTrack: (id) => this.changeTrack(id),
      selectCup: (id) => this.selectCup(id),
      mode: (mode) => this.setMode(mode),
      quality: (id) => this.applyQuality(id),
      difficulty: (id) => this.changeDifficulty(id),
      toggleSound: () => this.toggleSound(),
      pause: () => this.pause(),
      resume: () => this.resume(),
      restart: () => this.restart(),
      quit: () => this.quitToMenu(),
      again: () => this.again(),
      next: () => this.nextTrack(),
      tracks: () => this.quitToMenu(),
      music: (on) => this.setMusic(on),
      sfx: (on) => this.setSfx(on),
      touchSteer: (dir, down) => {
        if (dir < 0) this.touch.left = down;
        else this.touch.right = down;
      },
      touchDrift: (down) => { this.touch.drift = down; },
      touchItem: () => {
        this.ensureAudio();
        if (this.mode === 'race' && !this.paused && !this.resultsOpen) this.race?.usePlayerItem();
      },
    });

    this.ui.setTouchMode(this.hasTouch);
    this.ui.setSoundMuted(this.muted);
    this.ui.setMusic(this.musicOn);
    this.ui.setSfx(this.sfxOn);
    this.ui.setDifficulty(this.difficulty);
    this.ui.buildCups(CUPS, this.selectedCup.id);
    this.ui.selectCup(this.selectedCup);
    this.ui.setMode(this.raceMode);
    this.ui.setQuality(this.quality);

    this.setupRenderer();
    if (this.renderer) {
      this.setupScene();
      this.bindEvents();
      this.populateMenu();
      this.ui.showLoading(`Shaping ${this.selectedTrack.name}…`);
      this.mode = 'boot';
      this.loop();
      setTimeout(() => {
        if (!this.renderer) return;
        this.buildMenuWorld(this.selectedTrack);
        this.ui.hideLoading();
        this.mode = 'menu';
      }, 80);
    }
  }

  setupRenderer() {
    const canvas = document.getElementById('view');
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch (err) {
      console.error('WebGL could not start', err);
      this.renderer = null;
      this.ui.hideLoading();
      this.ui.showWebGLFallback();
      return;
    }
    this.renderer.setPixelRatio(pixelRatioFor(graphics()));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = graphics().shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = true;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.pause();
      this.ui.showLoading('Graphics context lost — reload to continue.');
    });
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.menuCamera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 1700);
    this.menuCamera.position.set(0, 8, 20);
    this.menuCamera.lookAt(0, 1, 0);
    this.world = null;
    this.effects = null;
    this.race = null;
  }

  populateMenu() {
    this.ui.buildRacers(RACERS, this.selectedRacer.id);
    this.ui.selectRacer(this.selectedRacer);
    this.ui.buildTracks(this.menuTracks(), this.selectedTrack.id);
    this.ui.selectTrack(this.selectedTrack);
  }

  menuTracks() {
    if (this.raceMode === 'gp') {
      return this.selectedCup.tracks.map((id) => trackById(id));
    }
    return TRACKS;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.clearKeys());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearKeys();
        if (this.mode === 'race' && !this.paused && !this.resultsOpen) this.pause();
      }
    });

    const unlock = () => {
      this.ensureAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });

    window.addEventListener('beforeunload', () => this.save());
  }

  ensureAudio() {
    if (this.audioReady) return;
    this.audio.init();
    this.audioReady = true;
    this.audio.setMuted(this.muted);
    this.audio.setMusicEnabled(this.musicOn);
    this.audio.setSfxEnabled(this.sfxOn);
    this.audio.resume();
    if (this.mode === 'menu' || this.mode === 'boot') {
      this.audio.startMusic('menu');
    } else if (this.race) {
      this.audio.startMusic('race');
    }
  }

  // ───────────────────────────── save ─────────────────────────────

  save() {
    this.store.racerId = this.selectedRacer.id;
    this.store.trackId = this.selectedTrackId;
    this.store.difficulty = this.difficulty;
    this.store.quality = this.quality;
    this.store.mode = this.raceMode;
    this.store.cupId = this.selectedCup?.id || 'coast';
    this.store.muted = this.muted;
    this.store.music = this.musicOn;
    this.store.sfx = this.sfxOn;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
    } catch {
      /* Private browsing or storage full — the game still works. */
    }
  }

  // ───────────────────────────── menu ─────────────────────────────

  changeRacer(id) {
    this.selectedRacer = racerById(id);
    this.ui.selectRacer(this.selectedRacer);
    this.save();
    this.audio.select();
    if (this.mode === 'menu' && this.world) {
      this.buildMenuKarts();
      this.menuSnap = false;
    }
  }

  changeDifficulty(id) {
    const next = difficultyById(id);
    if (next.id === this.difficulty) return;
    this.difficulty = next.id;
    this.ui.setDifficulty(next.id);
    this.save();
    this.audio.select();
  }

  setMode(mode) {
    if (this.mode !== 'menu') return;
    const next = mode === 'gp' ? 'gp' : 'quick';
    this.raceMode = next;
    this.ui.setMode(next);
    this.gp = null;
    this.audio.select();

    if (next === 'gp') {
      const first = trackById(this.selectedCup.tracks[0]);
      this.ui.buildTracks(this.menuTracks(), first.id);
      this.ui.selectCup(this.selectedCup);
      this.ui.selectTrack(first, this.world?.def.id === first.id ? this.world.length : null);
      this.selectedTrack = first;
      this.selectedTrackId = first.id;
      if (this.world?.def.id !== first.id) this.loadMenuWorld(first);
    } else {
      this.ui.buildTracks(TRACKS, this.selectedTrack.id);
      this.ui.selectTrack(this.selectedTrack, this.world?.length ?? null);
    }
    this.save();
  }

  selectCup(id) {
    if (this.mode !== 'menu') return;
    const cup = cupById(id);
    if (!cup) return;
    this.raceMode = 'gp';
    this.selectedCup = cup;
    this.gp = null;
    this.ui.setMode('gp');
    this.ui.buildCups(CUPS, cup.id);
    this.ui.selectCup(cup);
    const first = trackById(cup.tracks[0]);
    this.ui.buildTracks(this.menuTracks(), first.id);
    this.selectedTrack = first;
    this.selectedTrackId = first.id;
    this.ui.selectTrack(first);
    this.audio.select();
    this.save();
    if (this.world?.def.id !== first.id) this.loadMenuWorld(first);
  }

  applyQuality(id, persist = true) {
    const q = setGraphics(id);
    this.quality = q.id;
    document.body.dataset.quality = q.id;
    if (this.renderer) {
      this.renderer.setPixelRatio(pixelRatioFor(q));
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.renderer.shadowMap.enabled = q.shadows;
      this.renderer.shadowMap.needsUpdate = true;
      const env = this.world?.def.environment || this.selectedTrack?.environment || 'day';
      this.renderer.toneMappingExposure = (EXPOSURE[env] ?? 1.05) * q.exposure;
    }
    if (this.world?.sunLight) {
      const sun = this.world.sunLight;
      const max = this.renderer?.capabilities.maxTextureSize || 4096;
      const size = Math.min(q.shadowSize, max);
      sun.castShadow = q.shadows;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
      sun.shadow.needsUpdate = true;
    }
    if (this.scene?.fog && this.world) {
      this.scene.fog.density = this.world.def.fogDensity * q.fog;
    }
    this.ui.setQuality(q.id);
    if (persist) {
      this.save();
      this.audio.select();
    }
  }

  pickOpponents() {
    const pool = RACERS.filter((r) => r.id !== this.selectedRacer.id);
    return shuffled(pool).slice(0, 7);
  }

  startGp() {
    if (!this.renderer) return;
    const cup = this.selectedCup || cupById('coast');
    const rivals = this.pickOpponents();
    const roster = [this.selectedRacer, ...rivals];
    this.raceMode = 'gp';
    this.gp = {
      cup,
      raceIndex: 0,
      roster: roster.slice(1).map((r) => r.id),
      points: Object.fromEntries(roster.map((r) => [r.id, 0])),
      races: [],
      standings: [],
    };
    this.selectedCup = cup;
    this.selectedTrack = trackById(cup.tracks[0]);
    this.selectedTrackId = this.selectedTrack.id;
    this.ui.setMode('gp');
    this.ui.selectCup(cup);
    this.startRace(cup.tracks[0]);
  }

  handleGpFinish(result) {
    const gp = this.gp;
    if (!gp) return;
    for (const entry of result.entries) {
      if (gp.points[entry.racer.id] === undefined) continue;
      gp.points[entry.racer.id] += GP_POINTS[entry.place - 1] || 0;
    }
    gp.raceIndex += 1;
    gp.races.push(result);

    const bestFinish = (id) => {
      let best = 99;
      for (const race of gp.races) {
        const row = race.entries.find((e) => e.racer.id === id);
        if (row) best = Math.min(best, row.place);
      }
      return best;
    };
    const standings = Object.entries(gp.points)
      .map(([id, points]) => ({
        racer: racerById(id),
        points,
        isPlayer: id === this.selectedRacer.id,
        bestFinish: bestFinish(id),
      }))
      .sort((a, b) => b.points - a.points || a.bestFinish - b.bestFinish || a.racer.name.localeCompare(b.racer.name));
    gp.standings = standings;

    const total = gp.cup.tracks.length;
    const final = gp.raceIndex >= total;
    this.ui.showResults(result, {
      cup: gp.cup,
      raceIndex: gp.raceIndex,
      total,
      final,
      standings,
    });

    if (final) {
      const playerRow = standings.find((s) => s.isPlayer);
      this.store.cups = this.store.cups || {};
      this.store.cups[gp.cup.id] = {
        points: gp.points[this.selectedRacer.id],
        racer: this.selectedRacer.id,
        place: standings.indexOf(playerRow) + 1,
      };
      this.save();
    }
  }

  nextGpRace() {
    if (!this.gp) {
      this.returnToMenu();
      return;
    }
    const total = this.gp.cup.tracks.length;
    if (this.gp.raceIndex < total) {
      this.ui.hideResults();
      this.resultsOpen = false;
      this.startRace(this.gp.cup.tracks[this.gp.raceIndex]);
    } else {
      this.returnToMenu();
    }
  }

  changeTrack(id) {
    const def = trackById(id);
    if (def.id === this.selectedTrackId && this.world?.def.id === def.id) {
      this.ui.selectTrack(def, this.world.length);
      return;
    }
    this.selectedTrackId = def.id;
    this.selectedTrack = def;
    this.ui.selectTrack(def);
    this.save();
    this.audio.select();
    if (this.mode === 'menu') this.loadMenuWorld(def);
  }

  loadMenuWorld(def) {
    if (!this.renderer || this.mode !== 'menu') return;
    this.menuToken += 1;
    const token = this.menuToken;
    this.menuLoading = true;
    this.ui.showLoading(`Shaping ${def.name}…`);
    setTimeout(() => {
      if (token !== this.menuToken || this.mode !== 'menu') return;
      this.buildMenuWorld(def);
      this.menuLoading = false;
      this.ui.hideLoading();
      if (this.queuedStart) {
        this.queuedStart = false;
        this.startRace();
      }
    }, 80);
  }

  buildMenuWorld(def) {
    this.disposeRace();
    this.disposeMenuKarts();
    this.effects?.dispose();
    this.effects = null;
    this.world?.dispose();
    this.world = null;

    this.world = new TrackWorld(this.scene, def);
    this.effects = new Effects(this.scene);
    this.renderer.toneMappingExposure = (EXPOSURE[def.environment] ?? 1.05) * graphics().exposure;
    if (this.scene.fog) this.scene.fog.density = def.fogDensity * graphics().fog;
    this.selectedTrack = def;
    this.selectedTrackId = def.id;
    this.menuClock = 0;
    this.menuLightCycle = -1;
    this.buildMenuKarts();
    this.menuSnap = true;
    this.ui.selectTrack(def, this.world.length);
    this.world.setStartLights(0, false);
    this.applyQuality(this.quality, false);
  }

  buildMenuKarts() {
    this.disposeMenuKarts();
    if (!this.world) return;
    const others = RACERS.filter((r) => r.id !== this.selectedRacer.id);
    const showcaseSlot = 4;
    let oi = 0;
    for (let slot = 0; slot < 8; slot++) {
      const racer = slot === showcaseSlot ? this.selectedRacer : others[oi++];
      const visual = createKart(racer, slot === showcaseSlot);
      const spot = this.world.getStartGrid(slot);
      visual.root.position.copy(spot.pos);
      visual.root.rotation.y = spot.yaw;
      this.scene.add(visual.root);
      this.menuKarts.push({ visual, slot, phase: rand(0, TAU) });
      if (slot === showcaseSlot) {
        this.menuFocus.copy(spot.pos);
        this.menuFocus.y += 1.0;
        this.menuFocusIndex = this.world.nearest(spot.pos).index;
      }
    }
    this.menuSnap = true;
  }

  disposeMenuKarts() {
    for (const m of this.menuKarts) {
      this.scene.remove(m.visual.root);
      disposeObject(m.visual.root);
    }
    this.menuKarts = [];
  }

  updateMenu(dt) {
    if (!this.world) return;
    this.menuClock += dt;
    const player = this.menuKarts.find((m) => m.slot === 4);
    const focusPos = player ? player.visual.root.position : this.menuFocus;

    this.world.update(dt, this.menuClock, focusPos);
    for (const m of this.menuKarts) {
      updateKartVisual(m.visual, {
        speed: 0,
        steer: Math.sin(this.menuClock * 0.7 + m.phase) * 0.08,
        boosting: false,
        drift: 0,
        time: this.menuClock + m.phase * 2,
        spin: 0,
      }, dt);
    }

    const cycle = Math.floor(this.menuClock / 1.4) % 4;
    if (cycle !== this.menuLightCycle) {
      this.menuLightCycle = cycle;
      this.world.setStartLights(cycle, false);
    }

    const angle = 0.7 + this.menuClock * 0.105;
    const radius = 10.4 + Math.sin(this.menuClock * 0.29) * 1.15;
    const height = 3.45 + Math.sin(this.menuClock * 0.4) * 0.32;
    const target = new THREE.Vector3(
      focusPos.x + Math.sin(angle) * radius,
      focusPos.y + height,
      focusPos.z + Math.cos(angle) * radius,
    );

    const near = this.world.nearest(target, this.menuFocusIndex, 140);
    if (target.y < near.point.y + 0.85) target.y = near.point.y + 0.85;

    if (this.menuSnap) {
      this.menuCamera.position.copy(target);
      this.menuSnap = false;
    } else {
      this.menuCamera.position.lerp(target, 1 - Math.exp(-dt * 2.4));
    }

    const look = new THREE.Vector3(focusPos.x, focusPos.y + 0.95, focusPos.z);
    this.menuCamera.lookAt(look);
    this.menuCamera.fov = 54;
    this.menuCamera.updateProjectionMatrix();
  }

  // ───────────────────────────── race lifecycle ─────────────────────────────

  prepareWorldForRace() {
    if (!this.world) return;
    this.disposeMenuKarts();
    for (const box of this.world.itemBoxes) {
      box.active = true;
      box.group.visible = true;
      box.respawnAt = 0;
    }
    for (const coin of this.world.coins) {
      coin.active = true;
      coin.mesh.visible = true;
      coin.respawnAt = 0;
    }
    this.world.setStartLights(0, false);
  }

  startRace(trackId = this.selectedTrackId) {
    if (!this.renderer) return;
    if (this.raceMode === 'gp' && !this.gp) {
      this.startGp();
      return;
    }
    if (this.starting) return;
    if (this.menuLoading) {
      this.queuedStart = true;
      return;
    }
    this.ensureAudio();
    this.ui.hideResults();
    this.ui.hidePause();
    this.resultsOpen = false;
    this.paused = false;
    this.clearKeys();
    this.touch.left = this.touch.right = this.touch.drift = false;

    const def = trackById(trackId);
    this.selectedTrack = def;
    this.selectedTrackId = def.id;
    this.save();
    this.starting = true;
    const token = ++this.startToken;
    this.ui.showLoading(`Fuelling ${def.name}…`);

    setTimeout(() => {
      if (token !== this.startToken) return;
      try {
          this.disposeRace();
          if (!this.world || this.world.def.id !== def.id) {
            this.disposeMenuKarts();
            this.effects?.dispose();
            this.effects = null;
            this.world?.dispose();
            this.world = null;
            this.world = new TrackWorld(this.scene, def);
            this.effects = new Effects(this.scene);
          } else {
            this.prepareWorldForRace();
          }
          this.renderer.toneMappingExposure = (EXPOSURE[def.environment] ?? 1.05) * graphics().exposure;
          if (this.scene.fog) this.scene.fog.density = def.fogDensity * graphics().fog;

          this.effects && (this.effects.points.visible = true);
          const opponents = this.gp
            ? this.gp.roster.map((id) => racerById(id))
            : this.pickOpponents();
          this.race = new Race({
            scene: this.scene,
            world: this.world,
            track: def,
            playerRacer: this.selectedRacer,
            opponents,
            difficulty: difficultyById(this.difficulty),
            effects: this.effects,
            audio: this.audio,
            ui: this.ui,
            onFinish: (result) => this.onRaceFinish(result),
          });
          this.race.camera.aspect = window.innerWidth / window.innerHeight;
          this.race.camera.updateProjectionMatrix();
          this.race.setTouchMode(this.hasTouch);
          this.audio.setMuted(this.muted);
          this.audio.setMusicEnabled(this.musicOn);
          this.audio.setSfxEnabled(this.sfxOn);

          this.ui.selectTrack(def, this.world.length);
          this.ui.showRace();
          this.ui.hideLoading();
          this.menuLightCycle = -1;
          this.mode = 'race';
          this.lastTime = performance.now();
        } catch (err) {
          console.error('Race failed to start', err);
          this.starting = false;
          this.mode = 'menu';
          this.ui.hideLoading();
          this.ui.showMenu();
          this.ui.message('Could not start', 'Check the browser console', 'bad', 3200);
        }
        this.starting = false;
    }, 80);
  }

  onRaceFinish(result) {
    this.resultsOpen = true;
    this.paused = false;
    this.audio.setEngine(false);
    const prev = this.store.best?.[result.track.id];
    if (!prev || result.playerTime < prev.time) {
      this.store.best = this.store.best || {};
      this.store.best[result.track.id] = {
        time: result.playerTime,
        racer: this.selectedRacer.id,
      };
      this.save();
    }
    if (this.raceMode === 'gp' && this.gp) {
      this.handleGpFinish(result);
    } else {
      this.ui.showResults(result);
    }
  }

  disposeRace() {
    if (this.race) {
      this.race.dispose();
      this.race = null;
    }
  }

  returnToMenu() {
    this.paused = false;
    this.resultsOpen = false;
    this.gp = null;
    this.disposeRace();
    this.ui.hidePause();
    this.ui.hideResults();
    this.ui.showMenu();
    this.ui.hideMessage();
    this.ui.hideHudFx();
    this.clearKeys();
    this.touch.left = this.touch.right = this.touch.drift = false;

    if (!this.world) {
      this.mode = 'menu';
      this.loadMenuWorld(trackById(this.selectedTrackId));
      this.audio.startMusic('menu');
      return;
    }

    this.prepareWorldForRace();
    this.buildMenuKarts();
    this.menuSnap = true;
    this.mode = 'menu';
    this.ui.selectTrack(trackById(this.selectedTrackId), this.world.length);
    this.audio.setEngine(false);
    this.audio.startMusic('menu');
  }

  restart() {
    this.ui.hidePause();
    this.ui.hideResults();
    this.paused = false;
    this.resultsOpen = false;
    this.startRace(this.selectedTrackId);
  }

  again() {
    this.ui.hideResults();
    this.resultsOpen = false;
    if (this.raceMode === 'gp' && this.gp) {
      this.nextGpRace();
      return;
    }
    this.startRace(this.selectedTrackId);
  }

  nextTrack() {
    if (this.raceMode === 'gp' && this.gp) {
      this.nextGpRace();
      return;
    }
    const idx = TRACKS.findIndex((t) => t.id === this.selectedTrackId);
    const next = TRACKS[(idx + 1) % TRACKS.length];
    this.ui.hideResults();
    this.resultsOpen = false;
    this.selectedTrack = next;
    this.selectedTrackId = next.id;
    this.ui.selectTrack(next);
    this.save();
    this.startRace(next.id);
  }

  quitToMenu() {
    this.returnToMenu();
  }

  pause() {
    if (this.mode !== 'race' || this.paused || this.resultsOpen || this.starting) return;
    this.paused = true;
    this.audio.setEngine(false);
    this.ui.showPause(this.selectedTrack, this.selectedRacer);
    this.clearKeys();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.ui.hidePause();
    this.audio.setEngine(true, 0, false, false);
    this.lastTime = performance.now();
  }

  // ───────────────────────────── input ─────────────────────────────

  onKeyDown(e) {
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = true;
    else if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = true;
    else if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
    else if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.drift = true;

    if (e.repeat) return;

    const helpOpen = !this.ui.el.help.classList.contains('hidden');
    if (code === 'Space') {
      this.ensureAudio();
      if (this.mode === 'race' && !this.paused && !this.resultsOpen) {
        this.race?.usePlayerItem();
      }
    } else if (code === 'KeyR') {
      if (this.mode === 'race' && !this.paused && !this.resultsOpen) this.race?.resetPlayer();
    } else if (code === 'Escape') {
      if (helpOpen) this.ui.closeHelp();
      else if (this.resultsOpen) this.returnToMenu();
      else if (this.paused) this.resume();
      else if (this.mode === 'race') this.pause();
    } else if (code === 'KeyM') {
      this.toggleSound();
    } else if (code === 'Enter') {
      if (helpOpen) {
        this.ui.closeHelp();
      } else if (this.mode === 'menu' && !this.starting) {
        this.startRace();
      } else if (this.resultsOpen) {
        this.again();
      } else if (this.paused) {
        this.resume();
      }
    }
  }

  onKeyUp(e) {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = false;
    else if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = false;
    else if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
    else if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.drift = false;
  }

  clearKeys() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.drift = false;
  }

  updatePlayerInput() {
    if (!this.race) return;
    const k = this.keys;
    const t = this.touch;
    const keyboardSteer = (k.left ? 1 : 0) - (k.right ? 1 : 0);
    const touchSteer = (t.left ? 1 : 0) - (t.right ? 1 : 0);
    const steer = clamp(keyboardSteer + touchSteer, -1, 1);
    const throttle = this.hasTouch ? 1 : (k.up ? 1 : 0);
    const brake = this.hasTouch ? 0 : (k.down ? 1 : 0);
    const drift = k.drift || t.drift;
    this.race.setPlayerInput({ throttle, brake, steer, drift });
  }

  // ───────────────────────────── settings ─────────────────────────────

  toggleSound() {
    this.muted = !this.muted;
    this.ensureAudio();
    this.audio.setMuted(this.muted);
    this.ui.setSoundMuted(this.muted);
    this.audio.click();
    this.save();
  }

  setMusic(on) {
    this.musicOn = on;
    this.audio.setMusicEnabled(on);
    this.save();
  }

  setSfx(on) {
    this.sfxOn = on;
    this.audio.setSfxEnabled(on);
    this.save();
  }

  // ───────────────────────────── loop ─────────────────────────────

  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(pixelRatioFor(graphics()));
    this.renderer.setSize(w, h, false);
    this.menuCamera.aspect = w / h;
    this.menuCamera.updateProjectionMatrix();
    if (this.race) {
      this.race.camera.aspect = w / h;
      this.race.camera.updateProjectionMatrix();
    }
  }

  loop(now = performance.now()) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (!this.renderer) return;

    if (this.mode === 'boot') {
      this.renderer.render(this.scene, this.menuCamera);
      return;
    }

    if (this.mode === 'menu') {
      this.updateMenu(dt);
      this.renderer.render(this.scene, this.menuCamera);
      return;
    }

    if (this.mode === 'race') {
      if (!this.paused) {
        this.updatePlayerInput();
        this.race?.update(dt);
        if (this.race && !this.resultsOpen) {
          this.ui.updateHUD(this.race.getHUD(), this.race);
        }
      }
      if (this.race) this.renderer.render(this.scene, this.race.camera);
      else this.renderer.render(this.scene, this.menuCamera);
    }
  }
}

try {
  const app = new TurboTales(loadStore());
  window.turboTales = app;
} catch (err) {
  console.error('Turbo Tales failed to initialise', err);
  const fallback = document.getElementById('webgl-fallback');
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');
  if (fallback) fallback.classList.remove('hidden');
}
