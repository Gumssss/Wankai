import { ArenaPhysics, CONFIG, WEAPONS, arenaScaleForMode } from './physics.js';
import { GameAudio } from './audio.js';
import {DEFAULT_LOADOUTS,normalizeLoadout,isEarLoadout} from './loadouts.js';
import {ROUND_RULES,ROTOR_RESOURCE} from './combat-settings.js';

export const CAMERA_KEYS = new Set(['KeyQ', 'KeyE', 'Period', 'Slash']);

export const CONTROL_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'ShiftRight',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ...CAMERA_KEYS,
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
    this.loadouts=DEFAULT_LOADOUTS.map(p=>Object.freeze({...p}));
    this.world.reset(false, false, ...this.loadouts, arenaScaleForMode(this.mode));
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.countdownNumber = -1;
    this.endTimer = 0;
    this.readoutTimer = 0;
    this.readoutTimers = [0, 0];
    this.readouts = [null, null];
    this.nextEffectId = 0;
    this.effects = [];
    this.readout = null;
    this.visualRevision = 0;
    this.error = null;
    this.snapshot = this.makeSnapshot();
  }

  get weapon(){return this.loadouts[0].weaponId;}
  get secondWeapon(){return this.loadouts[1].weaponId;}

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
      loadouts: Object.freeze(this.loadouts.map(p=>Object.freeze({...p}))),
      weapon: this.weapon,
      weapons: [this.weapon, this.secondWeapon],
      pressed: [...this.keys],
      health: this.world.players.map(player => player.health),
      maxHealth: this.world.players.map(player => player.maxHealth),
      stamina: this.world.players.map(player => player.stamina),
      skills: this.world.players.map(player=>({active:player.skillActive,remaining:player.skillRemaining,
        retracting:!player.skillActive&&player.earSpread>.001,
        ready:isEarLoadout(player)&&!player.skillActive&&player.earSpread<=.001&&player.stamina>=ROTOR_RESOURCE.activationMinimum})),
      seconds: Math.floor(this.world.time),
      remainingSeconds:Math.max(0,Math.ceil(ROUND_RULES.duration-this.world.time-1e-8)),
      pressure:{...this.world.pressure,outside:this.world.players.map(p=>p.zoneOutside),
        warning: this.world.players.map(p=>p.zoneOutside>0&&p.zoneOutside<ROUND_RULES.outsideGrace)},
      winner: this.world.winner,
      endReason:this.world.endReason,
      countdownText: this.state === 'countdown' ? (this.countdownNumber > 0 ? String(this.countdownNumber) : '') :
        this.state === 'playing' && this.countdown < 0 ? '抡起来' : '',
      readout: this.readout,
      readouts: [...this.readouts],
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
    const first = { theta: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')), phi: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) };
    if(isEarLoadout(this.loadouts[0])&&this.keys.has('KeyF'))first.skill=true;
    if (this.mode === 'solo') return [first];
    return [
      first,
      this.practice ? { theta: 0, phi: 0 } : {
        theta: Number(this.keys.has('ArrowUp')) - Number(this.keys.has('ArrowDown')),
        phi: Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft')),
        ...(isEarLoadout(this.loadouts[1])&&this.keys.has('ShiftRight')?{skill:true}:{}),
      },
    ];
  }

  getCameraInputs() {
    if (this.mode !== 'duel') return [0, 0];
    return [
      Number(this.keys.has('KeyE')) - Number(this.keys.has('KeyQ')),
      Number(this.keys.has('Slash')) - Number(this.keys.has('Period')),
    ];
  }

  syncPolarInputs() {
    this.getInputs().forEach((input, id) => this.world.setPolarInput(id, input.theta));
  }

  keyDown(code) {
    if (!CONTROL_KEYS.has(code) || (this.state !== 'playing' && this.state !== 'countdown')) return;
    if (this.mode === 'solo' && code.startsWith('Arrow')) return;
    if(code==='KeyF'&&!isEarLoadout(this.loadouts[0]))return;
    if(code==='ShiftRight'&&(!isEarLoadout(this.loadouts[1])||this.mode==='solo'||this.practice))return;
    if (CAMERA_KEYS.has(code) && this.mode !== 'duel') return;
    if (this.keys.has(code)) return;
    this.keys.add(code);
    if(code==='KeyF'||code==='ShiftRight')this.world.players[code==='KeyF'?0:1].skillRequested=true;
    this.syncPolarInputs();
    this.publish();
  }

  keyUp(code) {
    if (!this.keys.delete(code)) return;
    this.syncPolarInputs();
    this.publish();
  }

  clearKeys() {
    for(const player of this.world.players)player.skillRequested=false;
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
    this.world.reset(false,false,...this.loadouts,arenaScaleForMode(this.mode));
    this.visualRevision++;this.publish();return true;
  }

  setWeapon(weapon, playerId = 0) {
    if(![0,1].includes(playerId))return false;
    let next;try{next=weapon==='beagle'||weapon==='long-ears'?normalizeLoadout(weapon):normalizeLoadout({...this.loadouts[playerId],weaponId:weapon});}catch{return false;}
    return this.setLoadouts(this.loadouts.map((p,id)=>id===playerId?next:p));
  }

  startRound(mode = this.mode) {
    this.mode = typeof mode === 'boolean' ? (mode ? 'practice' : 'duel') : mode;
    if (!['duel', 'duel-fixed', 'practice', 'solo'].includes(this.mode)) throw new Error(`Unknown game mode: ${this.mode}`);
    this.practice = this.mode === 'practice';
    void this.sound.unlock();
    this.sound.lastWhoosh = [0, 0];
    this.clearKeys();
    this.world.reset(this.practice, this.mode === 'solo', ...this.loadouts, arenaScaleForMode(this.mode));
    this.visualRevision++;
    this.effects = [];
    this.readout = null;
    this.readoutTimer = 0;
    this.readoutTimers = [0, 0];
    this.readouts = [null, null];
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
    this.readoutTimer = 0;
    this.readoutTimers = [0, 0];
    this.readouts = [null, null];
    this.clearKeys();
    this.mode = 'duel';
    this.practice = false;
    this.world.reset(false, false, ...this.loadouts, arenaScaleForMode(this.mode));
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
    const attacker = [0,1].includes(event.attacker) ? event.attacker : null;
    const target = [0,1].includes(event.target) ? event.target : null;
    this.effects.push({ id: ++this.nextEffectId, attacker, target, point: { ...event.point }, damage: event.damage, life: 0.95, maxLife: 0.95 });
    this.readout = {
      attacker, target,
      label: event.damage >= 22 ? '漂亮的一击' : '有效命中',
      damage: event.damage,
      detail: `${event.speed.toFixed(1)} m/s · 发力加成 ${Math.round(30 * Math.min(event.acceleration / 48, 1))}%${event.turnShare > 0.01 ? ' · 横转伤害降低' : ''}`,
    };
    this.readoutTimer = 3;
    if (attacker !== null) { this.readouts[attacker] = this.readout; this.readoutTimers[attacker] = 3; }
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
    for (let id = 0; id < 2; id++) {
      if (this.readoutTimers[id] <= 0) continue;
      this.readoutTimers[id] = Math.max(0, this.readoutTimers[id] - effectDt);
      if (!this.readoutTimers[id]) { this.readouts[id] = null; this.publish(); }
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
