#!/usr/bin/env node
// Builds the app icon: renders 奶蛙 with 奶木昆 from the real model
// (tools/icon-render.html, offscreen in Electron), then tools/make-icon.py
// composites it onto the rounded tile and writes build/icon.png (1024 px),
// build/icon.ico (16–256) and build/icon.icns.
//
//   npm run icon                     (needs Python 3 with Pillow)
//   node tools/make-icon.mjs --render-only --yaw 30 --tilt -40   (tweak the pose; see icon-render.html)
// Reuses a running dev server on 5173, otherwise starts one.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEV_URL = 'http://127.0.0.1:5173/';
const args = process.argv.slice(2);
const render = path.join(ROOT, '.local', 'icon', 'naiwa-render.png');
const bust = path.join(ROOT, '.local', 'icon', 'naiwa-bust.png');
await mkdir(path.dirname(render), { recursive: true });

async function running() {
  try { return (await (await fetch(DEV_URL)).text()).includes('木昆竞技场'); } catch { return false; }
}
let server = null;
if (!(await running())) {
  const { createServer } = await import('vite');
  server = await createServer({ root: ROOT, logLevel: 'error' });
  await server.listen();
}

// Every `--key value` pair goes to the render page (yaw, pitch, tilt, gx, gy, gd, staffScale, ty, span, …).
const query = new URLSearchParams();
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--') && args[i + 1] !== undefined && !args[i + 1].startsWith('--')) query.set(args[i].slice(2), args[++i]);
const run = (command, commandArgs, env = process.env) => new Promise(resolve => {
  const child = spawn(command, commandArgs, { cwd: ROOT, env, stdio: 'inherit' });
  child.on('exit', resolve);
  child.on('error', error => { console.error(error.message); resolve(1); });
});
const electron = createRequire(import.meta.url)('electron');
const shoot = (url, out) => {
  const env = { ...process.env, SHOT_URL: url, SHOT_OUT: out };
  delete env.ELECTRON_RUN_AS_NODE;
  return run(electron, [path.join(ROOT, 'tools', 'electron-shot.cjs')], env);
};
// The whole figure for the big sizes, a head close-up for the small ones.
let code = await shoot(`${DEV_URL}tools/icon-render.html?${query}`, render);
if (code === 0) { query.set('mode', 'bust'); code = await shoot(`${DEV_URL}tools/icon-render.html?${query}`, bust); }
await server?.close();
if (code === 0) console.log(`rendered ${path.relative(ROOT, render)} and ${path.relative(ROOT, bust)}`);
if (code === 0 && !args.includes('--render-only')) {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  code = await run(python, [path.join(ROOT, 'tools', 'make-icon.py'), render, bust, path.join(ROOT, 'build')]);
}
process.exit(code ?? 1);
