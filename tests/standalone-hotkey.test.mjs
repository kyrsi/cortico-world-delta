import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { windowsCalibrationHotkey } from '../src/standalone-hotkey.ts';

async function calibrationChordAvailability() {
  const probe = fileURLToPath(new URL('./fixtures/hotkey-chord-probe.cs', import.meta.url));
  const command = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = "$ErrorActionPreference = 'Stop'\nAdd-Type -TypeDefinition ([IO.File]::ReadAllText($env:DELTA_TEST_PROBE))\n[HotkeyChordProbe]::Run()";
  const child = cp.spawn(command, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true, env: { ...process.env, DELTA_TEST_PROBE: probe }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '', err = '';
  child.stdout.on('data', bytes => { out += bytes.toString(); });
  child.stderr.on('data', bytes => { err += bytes.toString(); });
  const timer = setTimeout(() => child.kill(), 20_000);
  const [code] = await once(child, 'close');
  clearTimeout(timer);
  if (code !== 0) throw new Error(`hotkey probe exited ${code}: ${err}`);
  return out.trim().split(/\r?\n/).at(-1);
}

const chord = process.platform === 'win32' ? await calibrationChordAvailability() : 'free';

test('Windows registers Ctrl+Shift+F8, dispatches its message, reports a conflict and releases the chord', {
  skip: process.platform !== 'win32' || (chord === 'occupied' && 'Ctrl+Shift+F8 is already registered by another process'),
  timeout: 25_000,
}, async t => {
  assert.equal(chord, 'free');
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
