import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { createFrameSource } from '../src/standalone-capture.ts';

test('a helper exiting halfway through a response rejects pending and queued captures', { skip: process.platform !== 'win32' }, async t => {
  const spawn = cp.spawn;
  const standIn = "process.stdin.once('data', () => process.stdout.write(Buffer.from([8, 0, 0, 0, 123]), () => process.exit(0)))";
  const replacement = t.mock.method(cp, 'spawn', (_command, _args, options) => spawn(process.execPath, ['-e', standIn], options));
  syncBuiltinESMExports();
  const source = createFrameSource();
  t.after(async () => {
    replacement.mock.restore();
    syncBuiltinESMExports();
    await source.close();
  });
  await Promise.all([
    assert.rejects(source.capture('synthetic-display'), { code: 'captureTransportFailed' }),
    assert.rejects(source.capture('synthetic-display'), { code: 'captureTransportFailed' }),
  ]);
});
