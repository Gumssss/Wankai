import { isValidLoadout, normalizeLoadout } from './loadouts.js';
import { isArenaSkin } from './arena-skins.js';

// Host-authoritative online play over any message transport:
//   transport.send(message)  — deliver one JSON-safe object to the peer
//   transport.close()        — hang up
// and the owner feeds incoming traffic into receive(message) / closed(reason).
// The host (player 0) simulates and broadcasts snapshots at 60 Hz. The guest
// (player 1) sends its inputs and renders the snapshots ~50 ms behind.
// The transport may drop or reorder plain snapshots and inputs (Steam sends
// them unreliably); control messages, snapshots with events and skill taps
// must arrive.
export const PROTOCOL = 3;
const SNAPSHOT_INTERVAL = 1 / 60;
const INPUT_HEARTBEAT = 1 / 30;
const INTERPOLATION_DELAY = 0.05;
const PING_INTERVAL = 1;
const PLAYER_FIELDS = ['theta', 'phi', 'bodyYaw', 'hitFlash', 'staffGrounded', 'contactSpeed',
  'health', 'stamina', 'skillActive', 'skillTime', 'skillCooldown', 'wt', 'wp'];
const ANGLES = new Set(['phi', 'bodyYaw']);
const LERPED = new Set(['theta', 'phi', 'bodyYaw', 'hitFlash', 'contactSpeed', 'stamina', 'skillTime', 'skillCooldown']);
// A teleport would otherwise be shown as a slide across the arena.
const SNAP_DISTANCE = 1.5;

const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
// Steam persona names are shown as text; keep them short and printable.
const cleanName = name => String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32);
const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

// Only the fields the simulation reads, with every value bounded.
export function sanitizeInput(message) {
  const input = { theta: Math.sign(finite(message?.theta)), phi: Math.max(-1, Math.min(1, finite(message?.phi))) };
  if (message?.skillTap) input.skillTap = true;
  if (Number.isFinite(message?.faceYaw)) input.faceYaw = message.faceYaw;
  return input;
}

export class NetSession {
  constructor(session, transport, { role, version = '0', name = '', now = () => performance.now() / 1000 } = {}) {
    if (role !== 'host' && role !== 'guest') throw new Error(`Unknown role: ${role}`);
    this.session = session;
    this.transport = transport;
    this.role = role;
    this.version = version;
    this.name = cleanName(name);
    this.now = now;
    this.phase = role === 'host' ? 'waiting' : 'connecting';
    this.peer = { loadout: null, ready: false, rematch: false, name: '' };
    this.local = { loadout: null, ready: false, rematch: false };
    this.ping = null;
    this.message = '';
    this.snapshotTimer = 0;
    this.pingTimer = 0;
    this.pendingEvents = [];
    this.seq = 0;
    // Guest-side state.
    this.clock = 0;
    this.buffer = [];
    this.lastSeq = 0;
    this.inbox = [];
    this.inputTimer = 0;
    this.lastInput = '';
    session.mode = 'online';
    session.localPlayerId = role === 'host' ? 0 : 1;
    session.replica = role === 'guest';
    session.net = this;
    this.publish();
  }

  get connected() { return this.phase === 'connected'; }

  publish() {
    this.session.netInfo = { role: this.role, phase: this.phase, message: this.message, ping: this.ping,
      peer: { ...this.peer }, local: { ...this.local } };
    this.session.publish();
  }

  send(message) { if (this.phase !== 'closed') this.transport.send(message); }

  // Guest: open the conversation once the socket connects.
  hello() {
    this.phase = 'handshake';
    this.send({ type: 'hello', protocol: PROTOCOL, version: this.version, name: this.name });
    this.publish();
  }

  setLoadout(loadout, ready) {
    this.local = { ...this.local, loadout: isValidLoadout(loadout) ? normalizeLoadout(loadout) : null, ready: !!ready && isValidLoadout(loadout) };
    this.send({ type: 'loadout', loadout: this.local.loadout, ready: this.local.ready });
    this.publish();
  }

  // Host: the arena skin is the host's choice; the guest follows it.
  setArena(skin) {
    if (this.role !== 'host' || !isArenaSkin(skin)) return;
    this.session.setArenaSkin(skin);
    this.send({ type: 'arena', skin });
  }

  canStart() { return this.role === 'host' && this.connected && this.local.ready && this.peer.ready && !!this.peer.loadout; }

  // Host: begin a round with both chosen loadouts.
  start() {
    if (!this.canStart()) return false;
    const loadouts = [this.local.loadout, this.peer.loadout];
    this.beginRound(loadouts);
    this.send({ type: 'start', loadouts, arena: this.session.arenaSkin });
    return true;
  }

