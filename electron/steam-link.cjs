// Online play over Steam, owned by the main process: Steam lobbies find or
// invite the opponent, Steam P2P (relayed through Steam Datagram Relay when a
// direct route fails) carries the messages. No server of our own.
//
// The renderer sees the same contract the old TCP link had: it sends JSON
// objects, receives JSON objects ('message') and link changes ('status'):
//   { type: 'connecting' | 'searching' | 'joining' }
//   { type: 'waiting', mode: 'quick' | 'invite' }      in our own lobby, alone
//   { type: 'connected', role: 'host' | 'guest', peer: { id, name } }
//   { type: 'disconnected', message }                    the peer went away
//   { type: 'error', message }                           nothing to keep open
// The lobby owner is the host (player 0).

// Steam AppID. 480 is Valve's public test app "Spacewar"; replace it with the
// game's own AppID before release. This is the only place it is set.
const STEAM_APP_ID = 480;

// Every developer shares AppID 480, so our lobbies carry a unique tag, and a
// quick match only joins lobbies with the same tag, build version and mode.
const LOBBY_KEYS = Object.freeze({ game: 'mukun_arena_game', version: 'mukun_arena_version', mode: 'mukun_arena_mode', host: 'mukun_arena_host' });
const GAME_TAG = 'mukun-arena';
const LOBBY_SIZE = 2;
const PUMP_INTERVAL = 4;          // ms between P2P receive passes while online
const RESEARCH_INTERVAL = 5000;   // ms between quick-match searches while waiting alone
const KEEPALIVE_INTERVAL = 2000;  // ms; the link's own heartbeat while paired
const PEER_TIMEOUT = 15000;       // ms of silence before the peer counts as gone
const MAX_MESSAGE = 64 * 1024;
const UNRELIABLE_LIMIT = 1150;    // Steam drops unreliable packets over 1200 bytes
const STRAY_LIMIT = 32;

// steamworks.js enum values (const enums in its typings, so not exported at runtime).
const LobbyType = { Private: 0, FriendsOnly: 1, Public: 2 };
const SendType = { Unreliable: 0, UnreliableNoDelay: 1, Reliable: 2 };
const Callback = { LobbyChatUpdate: 5, P2PSessionRequest: 6, P2PSessionConnectFail: 7, GameLobbyJoinRequested: 8 };
const MemberLeft = new Set([1, 2, 3, 4]); // Left, Disconnected, Kicked, Banned

// Per-frame traffic (snapshots, inputs) may be lost and is resent anyway; a
// snapshot that carries hit/skill events, or an input with a skill tap, must not be.
function sendTypeFor(message) {
  if (message.type === 'snap' && !(Array.isArray(message.events) && message.events.length)) return SendType.UnreliableNoDelay;
  if (message.type === 'input' && !message.skillTap) return SendType.UnreliableNoDelay;
  if (message.type === 'keepalive') return SendType.Unreliable;
  return SendType.Reliable;
}

function lobbyMatches(lobby, { version, mode }) {
  return lobby.getData(LOBBY_KEYS.game) === GAME_TAG && lobby.getData(LOBBY_KEYS.version) === version
    && lobby.getData(LOBBY_KEYS.mode) === mode;
}

// Almost every init failure means the Steam client is not running or not logged in.
function describeInitError(error) {
  const text = String(error?.message || error || '').trim();
  return `Steam 未运行或未登录：请先启动 Steam 并登录，再打开联机。${text ? `（${text.slice(0, 160)}）` : ''}`;
}

const idText = id => (id === null || id === undefined ? '' : String(id));
const parseId = value => { try { const id = BigInt(String(value)); return id > 0n ? id : null; } catch { return null; } };

// One Steam client for the whole app. Packets arrive in one queue for the
// process, so the service reads them and hands each to the link it belongs to.
class SteamService {
  constructor({ version, appId = STEAM_APP_ID, load = () => require('steamworks.js'), now = () => Date.now(),
    setTimer = setInterval, clearTimer = clearInterval } = {}) {
    this.version = String(version || '0');
    this.appId = appId;
    this.load = load;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.client = null;
    this.error = '';
    this.links = new Set();
    this.handles = [];
    this.timer = null;
    this.onInvite = () => {};
  }

