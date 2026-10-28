// Starts the desktop game from any terminal: reuses or starts the Vite dev server, then opens Electron.
// `node electron/launch.cjs [--dist]`
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
// In plain Node, the electron package resolves to the path of its executable.
const electronPath = require('electron');

const ROOT = path.join(__dirname, '..');
const DEV_URL = 'http://127.0.0.1:5173/';
const args = process.argv.slice(2);

function probe(url) {
  return new Promise(resolve => {
    const request = http.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(body));
    });
    request.on('error', () => resolve(null));
    request.setTimeout(1500, () => { request.destroy(); resolve(null); });
  });
}

async function devServer() {
  const page = await probe(DEV_URL);
  // A dev server for this game is already running (e.g. from `npx vite`).
  if (page !== null && page.includes('木昆竞技场')) return null;
  if (page !== null) throw new Error('5173 端口被其他程序占用，请关闭占用该端口的程序后重试。');
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT });
  await server.listen();
  server.printUrls();
  return server;
}

async function main() {
  const server = args.includes('--dist') ? null : await devServer();
  // VS Code terminals can leak ELECTRON_RUN_AS_NODE, which turns Electron into plain Node.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronPath, ['.', ...args], { cwd: ROOT, env, stdio: 'inherit' });
  const stop = () => { if (!child.killed) child.kill(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', async code => {
    await server?.close();
    process.exit(code ?? 0);
  });
}

main().catch(error => {
  console.error(`无法启动游戏：${error.message}`);
  process.exit(1);
});
