import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const build = pkg.build;

test('the dev-only local link never ships, on any platform', () => {
  for (const files of [build.files, build.win.files, build.mac.files]) {
    assert.ok(files.includes('!electron/local-link.cjs'), JSON.stringify(files));
    assert.ok(files.includes('dist/**/*') && files.includes('electron/**/*'));
  }
  // main.cjs only loads it when the app is not packaged.
  const main = readFileSync(new URL('electron/main.cjs', root), 'utf8');
  assert.match(main, /const localRole = app\.isPackaged \? null : require\('\.\/local-link\.cjs'\)/);
  assert.match(main, /const USE_DIST = app\.isPackaged \|\|/);
});

test('steamworks.js native files are unpacked from the asar', () => {
  assert.deepEqual(build.asarUnpack, ['node_modules/steamworks.js/**']);
  assert.ok(pkg.dependencies['steamworks.js']);
  // Only the main process needs runtime packages; the page is bundled by Vite.
  assert.deepEqual(Object.keys(pkg.dependencies), ['steamworks.js']);
});

test('the icons exist and the .ico carries every size from 16 to 256 px', () => {
  for (const file of [build.win.icon, build.mac.icon, 'build/icon.png', 'public/favicon.png']) assert.ok(existsSync(new URL(file, root)), file);
  const ico = readFileSync(new URL(build.win.icon, root));
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b);
  assert.deepEqual(sizes, [16, 24, 32, 48, 64, 128, 256]);
  assert.equal(readFileSync(new URL(build.mac.icon, root)).toString('latin1', 0, 4), 'icns');
});
