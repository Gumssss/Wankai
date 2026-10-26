export class GameAudio {
  constructor() { this.enabled = true; this.context = null; this.clashBuffer = null; this.clashLoading = null; }

  async unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!this.context) {
        this.context = new Context();
        this.master = this.context.createGain(); this.master.gain.value = 0.36;
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.master.connect(this.compressor); this.compressor.connect(this.context.destination);
        const size = this.context.sampleRate;
        this.noise = this.context.createBuffer(1, size, this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < size; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      void this.loadClash();
    } catch { /* Audio is optional; denied audio permissions never block play. */ }
  }

  loadClash() {
    if (this.clashBuffer || this.clashLoading || !this.context) return this.clashLoading;
    const base = import.meta.env?.BASE_URL ?? '/';
    this.clashLoading = fetch(`${base}audio/sfx/weapon-clash.m4a`)
      .then(response => { if (!response.ok) throw new Error('Audio unavailable'); return response.arrayBuffer(); })
      .then(data => this.context.decodeAudioData(data))
      .then(buffer => { this.clashBuffer = buffer; })
      .catch(() => { /* Keep the synthesized clash when the asset cannot load. */ })
      .finally(() => { this.clashLoading = null; });
    return this.clashLoading;
  }

  playClash(strength) {
    if (!this.clashBuffer || !this.enabled || this.context?.state !== 'running') return false;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = this.clashBuffer;
    gain.gain.value = 0.65 + Math.min(1, Math.max(0, strength)) * 0.35;
    source.connect(gain); gain.connect(this.master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
    return true;
  }

  tone(start, end, duration, volume = 0.3, type = 'sine') {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const t = this.context.currentTime;
    const osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  noiseBurst(duration, frequency, volume) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const t = this.context.currentTime;
    const noise = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    noise.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.001, t); gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(this.master);
    noise.start(t); noise.stop(t + duration);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  impact(e) {
    if (e.type === 'clash') {
      if (this.playClash(e.strength)) return;
      this.tone(850, 320, 0.16, 0.16 + e.strength * 0.18, 'triangle');
      this.noiseBurst(0.09, 2600, 0.3);
    } else {
      this.tone(160 - e.strength * 30, 40, 0.2, 0.35 + e.strength * 0.45);
      this.tone(380, 110, 0.09, 0.16, 'triangle');
      this.noiseBurst(0.12 + e.strength * 0.08, 750, 0.3 + e.strength * 0.4);
    }
  }

  tick(final = false) { this.tone(final ? 640 : 360, final ? 850 : 280, final ? 0.28 : 0.13, 0.17, 'triangle'); }

}
