import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SteamService, SendType, sendTypeFor, GAME_TAG, LOBBY_KEYS, STEAM_APP_ID } = require('../electron/steam-link.cjs');

// A pretend Steam backend shared by several users: lobbies, lobby callbacks
// and P2P packets, with the same surface steamworks.js 0.4 exposes.
function fakeSteam() {
  const lobbies = new Map(), users = new Map();
  let nextLobby = 1000n;
  const fire = (steamId, callback, value) => users.get(steamId)?.handlers.get(callback)?.(value);
  const handle = (state, holder) => ({
    id: state.id,
    leave() {
      if (!state.members.includes(holder)) return;
      state.members = state.members.filter(member => member !== holder);
      if (!state.members.length) { lobbies.delete(state.id); return; }
      if (state.owner === holder) state.owner = state.members[0];
      for (const member of state.members) fire(member, 5, { lobby: state.id, user_changed: holder, making_change: holder, member_state_change: 1 });
    },
    getMemberCount: () => BigInt(state.members.length),
    getMembers: () => state.members.map(steamId64 => ({ steamId64 })),
    getOwner: () => ({ steamId64: state.owner }),
    setJoinable: joinable => { state.joinable = joinable; return true; },
    getData: key => state.data[key] ?? null,
    getFullData: () => ({ ...state.data }),
    mergeFullData: data => { if (state.owner !== holder) return false; Object.assign(state.data, data); return true; },
  });
  const later = value => new Promise(resolve => setImmediate(() => resolve(value)));
  function client(steamId, name) {
    const user = { steamId, name, handlers: new Map(), inbox: [], accepted: new Set(), sent: [], invites: [] };
    users.set(steamId, user);
    return {
      user,
      localplayer: { getSteamId: () => ({ steamId64: steamId }), getName: () => name },
      callback: { register: (event, fn) => { user.handlers.set(event, fn); return { disconnect: () => user.handlers.delete(event) }; } },
      matchmaking: {
        createLobby: async (type, max) => {
          const state = { id: nextLobby++, type, max, owner: steamId, members: [steamId], data: {}, joinable: true };
          lobbies.set(state.id, state);
          return later(handle(state, steamId));
        },
        joinLobby: async id => {
          await later();
          const state = lobbies.get(id);
          if (!state || !state.joinable || state.members.length >= state.max) throw new Error('lobby unavailable');
          state.members.push(steamId);
          for (const member of state.members) if (member !== steamId) fire(member, 5, { lobby: id, user_changed: steamId, making_change: steamId, member_state_change: 0 });
          return handle(state, steamId);
        },
        getLobbies: async () => later([...lobbies.values()].filter(state => state.type === 2 && state.joinable).map(state => handle(state, null))),
      },
      networking: {
        sendP2PPacket: (to, type, data) => { user.sent.push({ to, type, message: JSON.parse(data.toString()) }); users.get(to)?.inbox.push({ from: steamId, data }); return true; },
        isP2PPacketAvailable: () => user.inbox[0]?.data.length ?? 0,
        readP2PPacket: size => { const packet = user.inbox.shift(); return { data: packet.data, size, steamId: { steamId64: packet.from } }; },
        acceptP2PSession: remote => user.accepted.add(remote),
      },
      overlay: { activateInviteDialog: id => user.invites.push(id) },
    };
  }
  return { lobbies, users, client, otherLobby: (data, type = 2) => {
    const state = { id: nextLobby++, type, max: 2, owner: 9n, members: [9n], data, joinable: true };
    lobbies.set(state.id, state);
    return state;
  } };
}

// One player: a service with a fake Steam client, one link, its renderer events.
function player(steam, steamId, name, { version = '1.0.0', clock } = {}) {
  const client = steam.client(steamId, name);
  const service = new SteamService({ version, load: () => ({ init: () => client }), now: () => clock.t, setTimer: () => 1, clearTimer: () => {} });
  const events = [];
  const link = service.createLink((channel, payload) => events.push({ channel, ...payload }));
  const statuses = () => events.filter(event => event.channel === 'status').map(event => event.type);
  const messages = () => events.filter(event => event.channel === 'message');
  return { client, service, link, events, statuses, messages, user: client.user };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 5));

