import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import net from 'node:net';

const require = createRequire(import.meta.url);
const { LocalService, localNetRole, localNetPort, DEFAULT_PORT } = require('../electron/local-link.cjs');

const until = async (check, ms = 3000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

const freePort = () => new Promise(resolve => {
  const server = net.createServer().listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});

function window(role, port) {
  const service = new LocalService({ role, port });
  const events = [];
  const link = service.createLink((channel, payload) => events.push({ channel, ...payload }));
  return { service, link, events, statuses: () => events.filter(e => e.channel === 'status'), messages: () => events.filter(e => e.channel === 'message') };
}

test('the local mode is chosen by flag or env and only for host / join', () => {
  assert.equal(localNetRole(['electron', '.', '--local-net=host'], {}), 'host');
  assert.equal(localNetRole(['electron', '.'], { WANKAI_LOCAL_NET: 'join' }), 'join');
  assert.equal(localNetRole(['electron', '.', '--local-net=other'], {}), null);
  assert.equal(localNetRole(['electron', '.'], {}), null);
  assert.equal(localNetPort({}), DEFAULT_PORT);
  assert.equal(localNetPort({ WANKAI_LOCAL_PORT: '5000' }), 5000);
  assert.equal(localNetPort({ WANKAI_LOCAL_PORT: 'x' }), DEFAULT_PORT);
});

test('the local service reports itself like a connected Steam client', () => {
  const status = new LocalService({ role: 'host', port: 1 }).start();
  assert.equal(status.ok, true);
  assert.ok(status.name);
  assert.deepEqual(status.local, { role: 'host', port: 1 });
});

test('a joiner that starts first keeps trying, then both sides pair and exchange messages', async () => {
  const port = await freePort();
  const host = window('host', port), guest = window('join', port);
  const joined = guest.link.joinInvite('local');
  await new Promise(resolve => setTimeout(resolve, 700));
  assert.deepEqual(guest.statuses().map(s => s.type), ['joining']);

  assert.deepEqual(await host.link.quickMatch(), { ok: true, port });
  assert.deepEqual(await joined, { ok: true });
  await until(() => host.statuses().some(s => s.type === 'connected'));
  assert.deepEqual(host.statuses().map(s => s.type), ['connecting', 'waiting', 'connected']);
  assert.equal(host.statuses().at(-1).role, 'host');
  assert.equal(guest.statuses().at(-1).role, 'guest');

  guest.link.send({ type: 'hello', protocol: 3, name: 'B' });
  host.link.send({ type: 'snap', seq: 1, players: [], text: '中文 ✓' });
  await until(() => host.messages().length && guest.messages().length);
  assert.equal(host.messages()[0].type, 'hello');
  assert.equal(guest.messages()[0].text, '中文 ✓');

  // The guest window closes: the host is told and opens its room again.
  guest.service.shutdown();
  await until(() => host.statuses().some(s => s.type === 'disconnected'));
  assert.deepEqual(host.statuses().slice(-2).map(s => s.type), ['disconnected', 'waiting']);
  host.service.shutdown();
});

test('a second joiner is turned away while the room is full', async () => {
  const port = await freePort();
  const host = window('host', port), first = window('join', port), second = window('join', port);
  await host.link.invite();
  await first.link.quickMatch();
  await until(() => host.statuses().some(s => s.type === 'connected'));
  await second.link.quickMatch();
  await until(() => second.messages().some(m => m.type === 'reject'));
  for (const side of [host, first, second]) side.service.shutdown();
});

test('cancelling a join stops the retries', async () => {
  const port = await freePort();
  const guest = window('join', port);
  const pending = guest.link.quickMatch();
  guest.link.close();
  assert.deepEqual(await pending, { ok: false, cancelled: true });
});
