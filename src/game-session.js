import { ArenaPhysics, CONFIG, MATCH_ARENA_SCALE } from './physics.js';
import { GameAudio } from './audio.js';
import {DEFAULT_LOADOUTS,normalizeLoadout,isEarLoadout} from './loadouts.js';

// One local fighter per machine. The opponent is driven by the AI (or, later, the network).
export const MATCH_MODES = Object.freeze(['ai']);
export const CONTROL_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF']);

export class GameSession {
  constructor() {
    this.world = new ArenaPhysics();
    this.sound = new GameAudio();
    this.keys = new Set();
    this.listeners = new Set();
    this.state = 'lobby';
    this.previousState = 'playing';
    this.mode = MATCH_MODES[0];
    this.localPlayerId = 0;
    // Camera yaw the local body turns toward; written by the renderer each frame.
    this.localFaceYaw = null;
    // A skill press between frames still triggers on the next physics step.
    this.skillTap = false;
    this.loadouts=DEFAULT_LOADOUTS.map(p=>Object.freeze({...p}));
    this.world.reset(...this.loadouts, { arenaScale: MATCH_ARENA_SCALE });
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.countdownNumber = -1;
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
      mode: this.mode,
      localPlayerId: this.localPlayerId,
      loadouts: Object.freeze(this.loadouts.map(p=>Object.freeze({...p}))),
      pressed: [...this.keys],
      health: this.world.players.map(player => player.health),
      stamina: this.world.players.map(player => player.stamina),
      skills: this.world.players.map(player=>({active:player.skillActive,remaining:player.skillRemaining})),
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

  localInput() {
    const input = { theta: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')), phi: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) };
    if(isEarLoadout(this.loadouts[this.localPlayerId])&&this.keys.has('KeyF'))input.skill=true;
    if(this.skillTap)input.skillTap=true;
    if(Number.isFinite(this.localFaceYaw))input.faceYaw=this.localFaceYaw;
    return input;
  }

  // Until the AI controller lands, the opponent stands idle.
  opponentInput() { return { theta: 0, phi: 0 }; }

  getInputs() {
    const inputs = [];
    inputs[this.localPlayerId] = this.localInput();
    inputs[1 - this.localPlayerId] = this.opponentInput();
    return inputs;
  }

  syncPolarInputs() {
    this.getInputs().forEach((input, id) => {
      if (this.world.winner === null || id === this.world.winner) this.world.setPolarInput(id, input.theta);
    });
  }

  keyDown(code) {
    if (!CONTROL_KEYS.has(code) || (this.state !== 'playing' && this.state !== 'countdown' && this.state !== 'result')) return;
    // After the round only the winner keeps moving.
    if (this.state === 'result' && this.world.winner !== this.localPlayerId) return;
    if(code==='KeyF'&&!isEarLoadout(this.loadouts[this.localPlayerId]))return;
    if (this.keys.has(code)) return;
    this.keys.add(code);
    if(code==='KeyF')this.skillTap=true;
    this.syncPolarInputs();
    this.publish();
  }

  keyUp(code) {
    if (!this.keys.delete(code)) return;
    this.syncPolarInputs();
    this.publish();
  }

  clearKeys() {
    this.skillTap=false;
    if (this.keys.size === 0) return;
    this.keys.clear();
    this.syncPolarInputs();
    this.publish();
  }

  setLoadouts(values) {
    if(this.state!=='lobby'||!Array.isArray(values)||values.length!==2)return false;
    let next;try{next=values.map(value=>Object.freeze(normalizeLoadout(value)));}catch{return false;}
    if(next.every((p,id)=>p.characterId===this.loadouts[id].characterId&&p.weaponId===this.loadouts[id].weaponId))return true;
    this.loadouts=next;
    this.world.reset(...this.loadouts,{arenaScale:MATCH_ARENA_SCALE});
    this.visualRevision++;this.publish();return true;
  }

  startRound(mode = this.mode) {
    if (!MATCH_MODES.includes(mode)) throw new Error(`Unknown game mode: ${mode}`);
    this.mode = mode;
    void this.sound.unlock();
    this.clearKeys();
    this.world.reset(...this.loadouts, { arenaScale: MATCH_ARENA_SCALE });
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
    this.world.reset(...this.loadouts, { arenaScale: MATCH_ARENA_SCALE });
    this.visualRevision++;
    this.effects = [];
    this.readout = null;
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.publish();
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'countdown' && this.state !== 'result') return;
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
      label: event.damage >= 22 ? '漂亮的一击' : '有效命中',
      damage: event.damage,
      detail: `${event.speed.toFixed(1)} m/s · 发力加成 ${Math.round(30 * Math.min(event.acceleration / 48, 1))}%${event.turnShare > 0.01 ? ' · 横转伤害降低' : ''}`,
    };
    this.readoutTimer = 3;
    this.publish();
  }

  // A tap reaches exactly one physics step.
  consumeSkillTap(inputs) {
    for (const input of inputs) if (input) delete input.skillTap;
    this.skillTap = false;
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
          this.consumeSkillTap(inputs);
          this.accumulator -= CONFIG.step;
          for (const event of this.world.events) { impacts.push(event); this.impact(event); }
          if (this.world.winner !== null) {
            this.accumulator = 0; this.finishRound(); break;
          }
          if (this.freeze > 0) { this.accumulator = 0; break; }
        }
      }
      this.publish();
    } else if (this.state === 'result') {
      this.accumulator += dt;
      const inputs = this.getInputs();
      let steps = 0;
      while (this.accumulator >= CONFIG.step && steps++ < 12) {
        this.world.step(inputs);
        this.consumeSkillTap(inputs);
        this.accumulator -= CONFIG.step;
      }
      this.publish();
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