test('per-frame traffic goes unreliable; control, events and skill taps stay reliable', () => {
  assert.equal(sendTypeFor({ type: 'snap', events: [] }), SendType.UnreliableNoDelay);
  assert.equal(sendTypeFor({ type: 'snap', events: [{ type: 'hit' }] }), SendType.Reliable);
  assert.equal(sendTypeFor({ type: 'input', theta: 1 }), SendType.UnreliableNoDelay);
  assert.equal(sendTypeFor({ type: 'input', skillTap: true }), SendType.Reliable);
  for (const type of ['hello', 'welcome', 'loadout', 'arena', 'start', 'rematch', 'ping', 'pong', 'leave'])
    assert.equal(sendTypeFor({ type }), SendType.Reliable, type);
  assert.equal(STEAM_APP_ID, 480, 'development builds use Spacewar until the real AppID is set');
});

test('without Steam the link reports why instead of crashing, and retries later', async () => {
  let running = false;
  const steam = fakeSteam(), clock = { t: 0 };
  const client = steam.client(1n, 'A');
  const service = new SteamService({ version: '1', load: () => ({ init: () => { if (!running) throw new Error('Steam is not running'); return client; } }), setTimer: () => 1, clearTimer: () => {}, now: () => clock.t });
  const events = [];
  const link = service.createLink((channel, payload) => events.push(payload));
  const result = await link.quickMatch();
  assert.equal(result.ok, false);
  assert.match(result.message, /Steam 未运行/);
  assert.equal(events.at(-1).type, 'error');
  running = true;
  assert.equal(service.start().ok, true);
  assert.equal(service.status().name, 'A');
});

test('quick match: the first player opens a tagged public lobby, the second joins it', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  const a = player(steam, 1n, 'Alice', { clock }), b = player(steam, 2n, 'Bob', { clock });
  await a.link.quickMatch();
  assert.deepEqual(a.statuses(), ['searching', 'waiting']);
  const [lobby] = steam.lobbies.values();
  assert.equal(lobby.type, 2);
  assert.equal(lobby.data[LOBBY_KEYS.game], GAME_TAG);
  assert.equal(lobby.data[LOBBY_KEYS.version], '1.0.0');
  assert.equal(lobby.data[LOBBY_KEYS.mode], 'quick');
  await b.link.quickMatch();
  const guest = b.events.find(event => event.type === 'connected');
  assert.deepEqual(guest, { channel: 'status', type: 'connected', role: 'guest', peer: { id: '1', name: 'Alice' } });
  assert.equal(a.events.find(event => event.type === 'connected').role, 'host');
  assert.equal(lobby.joinable, false, 'a full lobby leaves the search results');
  assert.ok(b.user.accepted.has(1n) && a.user.accepted.has(2n));
  b.link.send({ type: 'hello', protocol: 3 });
  b.link.send({ type: 'input', theta: 1, phi: 0 });
  a.link.send({ type: 'snap', seq: 1, players: [], events: [] });
  a.service.pump(); b.service.pump();
  assert.deepEqual(a.messages().map(m => m.type), ['hello', 'input']);
  assert.deepEqual(b.messages().map(m => m.type), ['snap']);
  assert.deepEqual(b.user.sent.map(s => s.type), [SendType.Reliable, SendType.UnreliableNoDelay]);
});

test('quick match ignores other games, other versions and invite lobbies on the shared test AppID', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  steam.otherLobby({ name: 'someone else' });
  steam.otherLobby({ [LOBBY_KEYS.game]: GAME_TAG, [LOBBY_KEYS.version]: '0.9.0', [LOBBY_KEYS.mode]: 'quick' });
  steam.otherLobby({ [LOBBY_KEYS.game]: GAME_TAG, [LOBBY_KEYS.version]: '1.0.0', [LOBBY_KEYS.mode]: 'invite' });
  const b = player(steam, 2n, 'Bob', { clock });
  await b.link.quickMatch();
  assert.deepEqual(b.statuses(), ['searching', 'waiting'], 'nothing matched, so it waits in its own lobby');
  assert.equal([...steam.lobbies.values()].filter(lobby => lobby.members.includes(2n)).length, 1);
});

