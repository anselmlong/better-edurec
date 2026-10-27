// Builds the store zip, dist/better-edurec-<version>.zip. The manifest in the
// zip drops the development reloader (dev/reload.js and its "background" key),
// which only the unpacked extension loaded from this folder uses.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const BUILD = join(ROOT, 'dist', 'build');
const FILES = ['src', 'popup', 'faq', 'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png'];

const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
delete manifest.background;
const zip = join(ROOT, 'dist', 'better-edurec-' + manifest.version + '.zip');

rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
for (const f of FILES) cpSync(join(ROOT, f), join(BUILD, f), { recursive: true });
writeFileSync(join(BUILD, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
execSync('zip -qr ' + JSON.stringify(zip) + " . -x '*.DS_Store'", { cwd: BUILD, stdio: 'inherit' });
rmSync(BUILD, { recursive: true, force: true });
console.log('built ' + zip.slice(ROOT.length + 1));
