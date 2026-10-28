// DEV ONLY: online play between two windows on one machine, without Steam.
// `npm run dev:host` / `npm run dev:join` (electron/launch.cjs --local-net=host|join).
// main.cjs only requires this file when the app is not packaged, and the
// packaged build leaves it out (package.json → build.files).
//
// It is a drop-in for SteamService / SteamLink: the same methods for main.cjs
// and the same statuses and messages for the renderer (see steam-link.cjs).
// Every button does the one thing this window's role allows: the host listens
// on 127.0.0.1, the joiner connects there (and keeps retrying until the host
// is up). Messages are newline-delimited JSON over one TCP socket.
const net = require('node:net');

const LOCAL_HOST = '127.0.0.1';
const DEFAULT_PORT = 47123;
const MAX_MESSAGE = 64 * 1024;
const RETRY_INTERVAL = 500;   // ms between connection attempts while the host is not up yet
const JOIN_TIMEOUT = 120000;  // ms; then the joiner gives up and says why

const ROLE_NAMES = { host: '本机玩家 A', join: '本机玩家 B' };

// `--local-net=host|join` on the command line, or WANKAI_LOCAL_NET=host|join.
function localNetRole(argv = process.argv, env = process.env) {
  const arg = argv.find(value => value.startsWith('--local-net='));
  const role = arg ? arg.slice('--local-net='.length) : env.WANKAI_LOCAL_NET || '';
  return role === 'host' || role === 'join' ? role : null;
}

function localNetPort(env = process.env) {
  const port = Number(env.WANKAI_LOCAL_PORT);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

class LocalService {
  constructor({ role, port = DEFAULT_PORT, host = LOCAL_HOST } = {}) {
    if (role !== 'host' && role !== 'join') throw new Error(`Unknown local-net role: ${role}`);
    this.role = role;
    this.port = port;
    this.host = host;
    this.name = ROLE_NAMES[role];
    this.links = new Set();
    this.onInvite = () => {};
  }

  // Same shape as SteamService.status(); `local` lets the online panel say so.
  start() { return this.status(); }
  status() { return { ok: true, name: this.name, id: `local-${this.role}`, appId: 0, local: { role: this.role, port: this.port } }; }

  createLink(emit) {
    const link = new LocalLink(this, emit);
    this.links.add(link);
    return link;
  }

  removeLink(link) {
    link.close();
    this.links.delete(link);
  }

  shutdown() {
    for (const link of this.links) link.close();
    this.links.clear();
  }
}

class LocalLink {
  constructor(service, emit) {
    this.service = service;
    this.emit = emit;
    this.server = null;
    this.socket = null;
    this.retry = null;
    this.generation = 0;
  }

  get port() { return this.server?.address()?.port ?? this.service.port; }

  // 快速匹配, 邀请好友 and an accepted "invite" all do the same thing here.
  quickMatch() { return this.begin(); }
  invite() { return this.begin(); }
  joinInvite() { return this.begin(); }
  openInviteDialog() { return false; }

  begin() {
    this.close();
    return this.service.role === 'host' ? this.listen() : this.connect();
  }

  listen() {
    const generation = this.generation;
    this.emit('status', { type: 'connecting' });
    return new Promise(resolve => {
      const server = net.createServer(socket => {
        if (this.socket) { socket.end(`${JSON.stringify({ type: 'reject', reason: '房间已满。' })}\n`); return; }
        this.attach(socket, 'host');
      });
      server.once('error', error => {
        if (generation !== this.generation) { resolve({ ok: false, cancelled: true }); return; }
        this.server = null;
        const message = error.code === 'EADDRINUSE'
          ? `端口 ${this.service.port} 已被占用（是否已经开着一个 dev:host 窗口？）。可用 WANKAI_LOCAL_PORT 换一个端口。`
          : `无法开放本机房间：${error.message}`;
        this.emit('status', { type: 'error', message });
        resolve({ ok: false, message });
      });
      server.listen(this.service.port, this.service.host, () => {
        if (generation !== this.generation) { server.close(); resolve({ ok: false, cancelled: true }); return; }
        this.emit('status', { type: 'waiting', mode: 'quick' });
        resolve({ ok: true, port: this.port });
      });
      this.server = server;
    });
  }

  // The joiner may start before the host window: keep trying for a while.
  connect() {
    const generation = this.generation, started = Date.now();
    this.emit('status', { type: 'joining' });
    return new Promise(resolve => {
      const attempt = () => {
        this.retry = null;
        if (generation !== this.generation) { resolve({ ok: false, cancelled: true }); return; }
        const socket = net.connect({ host: this.service.host, port: this.service.port });
        socket.once('connect', () => {
          if (generation !== this.generation) { socket.destroy(); resolve({ ok: false, cancelled: true }); return; }
          this.attach(socket, 'guest');
          resolve({ ok: true });
        });
        socket.once('error', error => {
          socket.destroy();
          if (generation !== this.generation) { resolve({ ok: false, cancelled: true }); return; }
          if (error.code === 'ECONNREFUSED' && Date.now() - started < JOIN_TIMEOUT) { this.retry = setTimeout(attempt, RETRY_INTERVAL); return; }
          const message = error.code === 'ECONNREFUSED' ? `本机房间（${this.service.host}:${this.service.port}）没有开放：请先运行 npm run dev:host。` : `无法加入本机房间：${error.message}`;
          this.emit('status', { type: 'error', message });
          resolve({ ok: false, message });
        });
      };
      attempt();
    });
  }

  attach(socket, role) {
    this.socket = socket;
    socket.setNoDelay(true);
    socket.setEncoding('utf8');
    let pending = '';
    socket.on('data', chunk => {
      if (this.socket !== socket) return;
      pending += chunk;
      if (pending.length > MAX_MESSAGE * 4) { socket.destroy(); return; }
      let index;
      while ((index = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        if (!line || line.length > MAX_MESSAGE) continue;
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message && typeof message === 'object' && typeof message.type === 'string') this.emit('message', message);
      }
    });
    socket.on('error', () => { /* 'close' follows and reports it */ });
    socket.on('close', () => {
      if (this.socket !== socket) return;
      this.socket = null;
      // Like the Steam link: the host goes back to waiting, the guest has nothing to wait in.
      this.emit('status', { type: 'disconnected', message: '对方离开了房间。' });
      if (role === 'host' && this.server) this.emit('status', { type: 'waiting', mode: 'quick' });
      else this.close();
    });
    const other = role === 'host' ? ROLE_NAMES.join : ROLE_NAMES.host;
    this.emit('status', { type: 'connected', role, peer: { id: `local-${role === 'host' ? 'join' : 'host'}`, name: other } });
  }

  send(message) {
    if (!this.socket || this.socket.destroyed) return false;
    const line = JSON.stringify(message);
    if (line.length > MAX_MESSAGE) return false;
    this.socket.write(`${line}\n`);
    return true;
  }

  // Drop the socket and stop listening, without telling the renderer.
  close() {
    this.generation++;
    if (this.retry) { clearTimeout(this.retry); this.retry = null; }
    if (this.socket) { const socket = this.socket; this.socket = null; socket.destroy(); }
    if (this.server) { const server = this.server; this.server = null; server.close(); }
  }
}

module.exports = { LocalService, LocalLink, localNetRole, localNetPort, DEFAULT_PORT };
