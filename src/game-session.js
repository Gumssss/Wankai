import { ArenaPhysics, CONFIG } from './physics.js';
import { GameAudio } from './audio.js';

export const CONTROL_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export class GameSession {
  constructor() {
    this.world = new ArenaPhysics();
    this.sound = new GameAudio();
    this.keys = new Set();
    this.listeners = new Set();
    this.state = 'lobby';
    this.previousState = 'playing';
    this.practice = false;
    this.mode = 'duel';
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.countdownNumber = -1;
    this.endTimer = 0;
    this.readoutTimer = 0;
    this.nextEffectId = 0;
    this.effects = [];
    this.readout = null;
    this.visualRevision = 0;
    this.error = null;
    this.snapshot = this.makeSnapshot();
  }

  subscribe = listener => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  makeSnapshot() {
    return {
      state: this.state,
      practice: this.practice,
      mode: this.mode,
      pressed: [...this.keys],
      health: this.world.players.map(player => player.health),
      seconds: Math.floor(this.world.time),
      winner: this.world.winner,
      countdownText: this.state === 'countdown' ? (this.countdownNumber > 0 ? String(this.countdownNumber) : '') :
        this.state === 'playing' && this.countdown < 0 ? '抡起来' : '',
      readout: this.readout,
      effects: [...this.effects],
      soundEnabled: this.sound.enabled,
      error: this.error,
    };
  }

  publish() {
    const next = this.makeSnapshot();
    const before = this.snapshot;
    if (JSON.stringify(next) === JSON.stringify(before)) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  getInputs() {
    const first = { theta: Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')), phi: Number(this.keys.has('KeyA')) - Number(this.keys.has('KeyD')) };
    if (this.mode === 'solo') return [first];
    return [
      first,
      this.practice ? { theta: 0, phi: 0 } : {
        theta: Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp')),
        phi: Number(this.keys.has('ArrowLeft')) - Number(this.keys.has('ArrowRight')),
      },
    ];
  }

  syncPolarInputs() {
    this.getInputs().forEach((input, id) => this.world.setPolarInput(id, input.theta));
  }

  keyDown(code) {
    if (!CONTROL_KEYS.has(code) || (this.state !== 'playing' && this.state !== 'countdown')) return;
    if (this.mode === 'solo' && code.startsWith('Arrow')) return;
    if (this.keys.has(code)) return;
    this.keys.add(code);
    this.syncPolarInputs();
    this.publish();
  }

  keyUp(code) {
    if (!this.keys.delete(code)) return;
    this.syncPolarInputs();
    this.publish();
  }

  clearKeys() {
    if (this.keys.size === 0) return;
    this.keys.clear();
    this.syncPolarInputs();
    this.publish();
  }

  startRound(mode = this.mode) {
    this.mode = typeof mode === 'boolean' ? (mode ? 'practice' : 'duel') : mode;
    if (!['duel', 'practice', 'solo'].includes(this.mode)) throw new Error(`Unknown game mode: ${this.mode}`);
    this.practice = this.mode === 'practice';
    void this.sound.unlock();
    this.sound.lastWhoosh = [0, 0];
    this.clearKeys();
    this.world.reset(this.practice, this.mode === 'solo');
    this.visualRevision++;
    this.effects = [];
    this.readout = null;
    this.readoutTimer = 0;
    this.accumulator = 0;
    this.freeze = 0;
    this.state = 'countdown';
    this.countdown = 2.4;
    this.countdownNumber = -1;
    this.error = null;
    this.publish();
  }

  goHome() {
    this.state = 'lobby';
    this.clearKeys();
    this.mode = 'duel';
    this.practice = false;
    this.world.reset();
    this.visualRevision++;
    this.effects = [];
    this.readout = null;
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.publish();
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'countdown') return;
    this.previousState = this.state;
    this.state = 'paused';
    this.clearKeys();
    this.accumulator = 0;
    this.publish();
  }

  resume() {
    if (this.state !== 'paused' || this.error) return;
    this.state = this.previousState;
    this.accumulator = 0;
    this.publish();
  }

  toggleSound() {
    this.sound.enabled = !this.sound.enabled;
    if (this.sound.enabled) { void this.sound.unlock(); this.sound.tick(); }
    this.publish();
  }

  contextLost() {
    this.pause();
    this.error = '图形上下文已中断，请重新加载游戏。';
    this.publish();
  }

  impact(event) {
    this.sound.impact(event);
    if (event.type !== 'hit') return;
    this.freeze = Math.max(this.freeze, 0.028 + event.strength * 0.055);
    this.effects.push({ id: ++this.nextEffectId, point: { ...event.point }, damage: event.damage, life: 0.95, maxLife: 0.95 });
    this.readout = {
      label: event.damage >= 22 ? '漂亮的一棍' : '有效命中',
      damage: event.damage,
      detail: `${event.speed.toFixed(1)} m/s · 发力加成 ${Math.round(30 * Math.min(event.acceleration / 48, 1))}%`,
    };
    this.readoutTimer = 3;
    this.publish();
  }

  finishRound() {
    this.state = 'result';
    this.clearKeys();
    this.sound.tone(440, 660, 0.4, 0.2, 'triangle');
    this.publish();
  }

  tick(rawDelta) {
    const dt = Math.min(rawDelta, 0.06);
    const impacts = [];
    if (this.state === 'countdown') {
      this.countdown -= dt;
      const number = Math.ceil(this.countdown / 0.8);
      if (number !== this.countdownNumber && number > 0) {
        this.countdownNumber = number;
        this.sound.tick();
        this.publish();
      }
      if (this.countdown <= 0) {
        this.state = 'playing';
        this.accumulator = 0;
        this.countdown = -0.55;
        this.sound.tick(true);
        this.publish();
      }
    } else if (this.state === 'playing') {
      if (this.countdown < 0) {
        this.countdown += dt;
        if (this.countdown >= 0) this.publish();
      }
      if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
      else {
        this.accumulator += dt;
        const inputs = this.getInputs();
        let steps = 0;
        while (this.accumulator >= CONFIG.step && steps++ < 12) {
          this.world.step(inputs);
          this.accumulator -= CONFIG.step;
          for (const event of this.world.events) { impacts.push(event); this.impact(event); }
          if (this.world.winner !== null) {
            this.state = 'ending'; this.endTimer = 0.7;
            this.clearKeys(); this.accumulator = 0; break;
          }
          if (this.freeze > 0) { this.accumulator = 0; break; }
        }
        for (const player of this.world.players) this.sound.swing(player.id, player.contactSpeed, this.world.time);
      }
      this.publish();
    } else if (this.state === 'ending') {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.finishRound();
    }
    const effectDt = this.state === 'paused' ? 0 : dt;
    if (this.readoutTimer > 0) {
      this.readoutTimer -= effectDt;
      if (this.readoutTimer <= 0) { this.readout = null; this.publish(); }
    }
    if (this.effects.length) {
      for (const effect of this.effects) effect.life -= effectDt;
      const before = this.effects.length;
      this.effects = this.effects.filter(effect => effect.life > 0);
      if (this.effects.length !== before) this.publish();
    }
    return impacts;
  }
}
