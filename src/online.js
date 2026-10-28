import { NetSession } from './net-session.js';

// Bridges the desktop app's Steam link (window.wankaiNet: electron/preload.cjs,
// electron/steam-link.cjs) to a NetSession. The link finds the opponent
// through a Steam lobby; once both players are in it, a NetSession takes over
// with the lobby owner as host. In a plain browser there is no link, so online
// play is off.
export const onlineAvailable = () => typeof window !== 'undefined' && !!window.wankaiNet;

let current = null;

export function detach(session, net = session.net) {
  if (net && session.net !== net) return;
  session.net = null;
  session.netInfo = null;
  session.replica = false;
  session.localPlayerId = 0;
  session.mode = 'ai';
  session.publish();
}

// One matchmaking attempt, from the first click until the player leaves.
// onStatus receives the link's status objects (see steam-link.cjs).
class OnlineMatch {
  constructor(session, api, onStatus) {
    this.session = session;
    this.api = api;
    this.onStatus = onStatus;
    this.net = null;
    this.name = '';
    this.offStatus = api.onStatus(status => this.status(status));
    this.offMessage = api.onMessage(message => this.net?.receive(message));
  }

  status(status) {
    if (status?.type === 'connected') this.attach(status.role, status.peer);
    else if (status?.type === 'disconnected' && this.net) {
      const net = this.net;
      // Before the handshake finished nothing is lost: the host keeps waiting
      // in its lobby, the guest is told why and can search again.
      if (net.phase === 'connected') net.closed(status.message);
      else { this.net = null; detach(this.session, net); }
    }
    this.onStatus?.(status);
  }

  attach(role, peer) {
    if (this.net) detach(this.session, this.net);
    const net = new NetSession(this.session, { send: message => this.api.send(message), close: () => this.api.close() },
      { role, version: this.api.version, name: this.name });
    if (peer?.name) net.peer.name = String(peer.name).slice(0, 32);
    net.dispose = () => this.dispose();
    this.net = net;
    if (role === 'guest') net.hello(); else net.publish();
  }

  dispose() {
    if (current === this) current = null;
    this.offStatus();
    this.offMessage();
    this.onStatus = null;
    this.api.close();
    if (this.net) { const net = this.net; this.net = null; detach(this.session, net); }
  }
}

export async function steamStatus() {
  if (!onlineAvailable()) return { ok: false, message: '联机需要桌面版。' };
  try { return await window.wankaiNet.steam(); } catch (error) { return { ok: false, message: error.message }; }
}

// Stop searching / waiting / playing online, without a word to the peer.
export function cancelOnline(session) {
  if (current) current.dispose();
  else if (session?.net) session.net.dispose?.();
}

async function begin(session, onStatus, action) {
  if (!onlineAvailable()) throw new Error('请在桌面版中使用联机对战。');
  cancelOnline(session);
  const api = window.wankaiNet;
  const match = new OnlineMatch(session, api, onStatus);
  current = match;
  onStatus?.({ type: 'connecting' });
  const steam = await steamStatus();
  if (current !== match) return { ok: false, cancelled: true };
  if (!steam.ok) { match.dispose(); onStatus?.({ type: 'error', message: steam.message }); return steam; }
  match.name = steam.name || '';
  const result = await action(api);
  if (!result?.ok && current === match) {
    match.dispose();
    if (!result?.cancelled) onStatus?.({ type: 'error', message: result?.message || '联机失败。' });
  }
  return result;
}

// 快速匹配: join a waiting player of the same version, or wait for one.
export const quickMatch = (session, onStatus) => begin(session, onStatus, api => api.quickMatch());
// 邀请好友: a friends-only lobby, and Steam's invite dialog.
export const inviteFriend = (session, onStatus) => begin(session, onStatus, api => api.invite());
// A Steam invite the player accepted (in game, or by launching the game from it).
export const joinInvite = (session, lobbyId, onStatus) => begin(session, onStatus, api => api.joinInvite(lobbyId));
export const openInviteDialog = () => window.wankaiNet?.openInviteDialog();
