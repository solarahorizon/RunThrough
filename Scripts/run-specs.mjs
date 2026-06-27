/**
 * One command, all hooked up: serve a directory, run every *.spec.mjs against
 * it, tear the server down, exit non-zero if any spec failed.
 *
 *   node Scripts/run-specs.mjs <publicDir> <specDir> [port]
 *
 * Examples:
 *   node Scripts/run-specs.mjs Examples/DemoApp/public Examples/DemoApp/tests
 *   node Scripts/run-specs.mjs dist tests 8765        # your own build + tests
 *
 * To run your specs against a deployment instead of a local serve, skip this and
 * set BASE directly:  BASE=https://example.com node tests/checkout.spec.mjs
 *
 * Specs are run as independent child processes (each calls process.exit), so one
 * crash can't take the suite down — you get a per-spec PASS/FAIL summary.
 */
import { serve } from './serve.mjs';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const publicDir = process.argv[2];
const specDir = process.argv[3];
const port = Number(process.argv[4] || process.env.PORT || 8765);

if (!publicDir || !specDir) {
  console.error('usage: node Scripts/run-specs.mjs <publicDir> <specDir> [port]');
  process.exit(2);
}

const specs = (await readdir(specDir))
  .filter((f) => f.endsWith('.spec.mjs'))
  .sort()
  .map((f) => resolve(join(specDir, f)));

if (!specs.length) { console.error(`no *.spec.mjs found in ${specDir}`); process.exit(2); }

const server = await serve(resolve(publicDir), port);
console.log(`▶ serving ${publicDir} on http://localhost:${port}\n▶ running ${specs.length} spec(s)\n`);

const runOne = (spec) => new Promise((res) => {
  const child = spawn(process.execPath, [spec], {
    stdio: 'inherit',
    env: { ...process.env, BASE: `http://localhost:${port}`, PORT: String(port) },
  });
  child.on('exit', (code) => res({ spec, ok: code === 0 }));
});

const results = [];
for (const spec of specs) results.push(await runOne(spec)); // serial: shared port, clean logs

await new Promise((r) => server.close(r));

const failed = results.filter((r) => !r.ok);
console.log(`\n${'#'.repeat(48)}`);
console.log(`SUITE: ${results.length - failed.length}/${results.length} spec file(s) green`);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.spec.split('/').pop()}`);
process.exit(failed.length ? 1 : 0);
