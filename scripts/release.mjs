// Cuts a release: bumps the version in manifest.json and package.json, runs the
// checks and tests, builds dist/better-edurec-<version>.zip, commits and tags.
//
// Usage:
//   npm run release            patch bump (0.2.0 -> 0.2.1)
//   npm run release -- minor   minor bump (0.2.0 -> 0.3.0)
//   npm run release -- major   major bump (0.2.0 -> 1.0.0)
//   npm run release -- 1.4.2   exact version
// Flags:
//   --push      also push the commit and tag, and attach the zip to a GitHub release
//   --dry-run   print what would happen without changing anything
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const push = args.includes('--push');
const dry = args.includes('--dry-run');
const kind = args.find((a) => !a.startsWith('--')) || 'patch';

const run = (cmd, opts = {}) => execSync(cmd, { cwd: ROOT, stdio: opts.quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
const fail = (msg) => { console.error('release: ' + msg); process.exit(1); };
const readJson = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'));
const writeJson = (f, obj) => writeFileSync(resolve(ROOT, f), JSON.stringify(obj, null, 2) + '\n');

function bump(version, how) {
  if (/^\d+\.\d+\.\d+$/.test(how)) return how;
  const [maj, min, pat] = version.split('.').map(Number);
  if (how === 'major') return (maj + 1) + '.0.0';
  if (how === 'minor') return maj + '.' + (min + 1) + '.0';
  if (how === 'patch') return maj + '.' + min + '.' + (pat + 1);
  return fail('unknown bump "' + how + '" (use patch, minor, major or x.y.z)');
}

const newer = (a, b) => {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
  return false;
};

const manifest = readJson('manifest.json');
const pkg = readJson('package.json');
const current = manifest.version;
const next = bump(current, kind);
if (!newer(next, current)) fail(next + ' is not higher than the current ' + current + '; the Chrome Web Store rejects it.');

const dirty = run('git status --porcelain', { quiet: true }).trim();
if (dirty && !dry) fail('commit or stash your changes first:\n' + dirty);
const tag = 'v' + next;
if (run('git tag --list ' + tag, { quiet: true }).trim()) fail('tag ' + tag + ' already exists.');

console.log('release: ' + current + ' -> ' + next + (dry ? ' (dry run)' : ''));
if (dry) {
  console.log('would: set version in manifest.json and package.json, npm run pack, commit "Release ' + tag + '", tag ' + tag + (push ? ', push, GitHub release with the zip' : ''));
  process.exit(0);
}

manifest.version = next;
pkg.version = next;
writeJson('manifest.json', manifest);
writeJson('package.json', pkg);

try {
  run('npm run pack');
} catch (e) {
  run('git checkout -- manifest.json package.json');
  fail('checks or tests failed; versions restored.');
}

const zip = 'dist/better-edurec-' + next + '.zip';
run('git add manifest.json package.json');
run('git commit -q -m "Release ' + tag + '"');
run('git tag -a ' + tag + ' -m "Release ' + tag + '"');
console.log('release: committed and tagged ' + tag + '; built ' + zip);

if (push) {
  run('git push -q');
  run('git push -q origin ' + tag);
  try {
    run('gh release create ' + tag + ' ' + zip + ' --title "' + tag + '" --generate-notes');
  } catch (e) {
    console.warn('release: pushed, but the GitHub release failed. Retry with: gh release create ' + tag + ' ' + zip + ' --generate-notes');
  }
}

console.log('\nNext: Chrome Web Store Developer Dashboard > Better EduRec > Package > Upload new package > ' + zip + ' > Submit for review.');
if (!push) console.log('Push when ready: git push && git push origin ' + tag + '  (or rerun with --push next time)');