  // Safe to call repeatedly: a failed start is retried, e.g. once Steam is up.
  start() {
    if (this.client) return this.status();
    try {
      const client = this.load().init(this.appId);
      this.client = client;
      this.error = '';
      this.me = client.localplayer.getSteamId().steamId64;
      this.name = client.localplayer.getName();
      const on = (event, handler) => this.handles.push(client.callback.register(event, handler));
      on(Callback.LobbyChatUpdate, update => { for (const link of this.links) link.onLobbyChat(update); });
      on(Callback.P2PSessionRequest, ({ remote }) => {
        if ([...this.links].some(link => link.expects(remote))) client.networking.acceptP2PSession(remote);
      });
      on(Callback.P2PSessionConnectFail, ({ remote }) => { for (const link of this.links) link.onConnectFail(remote); });
      // The player accepted an invite, or chose "Join game" on a friend, in the Steam overlay.
      on(Callback.GameLobbyJoinRequested, ({ lobby_steam_id }) => this.onInvite(idText(lobby_steam_id)));
    } catch (error) {
      this.client = null;
      this.error = describeInitError(error);
    }
    return this.status();
  }

  status() {
    return this.client ? { ok: true, name: this.name, id: idText(this.me), appId: this.appId } : { ok: false, message: this.error || 'Steam 尚未连接。' };
  }

  createLink(emit) {
    const link = new SteamLink(this, emit);
    this.links.add(link);
    return link;
  }

  removeLink(link) {
    link.close();
    this.links.delete(link);
    this.updatePump();
  }

  // Receive on a fast timer only while some link is in a lobby.
  updatePump() {
    const active = [...this.links].some(link => link.lobby);
    if (active && !this.timer) this.timer = this.setTimer(() => this.pump(), PUMP_INTERVAL);
    else if (!active && this.timer) { this.clearTimer(this.timer); this.timer = null; }
  }

  pump() {
    const networking = this.client?.networking;
    if (!networking) return;
    for (let i = 0, size; i < 256 && (size = networking.isP2PPacketAvailable()) > 0; i++) {
      const packet = networking.readP2PPacket(size);
      const from = packet?.steamId?.steamId64;
      if (from === undefined || !packet.data) continue;
      for (const link of this.links) if (link.onPacket(from, packet.data)) break;
    }
    const time = this.now();
    for (const link of this.links) link.tick(time);
  }

  shutdown() {
    for (const link of this.links) link.close();
    this.links.clear();
    for (const handle of this.handles) { try { handle.disconnect(); } catch { /* already gone */ } }
    this.handles = [];
    this.updatePump();
  }
}

// One window's online state: at most one lobby and one peer.
class SteamLink {
  constructor(service, emit) {
    this.service = service;
    this.emit = emit;
    this.lobby = null;
    this.mode = null;
    this.role = null;
    this.peer = null;
    this.generation = 0;
    this.lastHeard = 0;
    this.lastSent = 0;
    this.nextSearch = 0;
    this.searching = false;
    this.strays = [];
  }

  get client() { return this.service.client; }

  ready() {
    const status = this.service.start();
    if (!status.ok) this.emit('status', { type: 'error', message: status.message });
    return status;
  }

  // 快速匹配: join an open public lobby of the same build, or open one and wait.
  async quickMatch() {
    this.close();
    if (!this.ready().ok) return this.service.status();
    const generation = this.generation;
    this.mode = 'quick';
    this.emit('status', { type: 'searching' });
    try {
      if (await this.joinOpenLobby(generation)) return { ok: true };
      if (generation !== this.generation) return { ok: false, cancelled: true };
      await this.openLobby(LobbyType.Public, 'quick', generation);
      return { ok: true };
    } catch (error) {
      return this.fail(generation, `匹配失败：${error?.message || error}`);
    }
  }

  // 邀请好友: a friends-only lobby, and the Steam overlay's invite dialog.
  async invite() {
    this.close();
    if (!this.ready().ok) return this.service.status();
    const generation = this.generation;
    this.mode = 'invite';
    this.emit('status', { type: 'connecting' });
    try {
      await this.openLobby(LobbyType.FriendsOnly, 'invite', generation);
      if (this.lobby) this.openInviteDialog();
      return { ok: true };
    } catch (error) {
      return this.fail(generation, `无法创建房间：${error?.message || error}`);
    }
  }

