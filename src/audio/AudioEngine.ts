// Procedural ambient audio — no audio files at all (license-clear by
// construction). Everything is synthesized with the Web Audio API:
//  • water bed: looping brown noise through a low-pass filter (deep rumble)
//  • filter hum: a faint 90 Hz tone with slow amplitude wobble
//  • bubbler: randomly scheduled little sine "blips" with rising pitch —
//    surprisingly convincing bubble pops
//  • optional music: a slow generative pad (detuned sines, gentle chord drift)
//
// Autoplay policy: the AudioContext starts suspended; we resume() only inside
// a user gesture (the audio toggle). Muted by default.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bubbleTimer: number | null = null;
  private musicTimer: number | null = null;
  private started = false;
  volume = 0.6;

  // Must be called from a click/tap handler (browser gesture requirement).
  async start(): Promise<void> {
    if (this.started) {
      await this.ctx?.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      await this.ctx.resume();
    } catch {
      return; // no audio support — the aquarium stays silent, nothing breaks
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume * 0.5;
    this.master.connect(ctx.destination);

    // — Water bed: brown noise → lowpass 220 Hz —
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // Brown noise = integrated white noise; sounds like deep moving water.
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.5;
    noise.connect(lp).connect(bedGain).connect(this.master);
    noise.start();

    // — Filter hum: quiet 90 Hz sine with slow wobble —
    const hum = ctx.createOscillator();
    hum.frequency.value = 90;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.015;
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 0.4;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 0.006;
    wobble.connect(wobbleGain).connect(humGain.gain);
    hum.connect(humGain).connect(this.master);
    hum.start(); wobble.start();

    // — Bubbler: schedule random bubble blips forever —
    const scheduleBubble = () => {
      if (!this.ctx || this.ctx.state !== 'running') {
        this.bubbleTimer = window.setTimeout(scheduleBubble, 400);
        return;
      }
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f0 = 380 + Math.random() * 500;
      o.frequency.setValueAtTime(f0, t);
      // A real bubble's resonant frequency rises as it rises & shrinks.
      o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.6), t + 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.02, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05);
      o.connect(g).connect(this.master!);
      o.start(t); o.stop(t + 0.14);
      this.bubbleTimer = window.setTimeout(scheduleBubble, 60 + Math.random() * 260);
    };
    scheduleBubble();

    // — Music pad (off until enabled) —
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    const chordRoots = [220, 174.61, 196, 146.83]; // A, F, G, D — gentle loop
    let chordIdx = 0;
    const playChord = () => {
      if (!this.ctx) return;
      const t = ctx.currentTime;
      const root = chordRoots[chordIdx % chordRoots.length];
      chordIdx++;
      for (const ratio of [1, 1.5, 2, 2.4]) { // root, fifth, octave, ~tenth
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = root * ratio * (1 + (Math.random() - 0.5) * 0.003); // slight detune
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03 / ratio, t + 4);
        g.gain.linearRampToValueAtTime(0, t + 11);
        o.connect(g).connect(this.musicGain!);
        o.start(t); o.stop(t + 12);
      }
      this.musicTimer = window.setTimeout(playChord, 8000);
    };
    playChord();

    this.started = true;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(v * 0.5, this.ctx.currentTime + 0.15);
    }
  }

  setMusic(on: boolean): void {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.linearRampToValueAtTime(on ? 1 : 0, this.ctx.currentTime + 2);
    }
  }

  async setEnabled(on: boolean): Promise<void> {
    if (on) await this.start();
    else await this.ctx?.suspend();
  }
}

export const audioEngine = new AudioEngine();
