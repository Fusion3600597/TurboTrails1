/* Tiny procedural sound engine: no samples, no downloads. */

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.started = false;
    this.muted = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicTimer = null;
    this.step = 0;
    this.mode = 'menu';
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? 0.19 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? 0.55 : 0;
    this.sfxGain.connect(this.master);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.sfxGain);
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 550;
    this.engineFilter.Q.value = 3.5;
    this.engineFilter.connect(this.engineGain);
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 68;
    this.engineOsc.connect(this.engineFilter);
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'square';
    this.engineSub.frequency.value = 34;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.35;
    this.engineSub.connect(subGain);
    subGain.connect(this.engineFilter);
    this.engineOsc.start();
    this.engineSub.start();
    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.65, this.ctx.currentTime, 0.04);
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(on ? 0.19 : 0, this.ctx.currentTime, 0.06);
    }
  }

  setSfxEnabled(on) {
    this.sfxEnabled = on;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.06);
    }
  }

  tone(freq, dur, type = 'square', gain = 0.2, when = null, slide = 0, dest = null) {
    if (!this.ctx) return;
    const t = when ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, gain = 0.2, highpass = 400) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start();
  }

  select() {
    this.init();
    this.tone(620, 0.08, 'square', 0.1);
    this.tone(930, 0.11, 'square', 0.08, this.ctx.currentTime + 0.05);
  }

  click() {
    this.init();
    this.tone(410, 0.05, 'triangle', 0.09);
  }

  countdown(n) {
    this.init();
    if (n > 0) this.tone(440, 0.16, 'square', 0.22);
    else {
      this.tone(880, 0.5, 'square', 0.26);
      this.tone(1320, 0.5, 'triangle', 0.12);
    }
  }

  lap(final = false) {
    this.init();
    const notes = final ? [72, 76, 79, 84, 88] : [72, 79, 84];
    notes.forEach((n, i) => {
      this.tone(midi(n), 0.16, 'square', 0.14, this.ctx.currentTime + i * 0.09);
    });
  }

  pickup() {
    this.init();
    this.tone(840, 0.08, 'square', 0.14);
    this.tone(1260, 0.12, 'square', 0.1, this.ctx.currentTime + 0.06);
  }

  boost() {
    this.init();
    this.tone(140, 0.55, 'sawtooth', 0.18, null, 780);
    this.noise(0.38, 0.1, 800);
  }

  item() {
    this.init();
    this.tone(1160, 0.07, 'square', 0.14);
    this.tone(1480, 0.08, 'square', 0.13, this.ctx.currentTime + 0.05);
    this.tone(1880, 0.11, 'square', 0.1, this.ctx.currentTime + 0.1);
  }

  hit() {
    this.init();
    this.noise(0.3, 0.28, 100);
    this.tone(80, 0.32, 'sawtooth', 0.3, null, -40);
  }

  bump() {
    this.init();
    this.noise(0.12, 0.15, 140);
    this.tone(95, 0.1, 'triangle', 0.15, null, -30);
  }

  finish(win) {
    this.init();
    const base = win ? 72 : 60;
    const seq = win ? [72, 76, 79, 84, 79, 84, 88] : [60, 64, 67, 72];
    seq.forEach((n, i) => {
      this.tone(midi(n), 0.24, 'square', 0.15, this.ctx.currentTime + i * 0.13);
      this.tone(midi(n - 12), 0.24, 'triangle', 0.08, this.ctx.currentTime + i * 0.13);
    });
  }

  setEngine(on, speed = 0, boosting = false, drifting = false) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const targetGain = on ? (this.muted ? 0 : 0.032) : 0;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.06);
    const f = 62 + speed * 5.4 + (boosting ? 40 : 0);
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.05);
    this.engineSub.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(420 + speed * 14 + (boosting ? 500 : 0), t, 0.05);
    if (drifting) this.engineFilter.Q.setTargetAtTime(6, t, 0.08);
  }

  startMusic(mode = 'race') {
    this.init();
    this.mode = mode;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.step = 0;
    const race = [
      76, 0, 79, 0, 84, 0, 79, 0, 74, 0, 77, 0, 81, 0, 77, 0,
      72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 81, 0, 84, 0,
    ];
    const menu = [
      72, 0, 76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 72, 0, 67, 0,
      69, 0, 72, 0, 76, 0, 81, 0, 76, 0, 72, 0, 69, 0, 64, 0,
    ];
    const bass = mode === 'race' ? [48, 48, 55, 50, 48, 55, 43, 46] : [48, 45, 41, 43];
    const pattern = mode === 'race' ? race : menu;
    const interval = mode === 'race' ? 145 : 220;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const s = this.step % pattern.length;
      const note = pattern[s];
      const t = this.ctx.currentTime + 0.02;
      if (note) {
        this.tone(midi(note), interval / 1000 * 0.8, 'square', 0.075, t, 0, this.musicGain);
        this.tone(midi(note + 12), interval / 1000 * 0.4, 'triangle', 0.018, t, 0, this.musicGain);
      }
      if (s % 4 === 0) {
        const b = bass[(this.step / 4) % bass.length | 0];
        this.tone(midi(b), interval / 1000 * 2.6, 'triangle', 0.08, t, 0, this.musicGain);
      }
      if (s % 2 === 0) {
        this.tone(110, 0.06, 'sine', 0.045, t, 0, this.musicGain);
      }
      this.step++;
    }, interval);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