  openInviteDialog() {
    if (!this.lobby || !this.client) return false;
    this.client.overlay.activateInviteDialog(this.lobby.id);
    return true;
  }

  // An accepted Steam invite (or "Join game" on a friend).
  async joinInvite(lobbyId) {
    const id = parseId(lobbyId);
    if (!id) return { ok: false, message: '邀请无效。' };
    this.close();
    if (!this.ready().ok) return this.service.status();
    const generation = this.generation;
    this.mode = 'invite';
    this.emit('status', { type: 'joining' });
    try {
      const lobby = await this.client.matchmaking.joinLobby(id);
      if (generation !== this.generation) { lobby.leave(); return { ok: false, cancelled: true }; }
      if (lobby.getData(LOBBY_KEYS.game) !== GAME_TAG) { lobby.leave(); return this.fail(generation, '这个邀请不是木昆竞技场的房间。'); }
      if (!this.adoptGuestLobby(lobby)) return this.fail(generation, '房间已满或房主已离开。');
      return { ok: true };
    } catch (error) {
      return this.fail(generation, `无法加入好友的房间：${error?.message || error}`);
    }
  }

  fail(generation, message) {
    if (generation !== this.generation) return { ok: false, cancelled: true };
    this.close();
    this.emit('status', { type: 'error', message });
    return { ok: false, message };
  }

  async findOpenLobbies() {
    const lobbies = await this.client.matchmaking.getLobbies();
    const mine = this.service.me;
    return lobbies.filter(lobby => lobby.id !== this.lobby?.id && lobbyMatches(lobby, { version: this.service.version, mode: 'quick' })
      && Number(lobby.getMemberCount()) === 1 && lobby.getOwner()?.steamId64 !== mine);
  }

  async joinOpenLobby(generation, candidates = null) {
    for (const candidate of candidates || await this.findOpenLobbies()) {
      if (generation !== this.generation) return false;
      let lobby;
      try { lobby = await this.client.matchmaking.joinLobby(candidate.id); } catch { continue; }
      if (generation !== this.generation) { lobby.leave(); return false; }
      if (this.adoptGuestLobby(lobby)) return true;
    }
    return false;
  }

  // We joined someone's lobby: its owner is the host and our peer.
  adoptGuestLobby(lobby) {
    const me = this.service.me, owner = lobby.getOwner()?.steamId64;
    const members = lobby.getMembers();
    if (!owner || owner === me || members.length > LOBBY_SIZE) { lobby.leave(); this.lobby = null; this.service.updatePump(); return false; }
    this.lobby = lobby;
    this.role = 'guest';
    this.service.updatePump();
    this.pair(owner, lobby.getData(LOBBY_KEYS.host) || '');
    return true;
  }

  async openLobby(type, mode, generation) {
    const lobby = await this.client.matchmaking.createLobby(type, LOBBY_SIZE);
    if (generation !== this.generation) { lobby.leave(); return; }
    lobby.mergeFullData({ [LOBBY_KEYS.game]: GAME_TAG, [LOBBY_KEYS.version]: this.service.version, [LOBBY_KEYS.mode]: mode,
      [LOBBY_KEYS.host]: String(this.service.name || '').slice(0, 32) });
    this.lobby = lobby;
    this.role = 'host';
    this.nextSearch = this.service.now() + RESEARCH_INTERVAL;
    this.service.updatePump();
    this.emit('status', { type: 'waiting', mode });
    // Someone may have joined while the lobby data was being written.
    const other = lobby.getMembers().find(member => member.steamId64 !== this.service.me);
    if (other) this.pair(other.steamId64, '');
  }

  pair(steamId, name) {
    this.peer = { id: steamId, name: String(name || '').slice(0, 32) };
    this.lastHeard = this.service.now();
    this.client.networking.acceptP2PSession(steamId);
    if (this.role === 'host') this.lobby?.setJoinable(false);
    this.emit('status', { type: 'connected', role: this.role, peer: { id: idText(steamId), name: this.peer.name } });
    // Messages that arrived before the lobby told us who joined.
    const early = this.strays.filter(stray => stray.from === steamId);
    this.strays = [];
    for (const stray of early) this.deliver(stray.data);
  }

  expects(remote) {
    if (!this.lobby) return false;
    if (this.peer) return this.peer.id === remote;
    return this.role === 'host';
  }

