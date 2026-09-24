#!/usr/bin/env node
/*
 * Validate mission and event packs without opening the game.
 *
 *   node tools/validate-content.mjs                 # every pack under content/
 *   node tools/validate-content.mjs path/to/pack.js # just these files (plus nothing else)
 *
 * Uses the exact same rules as the game (js/schema.js). Exits with code 1 if
 * any definition has errors, so it can gate a commit or CI step.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = ['js/core.js', 'js/data.js', 'assets/manifest.js', 'js/schema.js'];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out.sort();
}

const args = process.argv.slice(2);
const packs = args.length ? args.map(a => path.resolve(a)) : walk(path.join(root, 'content'));

const sandbox = { console: { warn() {}, info() {}, log: console.log, error: console.error } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of engine) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });

const perFile = [];
for (const f of packs) {
  const before = { e: sandbox.ST.content.errors.length, w: sandbox.ST.content.warnings.length, n: sandbox.ST.content.order.length };
  try {
    vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f });
  } catch (err) {
    sandbox.ST.content.errors.push(path.relative(root, f) + ': JavaScript error: ' + err.message);
  }
  perFile.push({ file: path.relative(root, f), loaded: sandbox.ST.content.order.length - before.n, errors: sandbox.ST.content.errors.length - before.e, warnings: sandbox.ST.content.warnings.length - before.w });
}
const res = sandbox.ST.content.finalize();

const C = sandbox.ST.content;
const missions = Object.values(C.missions), events = Object.values(C.events);
console.log('\nFrontier Command content check\n');
for (const p of perFile) console.log('  ' + (p.errors ? '✗' : '✓') + ' ' + p.file.padEnd(40) + ' ' + String(p.loaded).padStart(3) + ' loaded' + (p.errors ? '  ' + p.errors + ' error(s)' : '') + (p.warnings ? '  ' + p.warnings + ' warning(s)' : ''));
console.log('\n  Missions: ' + missions.length + ' (' + missions.filter(m => m.crisis).length + ' crisis)   Events: ' + events.length);
const byCtx = {};
events.forEach(e => { byCtx[e.context] = (byCtx[e.context] || 0) + 1; });
console.log('  Events by context: ' + Object.entries(byCtx).map(([k, v]) => k + ' ' + v).join(', '));
const byCat = {};
missions.forEach(m => { byCat[m.category] = (byCat[m.category] || 0) + 1; });
console.log('  Missions by category: ' + Object.entries(byCat).map(([k, v]) => k + ' ' + v).join(', '));

if (res.warnings.length) { console.log('\nWarnings (' + res.warnings.length + '):'); res.warnings.forEach(w => console.log('  ! ' + w)); }
if (res.errors.length) {
  console.log('\nErrors (' + res.errors.length + '):');
  res.errors.forEach(e => console.log('  ✗ ' + e));
  console.log('\nDefinitions with errors are skipped by the game.\n');
  process.exit(1);
}
console.log('\nAll content is valid.\n');
