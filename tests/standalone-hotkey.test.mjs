import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { windowsCalibrationHotkey } from '../src/standalone-hotkey.ts';

test('Windows registers Ctrl+Shift+F8, dispatches its message, reports a conflict and releases the chord', {
  skip: process.platform !== 'win32', timeout: 25_000,
}, async t => {
  const desktop = 'DeltaHotkeyTest-' + randomUUID();
  const probe = fileURLToPath(new URL('./fixtures/hotkey-desktop.cs', import.meta.url));
  const spawn = cp.spawn;
  const exits = [];
  let diagnostics = '';
  const replacement = t.mock.method(cp, 'spawn', (command, args, options) => {
    const bootstrap = args.at(-1).replace('[DeltaObservation.CalibrationHotkey]::Run()',
      'Add-Type -TypeDefinition ([IO.File]::ReadAllText($env:DELTA_TEST_PROBE))\n[HotkeyTestDesktop]::Run($env:DELTA_TEST_DESKTOP,[DeltaObservation.CalibrationHotkey])');
    const child = spawn(command, [...args.slice(0, -1), bootstrap], {
      ...options, env: { ...options.env, DELTA_TEST_DESKTOP: desktop, DELTA_TEST_PROBE: probe },
    });
    child.stderr.on('data', bytes => { diagnostics += bytes.toString(); });
    exits.push(once(child, 'close'));
    return child;
  });
  syncBuiltinESMExports();
  const releases = [];
  t.after(async () => {
    for (const release of releases) release();
    await Promise.allSettled(exits);
    replacement.mock.restore();
    syncBuiltinESMExports();
  });
  function register() {
    const status = Promise.withResolvers(), pressed = Promise.withResolvers();
    const release = windowsCalibrationHotkey.register(pressed.resolve, status.resolve);
    releases.push(release);
    return { status: status.promise, pressed: pressed.promise, release };
  }
  const first = register();
  assert.equal(await first.status, 'registered', diagnostics);
  await first.pressed;
  assert.equal(await register().status, 'occupied');
  first.release();
  const next = register();
  assert.equal(await next.status, 'registered');
  await next.pressed;
});