  isMember(steamId) {
    try { return this.lobby.getMembers().some(member => member.steamId64 === steamId); } catch { return false; }
  }

  onPacket(from, data) {
    if (!this.lobby) return false;
    if (this.peer?.id === from) { this.lastHeard = this.service.now(); this.deliver(data); return true; }
    if (this.role === 'host' && !this.peer) {
      if (this.isMember(from)) { this.pair(from, ''); this.lastHeard = this.service.now(); this.deliver(data); }
      else if (this.strays.length < STRAY_LIMIT) this.strays.push({ from, data, at: this.service.now() });
      return true;
    }
    return false;
  }

  deliver(data) {
    if (data.length > MAX_MESSAGE) return;
    let message;
    try { message = JSON.parse(data.toString('utf8')); } catch { return; }
    if (!message || typeof message !== 'object' || typeof message.type !== 'string' || message.type === 'keepalive') return;
    this.emit('message', message);
  }

  onLobbyChat({ lobby, user_changed: user, member_state_change: change }) {
    if (!this.lobby || lobby !== this.lobby.id || user === this.service.me) return;
    if (change === 0 && this.role === 'host' && !this.peer) this.pair(user, '');
    else if (MemberLeft.has(change) && this.peer?.id === user) this.peerLost('对方离开了房间。');
  }

  onConnectFail(remote) {
    if (this.peer?.id === remote) this.peerLost('与对方的连接中断了。');
  }

  // A host goes back to waiting in its lobby; a guest has nothing left to wait in.
  peerLost(message) {
    if (!this.peer) return;
    this.peer = null;
    this.emit('status', { type: 'disconnected', message });
    if (this.role === 'host' && this.lobby) {
      this.lobby.setJoinable(true);
      this.nextSearch = this.service.now() + RESEARCH_INTERVAL;
      this.emit('status', { type: 'waiting', mode: this.mode });
    } else this.close();
  }

  tick(time) {
    if (!this.lobby) return;
    if (this.peer) {
      if (time - this.lastHeard > PEER_TIMEOUT) { this.peerLost('与对方的连接超时。'); return; }
      if (time - this.lastSent > KEEPALIVE_INTERVAL) this.send({ type: 'keepalive' });
    } else {
      this.strays = this.strays.filter(stray => time - stray.at < 3000);
      if (this.mode === 'quick' && this.role === 'host' && !this.searching && time >= this.nextSearch) void this.research(time);
    }
  }

  // Two players who searched at the same moment each open a lobby. While
  // waiting, look again; the owner of the newer lobby moves to the older one.
  async research(time) {
    const generation = this.generation;
    this.searching = true;
    this.nextSearch = time + RESEARCH_INTERVAL;
    try {
      const older = (await this.findOpenLobbies()).filter(lobby => this.lobby && lobby.id < this.lobby.id);
      if (!older.length || generation !== this.generation || this.peer || Number(this.lobby?.getMemberCount()) !== 1) return;
      this.lobby.leave();
      this.lobby = null;
      this.role = null;
      if (await this.joinOpenLobby(generation, older)) return;
      if (generation === this.generation) await this.openLobby(LobbyType.Public, 'quick', generation);
    } catch { /* Keep waiting; the next search may work. */ }
    finally { if (generation === this.generation) this.searching = false; }
  }

  send(message) {
    if (!this.peer || !this.client) return false;
    const data = Buffer.from(JSON.stringify(message), 'utf8');
    if (data.length > MAX_MESSAGE) return false;
    let type = sendTypeFor(message);
    if (type !== SendType.Reliable && data.length > UNRELIABLE_LIMIT) type = SendType.Reliable;
    this.lastSent = this.service.now();
    return this.client.networking.sendP2PPacket(this.peer.id, type, data);
  }

  // Leave the lobby and forget the peer, without telling the renderer.
  close() {
    this.generation++;
    this.searching = false;
    this.peer = null;
    this.role = null;
    this.mode = null;
    this.strays = [];
    if (this.lobby) { try { this.lobby.leave(); } catch { /* Steam already dropped it */ } this.lobby = null; }
    this.service.updatePump();
  }
}

module.exports = { STEAM_APP_ID, GAME_TAG, LOBBY_KEYS, SendType, SteamService, SteamLink, sendTypeFor, lobbyMatches, parseId };