test('two players who searched at once end up in the older lobby', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  const a = player(steam, 1n, 'Alice', { clock }), b = player(steam, 2n, 'Bob', { clock });
  await Promise.all([a.link.quickMatch(), b.link.quickMatch()]);
  assert.equal(steam.lobbies.size, 2, 'both opened a lobby');
  clock.t = 6000;
  a.service.pump(); b.service.pump();
  await settle();
  assert.equal(steam.lobbies.size, 1);
  assert.equal(a.events.at(-1).role, 'host');
  assert.equal(b.events.at(-1).role, 'guest');
});

test('invite: a friends-only lobby opens the Steam invite dialog; the friend joins by its id', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  const a = player(steam, 1n, 'Alice', { clock }), b = player(steam, 2n, 'Bob', { clock });
  await a.link.invite();
  const [lobby] = steam.lobbies.values();
  assert.equal(lobby.type, 1);
  assert.deepEqual(a.user.invites, [lobby.id]);
  assert.equal(a.events.at(-1).mode, 'invite');
  assert.equal((await b.link.joinInvite(String(lobby.id))).ok, true);
  assert.equal(b.events.at(-1).role, 'guest');
  const stranger = steam.otherLobby({ name: 'not ours' }, 1);
  const c = player(steam, 3n, 'Carol', { clock });
  const wrong = await c.link.joinInvite(String(stranger.id));
  assert.equal(wrong.ok, false);
  assert.ok(!stranger.members.includes(3n), 'left the foreign lobby');
  assert.equal((await c.link.joinInvite('not-a-number')).ok, false);
});

test('a guest that leaves frees the host lobby; a host that leaves ends the guest link', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  const a = player(steam, 1n, 'Alice', { clock }), b = player(steam, 2n, 'Bob', { clock });
  await a.link.quickMatch();
  await b.link.quickMatch();
  const [lobby] = steam.lobbies.values();
  b.link.close();
  assert.deepEqual(a.statuses().slice(-2), ['disconnected', 'waiting']);
  assert.equal(lobby.joinable, true, 'open for the next player');
  const c = player(steam, 3n, 'Carol', { clock });
  await c.link.quickMatch();
  assert.equal(c.events.at(-1).role, 'guest');
  a.link.close();
  assert.equal(c.statuses().at(-1), 'disconnected');
  assert.equal(c.link.lobby, null);
  assert.equal(steam.lobbies.size, 0, 'nobody is left in the lobby');
});

test('a silent peer times out; the link keeps itself alive while traffic flows', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  const a = player(steam, 1n, 'Alice', { clock }), b = player(steam, 2n, 'Bob', { clock });
  await a.link.quickMatch();
  await b.link.quickMatch();
  for (clock.t = 0; clock.t < 20000; clock.t += 500) { a.service.pump(); b.service.pump(); }
  assert.ok(!a.statuses().includes('disconnected'), 'keepalives hold the link');
  assert.ok(a.user.sent.some(s => s.message.type === 'keepalive'));
  assert.equal(a.messages().length, 0, 'keepalives never reach the renderer');
  b.service.links.clear(); // Bob's game froze: no more pumping or keepalives.
  for (const end = clock.t + 16000; clock.t < end; clock.t += 500) a.service.pump();
  assert.equal(a.statuses().at(-2), 'disconnected');
  assert.match(a.events.findLast(event => event.type === 'disconnected').message, /超时/);
});

test('cancelling a search leaves no lobby behind; closing the window leaves the lobby', async () => {
  const steam = fakeSteam(), clock = { t: 0 };
  const a = player(steam, 1n, 'Alice', { clock });
  const pending = a.link.quickMatch();
  a.link.close();
  const result = await pending;
  await settle();
  assert.equal(result.ok, false);
  assert.equal(steam.lobbies.size, 0);
  await a.link.invite();
  assert.equal(steam.lobbies.size, 1);
  a.service.removeLink(a.link);
  assert.equal(steam.lobbies.size, 0);
  assert.equal(a.service.links.size, 0);
});
