const { app, BrowserWindow, Menu, ipcMain, nativeImage } = require('electron');
const path = require('node:path');
const { SteamService, STEAM_APP_ID } = require('./steam-link.cjs');

const ROOT = path.join(__dirname, '..');
const DEV_URL = 'http://127.0.0.1:5173/';
// Both players must run the same build; the version travels in the lobby data and the handshake.
const VERSION = require('../package.json').version;
// A packaged app always runs the built page; in development `--dist` (npm run preview:electron) does too.
const USE_DIST = app.isPackaged || process.argv.includes('--dist') || process.env.WANKAI_DIST === '1';
// The packaged exe and the macOS bundle carry the icon themselves; a development
// window would otherwise show Electron's.
const DEV_ICON = app.isPackaged ? null : path.join(ROOT, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

// DEV ONLY: `--local-net=host|join` (npm run dev:host / dev:join) plays online
// between two windows on this machine over 127.0.0.1 instead of Steam. Never in
// a packaged build: the module is not even shipped there.
const localRole = app.isPackaged ? null : require('./local-link.cjs').localNetRole();
// The joining window is a second player: give it its own profile (settings, caches).
if (localRole === 'join') app.setPath('userData', path.join(ROOT, '.local', 'second-player'));

// Online play runs over Steam (lobbies + P2P). The overlay, which shows the
// invite dialog, has to be switched on before the app is ready. It does not
// hook into Electron on macOS, where its switches would only cost performance.
const steam = localRole ? createLocalService(localRole) : new SteamService({ version: VERSION });
if (!localRole && process.platform !== 'darwin' && process.env.WANKAI_NO_STEAM_OVERLAY !== '1') {
  try { require('steamworks.js').electronEnableSteamOverlay(); } catch (error) { console.warn(`Steam overlay unavailable: ${error.message}`); }
}
// Steam starts the game with `+connect_lobby <id>` when a friend's invite is accepted while it is closed.
// Local mode pretends both windows got an invite, so they open the online panel and connect by themselves.
let pendingInvite = localRole ? 'local' : (() => { const at = process.argv.indexOf('+connect_lobby'); return at >= 0 ? process.argv[at + 1] || null : null; })();
steam.onInvite = lobbyId => {
  const target = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (target && !target.webContents.isDestroyed()) target.webContents.send('net:invited', lobbyId);
  else pendingInvite = lobbyId;
};

function createLocalService(role) {
  const { LocalService, localNetPort } = require('./local-link.cjs');
  const service = new LocalService({ role, port: localNetPort() });
  console.log(`[dev] 本机联机：${role === 'host' ? '房主' : '加入'} · 127.0.0.1:${service.port}${role === 'join' ? ` · userData ${app.getPath('userData')}` : ''}`);
  return service;
}

// Each window owns one Steam link, so a lobby belongs to the window that opened it.
const links = new Map();
function linkFor(contents) {
  if (!links.has(contents.id)) {
    links.set(contents.id, steam.createLink((channel, payload) => { if (!contents.isDestroyed()) contents.send(`net:${channel}`, payload); }));
    contents.once('destroyed', () => { const link = links.get(contents.id); if (link) steam.removeLink(link); links.delete(contents.id); });
  }
  return links.get(contents.id);
}

ipcMain.handle('net:steam', () => steam.start());
ipcMain.handle('net:quick-match', event => linkFor(event.sender).quickMatch());
ipcMain.handle('net:create-invite', event => linkFor(event.sender).invite());
ipcMain.handle('net:join-invite', (event, lobbyId) => linkFor(event.sender).joinInvite(String(lobbyId ?? '')));
ipcMain.handle('net:take-invite', () => { const lobbyId = pendingInvite; pendingInvite = null; return lobbyId; });
ipcMain.on('net:invite-dialog', event => links.get(event.sender.id)?.openInviteDialog());
ipcMain.on('net:send', (event, message) => {
  if (message && typeof message === 'object' && typeof message.type === 'string') links.get(event.sender.id)?.send(message);
});
ipcMain.on('net:close', event => links.get(event.sender.id)?.close());
// 退出游戏 closes the asking window; the app quits once no window is left. On macOS
// closing the last window would leave the app running in the dock, so quit outright.
ipcMain.on('app:quit', event => {
  if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length <= 1) app.quit();
  else BrowserWindow.fromWebContents(event.sender)?.close();
});

// macOS needs an application menu for Cmd+Q / Cmd+W / Cmd+C / Cmd+V / full screen.
// Windows and Linux keep Electron's default menu while developing and have none when packaged.
function installMenu() {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { label: '显示', submenu: [
        ...(app.isPackaged ? [] : [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }]),
        { role: 'togglefullscreen' },
      ] },
      { role: 'windowMenu' },
    ]));
  } else if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }
}

function createWindow(options = {}) {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: '#f3e9d4',
    title: '木昆竞技场',
    ...(DEV_ICON && process.platform !== 'darwin' ? { icon: nativeImage.createFromPath(DEV_ICON) } : {}),
    ...options,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: [`--wankai-version=${VERSION}`, ...(localRole ? [`--wankai-local-net=${localRole}`] : [])],
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      ...options.webPreferences,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== DEV_URL) event.preventDefault();
  });
  if (USE_DIST) {
    window.loadFile(path.join(ROOT, 'dist', 'index.html'));
  } else {
    window.loadURL(DEV_URL);
  }
  return window;
}

// Test harnesses require this file and open their own windows.
module.exports = { createWindow };
if (require.main === module || !process.env.WANKAI_HARNESS) {
  app.whenReady().then(() => {
    // A released build started outside Steam is relaunched through Steam (not for the 480 test app).
    if (app.isPackaged && STEAM_APP_ID !== 480) {
      try { if (require('steamworks.js').restartAppIfNecessary(STEAM_APP_ID)) { app.quit(); return; } } catch { /* start anyway */ }
    }
    installMenu();
    if (DEV_ICON && process.platform === 'darwin') app.dock?.setIcon(nativeImage.createFromPath(DEV_ICON));
    // Start Steam before the first window, so the overlay can hook it. Failure is
    // only reported when the player opens online play.
    steam.start();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('before-quit', () => steam.shutdown());
// On macOS the app stays in the dock with no window, as Mac apps do; activate reopens one.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
