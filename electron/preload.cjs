// The renderer stays sandboxed; it only sees this small, validated network API
// (Steam matchmaking + messages, see electron/steam-link.cjs) and a way to close its own window.
const { contextBridge, ipcRenderer } = require('electron');

const versionArg = process.argv.find(arg => arg.startsWith('--wankai-version='));
// Set only by the dev-only local mode (npm run dev:host / dev:join, see electron/local-link.cjs).
const localArg = process.argv.find(arg => arg.startsWith('--wankai-local-net='));

contextBridge.exposeInMainWorld('wankaiNet', Object.freeze({
  version: versionArg ? versionArg.slice('--wankai-version='.length) : '0',
  local: localArg ? localArg.slice('--wankai-local-net='.length) : null,
  steam: () => ipcRenderer.invoke('net:steam'),
  quickMatch: () => ipcRenderer.invoke('net:quick-match'),
  invite: () => ipcRenderer.invoke('net:create-invite'),
  openInviteDialog: () => ipcRenderer.send('net:invite-dialog'),
  joinInvite: lobbyId => ipcRenderer.invoke('net:join-invite', String(lobbyId)),
  takeInvite: () => ipcRenderer.invoke('net:take-invite'),
  onInvite: listener => {
    const handler = (_, lobbyId) => listener(String(lobbyId));
    ipcRenderer.on('net:invited', handler);
    return () => ipcRenderer.removeListener('net:invited', handler);
  },
  send: message => ipcRenderer.send('net:send', message),
  close: () => ipcRenderer.send('net:close'),
  onMessage: listener => {
    const handler = (_, message) => listener(message);
    ipcRenderer.on('net:message', handler);
    return () => ipcRenderer.removeListener('net:message', handler);
  },
  onStatus: listener => {
    const handler = (_, status) => listener(status);
    ipcRenderer.on('net:status', handler);
    return () => ipcRenderer.removeListener('net:status', handler);
  },
}));

contextBridge.exposeInMainWorld('wankaiApp', Object.freeze({
  quit: () => ipcRenderer.send('app:quit'),
}));
