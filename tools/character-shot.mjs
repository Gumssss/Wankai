#!/usr/bin/env node
// Renders a character contact sheet (reference + in-game body from the
// reference angle, front, both 3/4s, side, back and the skill pose) to a PNG.
//
//   node tools/character-shot.mjs naiwa --ref 奶蛙.webp --yaw 25 --pitch 8 --out .local/shots/naiwa.png
//   options: --fov 22, --weapon sword --theta 0.82 (the weapon floats beside it as in the arena)
// Reuses a running dev server on 5173, otherwise starts one for the shot.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEV_URL = 'http://127.0.0.1:5173/';
const args = process.argv.slice(2), id = args.find(arg => !arg.startsWith('--'));
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
if (!id) {
  console.error('usage: node tools/character-shot.mjs <id> [--ref image] [--yaw deg] [--pitch deg] [--fov deg] [--out file.png]');
  process.exit(1);
}
const out = path.resolve(ROOT, option('out') ?? `.local/shots/${id}.png`);
await mkdir(path.dirname(out), { recursive: true });

async function running() {
  try { return (await (await fetch(DEV_URL)).text()).includes('木昆竞技场'); } catch { return false; }
}
let server = null;
if (!(await running())) {
  const { createServer } = await import('vite');
  server = await createServer({ root: ROOT, logLevel: 'error' });
  await server.listen();
}

const query = new URLSearchParams({ id });
for (const key of ['ref', 'yaw', 'pitch', 'fov', 'weapon', 'theta']) if (option(key) !== undefined) query.set(key, option(key));
const env = { ...process.env, SHOT_URL: `${DEV_URL}tools/character-sheet.html?${query}`, SHOT_OUT: out };
delete env.ELECTRON_RUN_AS_NODE;
const electron = createRequire(import.meta.url)('electron');
const code = await new Promise(resolve => {
  const child = spawn(electron, [path.join(ROOT, 'tools', 'electron-shot.cjs')], { cwd: ROOT, env, stdio: 'inherit' });
  child.on('exit', resolve);
});
await server?.close();
if (code === 0) console.log(`wrote ${path.relative(ROOT, out)}`);
process.exit(code ?? 1);