  beginRound(loadouts) {
    const session = this.session;
    if (session.state !== 'lobby') session.goHome();
    session.setLoadouts(loadouts);
    session.startRound('online');
    this.local.rematch = this.peer.rematch = false;
    this.buffer = [];
    this.publish();
  }

  requestRematch() {
    this.local.rematch = true;
    this.send({ type: 'rematch' });
    if (this.role === 'host' && this.peer.rematch) this.rematch();
    this.publish();
  }

  rematch() {
    const loadouts = this.session.loadouts.map(p => ({ ...p }));
    this.beginRound(loadouts);
    this.send({ type: 'start', loadouts, arena: this.session.arenaSkin });
  }

  leave(reason = '') {
    this.send({ type: 'leave' });
    this.closed(reason);
    this.transport.close();
  }

  closed(reason = '对方已断开连接。') {
    if (this.phase === 'closed') return;
    const wasConnected = this.phase === 'connected';
    this.phase = 'closed';
    this.message = reason || (wasConnected ? '对方已断开连接。' : '');
    this.publish();
  }

  receive(message) {
    if (!message || typeof message.type !== 'string' || this.phase === 'closed') return;
    const handler = this[`on_${message.type}`];
    if (handler) handler.call(this, message);
  }

  on_hello(message) {
    if (this.role !== 'host') return;
    let reason = '';
    if (message.protocol !== PROTOCOL || message.version !== this.version) reason = `版本不一致（房主 ${this.version}，加入者 ${message.version}）。请双方使用同一版本。`;
    if (reason) {
      this.transport.send({ type: 'reject', reason });
      this.phase = 'waiting';
      this.publish();
      return;
    }
    this.phase = 'connected';
    if (message.name) this.peer.name = cleanName(message.name);
    this.send({ type: 'welcome', version: this.version, name: this.name });
    if (this.local.loadout) this.send({ type: 'loadout', loadout: this.local.loadout, ready: this.local.ready });
    this.send({ type: 'arena', skin: this.session.arenaSkin });
    this.publish();
  }

  on_welcome(message) {
    if (this.role !== 'guest') return;
    this.phase = 'connected';
    if (message.name) this.peer.name = cleanName(message.name);
    if (this.local.loadout) this.send({ type: 'loadout', loadout: this.local.loadout, ready: this.local.ready });
    this.publish();
  }

  on_reject(message) { this.closed(String(message.reason || '房主拒绝了连接。')); this.transport.close(); }

  on_leave() { this.closed('对方离开了房间。'); }

  on_loadout(message) {
    this.peer.loadout = isValidLoadout(message.loadout) ? normalizeLoadout(message.loadout) : null;
    this.peer.ready = !!message.ready && !!this.peer.loadout;
    this.publish();
  }

  on_arena(message) {
    if (this.role === 'guest' && isArenaSkin(message.skin)) this.session.setArenaSkin(message.skin);
  }

  on_start(message) {
    if (this.role !== 'guest' || !Array.isArray(message.loadouts) || !message.loadouts.every(isValidLoadout)) return;
    if (isArenaSkin(message.arena)) this.session.setArenaSkin(message.arena);
    this.beginRound(message.loadouts);
  }

  on_rematch() {
    this.peer.rematch = true;
    if (this.role === 'host' && this.local.rematch) this.rematch();
    this.publish();
  }

  on_ping(message) { this.send({ type: 'pong', t: message.t }); }

  on_pong(message) {
    if (!Number.isFinite(message.t)) return;
    const ping = Math.round((this.now() - message.t) * 1000);
    if (ping !== this.ping) { this.ping = ping; this.publish(); }
  }

  on_input(message) {
    if (this.role !== 'host') return;
    const input = sanitizeInput(message);
    // Keep a tap until the next physics step consumes it, even if a newer
    // input without the flag arrives first.
    if (this.session.remoteInput.skillTap) input.skillTap = true;
    this.session.remoteInput = input;
  }

  on_snap(message) {
    if (this.role !== 'guest' || !Array.isArray(message.players)) return;
    // Events always play; a snapshot older than one already shown (it was
    // overtaken on the wire) would step the world back, so its state is dropped.
    if (Array.isArray(message.events)) this.inbox.push(...message.events);
    if (Number.isFinite(message.seq)) {
      if (message.seq <= this.lastSeq) return;
      this.lastSeq = message.seq;
    }
    this.buffer.push({ at: this.clock, snap: message });
    while (this.buffer.length > 30) this.buffer.shift();
  }

