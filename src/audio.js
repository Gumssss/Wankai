export class GameAudio {
  constructor() { this.enabled = true; this.context = null; this.lastWhoosh = [0, 0]; }

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
    } catch { /* Audio is optional; denied audio permissions never block play. */ }
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
      this.tone(850, 320, 0.16, 0.16 + e.strength * 0.18, 'triangle');
      this.noiseBurst(0.09, 2600, 0.3);
    } else {
      this.tone(160 - e.strength * 30, 40, 0.2, 0.35 + e.strength * 0.45);
      this.tone(380, 110, 0.09, 0.16, 'triangle');
      this.noiseBurst(0.12 + e.strength * 0.08, 750, 0.3 + e.strength * 0.4);
    }
  }

  tick(final = false) { this.tone(final ? 640 : 360, final ? 850 : 280, final ? 0.28 : 0.13, 0.17, 'triangle'); }

  swing(id, speed, time) {
    if (speed > 8 && time - this.lastWhoosh[id] > 0.5) {
      this.lastWhoosh[id] = time;
      this.noiseBurst(0.2, 1100, Math.min(0.13, speed * 0.007));
    }
  }
}