  heartbeat(dt) {
    if (!this.connected) return;
    this.pingTimer += dt;
    if (this.pingTimer >= PING_INTERVAL) { this.pingTimer = 0; this.send({ type: 'ping', t: this.now() }); }
  }

  // Host, after each local tick: queue events and broadcast a snapshot.
  afterTick(dt, impacts) {
    this.heartbeat(dt);
    if (!this.connected) return;
    // Events are plain data (hits, clashes, skills, splats); send them whole.
    this.pendingEvents.push(...impacts.map(event => JSON.parse(JSON.stringify(event))));
    this.snapshotTimer += dt;
    if (this.snapshotTimer + 1e-4 < SNAPSHOT_INTERVAL) return;
    this.snapshotTimer = Math.min(Math.max(0, this.snapshotTimer - SNAPSHOT_INTERVAL), SNAPSHOT_INTERVAL);
    const { session } = this, world = session.world;
    this.send({
      type: 'snap', seq: ++this.seq, state: session.state, countdown: session.countdown, countdownNumber: session.countdownNumber,
      time: world.time, winner: world.winner,
      players: world.players.map(p => {
        const out = { p: { ...p.p }, v: { ...p.v } };
        for (const field of PLAYER_FIELDS) out[field] = p[field];
        return out;
      }),
      projectiles: world.projectiles.map(({ id, owner, p, v, spin, radius }) => ({ id, owner, p: { ...p }, v: { ...v }, spin, radius })),
      events: this.pendingEvents.splice(0),
    });
  }

  // Guest, instead of simulating: send input, then show the buffered past.
  replicaTick(dt) {
    const session = this.session;
    this.clock += dt;
    this.heartbeat(dt);
    if (this.connected) {
      const input = session.menuOpen ? { theta: 0, phi: 0 } : session.localInput();
      const key = JSON.stringify({ ...input, faceYaw: undefined });
      this.inputTimer += dt;
      if (key !== this.lastInput || input.skillTap || this.inputTimer >= INPUT_HEARTBEAT) {
        this.send({ type: 'input', ...input });
        this.lastInput = key;
        this.inputTimer = 0;
        session.skillTap = false;
      }
    }
    if (!this.buffer.length) return [];
    const renderAt = this.clock - INTERPOLATION_DELAY;
    while (this.buffer.length > 2 && this.buffer[1].at <= renderAt) this.buffer.shift();
    const [a, b = a] = this.buffer;
    const t = b.at > a.at ? Math.max(0, Math.min(1, (renderAt - a.at) / (b.at - a.at))) : 1;
    this.applySnapshot(a.snap, b.snap, t);
    const impacts = this.inbox.splice(0);
    for (const event of impacts) session.impact(event);
    return impacts;
  }

  applySnapshot(a, b, t) {
    const session = this.session, world = session.world;
    world.players.forEach((player, id) => {
      const from = a.players[id], to = b.players[id];
      if (!from || !to) return;
      const jump = Math.hypot(to.p.x - from.p.x, to.p.z - from.p.z) > SNAP_DISTANCE;
      const k = jump ? 1 : t;
      player.p = { x: from.p.x + (to.p.x - from.p.x) * k, y: from.p.y + (to.p.y - from.p.y) * k, z: from.p.z + (to.p.z - from.p.z) * k };
      player.v = { ...to.v };
      for (const field of PLAYER_FIELDS) {
        if (!LERPED.has(field)) player[field] = to[field];
        else if (ANGLES.has(field)) player[field] = lerpAngle(from[field], to[field], k);
        else player[field] = from[field] + (to[field] - from[field]) * k;
      }
    });
    // Projectiles: interpolate the ones present in both snapshots.
    if (Array.isArray(b.projectiles)) world.projectiles = b.projectiles.map(shot => {
      const before = a.projectiles?.find(other => other.id === shot.id);
      if (!before) return { ...shot, p: { ...shot.p } };
      return { ...shot, p: { x: before.p.x + (shot.p.x - before.p.x) * t, y: before.p.y + (shot.p.y - before.p.y) * t, z: before.p.z + (shot.p.z - before.p.z) * t } };
    });
    world.time = b.time;
    const previousWinner = world.winner;
    world.winner = b.winner;
    if (b.countdownNumber !== session.countdownNumber && b.countdownNumber > 0 && b.state === 'countdown') session.sound.tick();
    session.countdownNumber = b.countdownNumber;
    session.countdown = b.countdown;
    if (b.state !== session.state) {
      if (b.state === 'playing' && session.state === 'countdown') session.sound.tick(true);
      if (b.state === 'result' && previousWinner === null) session.finishRound();
      else session.state = b.state;
    }
    session.publish();
  }
}
