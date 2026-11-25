import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { WorldAssembly } from 'cortico/world.ts';
import { DELTA_DEFAULTS, deltaDefinition } from '../src/index.ts';

// A 1 × 1 PNG is the frame payload emitted by this capture-port fixture.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMI7fgPAAMSAd1og97+AAAAAElFTkSuQmCC', 'base64');
const host = { modelFacts: { accepts: () => true } };

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'delta-id-debug-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const configPath = join(root, 'config.json');
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  cfg.detection.nickname = 'SavedPlayer';
  await writeFile(configPath, JSON.stringify({ worlds: { delta: cfg } }));
  const policy = { revision: 'one', viewEnabled: true, viewPermitted: true, observationEnabled: true,
    displayId: 'offline-test', corePaused: false, outputAvailable: true };
  const binding = { version: 1, snapshot: () => ({ ...policy }) };
  const folder = join(root, 'worlds', 'delta', 'identity-debug');
  async function boot(calibrationOperation, options = {}) {
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const assembly = new WorldAssembly({ config, rootDir: root, dataDir: root },
      [deltaDefinition({ binding, calibrationOperation, ...options })], ['delta']);
    const world = assembly.slot('delta').instance;
    await world.start(host);
    t.after(() => world.stop());
    return { call: (name, ...args) => world.webUi('en').invoke('observer', name, args), stop: () => world.stop() };
  }
  const history = async () => (await readFile(join(folder, 'attempts.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  return { root, configPath, policy, folder, boot, history };
}

function candidate(_request, _signal, progress) {
  progress({ kind: 'frame', displayId: 'offline-test', systemNumber: 1, width: 1, height: 1, capturedAt: new Date().toISOString(), png });
  return { status: 'identity', suggestion: { status: 'candidate', nickname: 'SavedPlayer' } };
}

test('calibrations retain separate frames through failed saves and restart; confirmed saves remove only their PNGs', async t => {
  const f = await fixture(t);
  const { call, stop } = await f.boot(candidate);
  const first = await call('identitySuggest');
  const second = await call('identitySuggest');
  assert.equal(first.status, 'candidate');
  assert.equal(second.status, 'candidate');
  assert.notEqual(first.attemptId, second.attemptId);
  assert.notEqual(first.screenshot, second.screenshot);
  const preserved = ['other.png', 'other.txt'];
  for (const name of preserved) await writeFile(join(f.folder, name), 'owned elsewhere');
  const outside = join(f.root, 'unrelated.png');
  await writeFile(outside, 'unrelated');
  for (const attempt of [first, second]) {
    assert.deepEqual(await readFile(join(f.folder, attempt.screenshot)), png);
    const records = (await f.history()).filter(row => row.attemptId === attempt.attemptId);
    assert.equal(records[0].stage, 'start');
    assert.equal(records.at(-1).stage, 'finish');
    assert.equal(records.at(-1).screenshot, attempt.screenshot);
  }
  await assert.rejects(call('identitySave', '匿名玩家'));
  // Make the real Core config path unwritable for this operation, preserving the original config for restart.
  await rename(f.configPath, f.configPath + '.backup');
  await mkdir(f.configPath);
  try { await assert.rejects(call('identitySave', 'SavedPlayer')); }
  finally {
    await rmdir(f.configPath);
    await rename(f.configPath + '.backup', f.configPath);
  }
  for (const attempt of [first, second]) assert.deepEqual(await readFile(join(f.folder, attempt.screenshot)), png);
  await call('identitySave', 'SavedPlayer');
  const entries = await readdir(f.folder);
  for (const attempt of [first, second]) assert.ok(!entries.includes(attempt.screenshot));
  for (const name of preserved) assert.equal(await readFile(join(f.folder, name), 'utf8'), 'owned elsewhere');
  const third = await call('identitySuggest');
  const beforeRestart = await f.history();
  await stop();
  const rebooted = await f.boot(candidate);
  assert.deepEqual((await rebooted.call('state')).identityDebug, { hasLog: true, pendingFrames: true });
  assert.deepEqual(await readFile(join(f.folder, third.screenshot)), png);
  await rebooted.call('identitySave', 'ManualPlayer');
  assert.equal(JSON.parse(await readFile(f.configPath, 'utf8')).worlds.delta.detection.nickname, 'ManualPlayer');
  assert.ok(!(await readdir(f.folder)).includes(third.screenshot));
  assert.deepEqual((await f.history()).slice(0, beforeRestart.length), beforeRestart);
  assert.equal(await readFile(outside, 'utf8'), 'unrelated');
  assert.deepEqual((await rebooted.call('state')).identityDebug, { hasLog: true, pendingFrames: false });
});

test('blocked and failed capture attempts retain distinct reasons without creating screenshots', async t => {
  const f = await fixture(t);
  let requests = 0;
  const { call } = await f.boot(() => {
    requests++;
    return { status: 'capture-unavailable', reason: 'source-changed' };
  });
  f.policy.viewPermitted = false;
  const denied = await call('identitySuggest');
  assert.equal(requests, 0);
  f.policy.viewPermitted = true;
  const failed = await call('identitySuggest');
  assert.equal(requests, 1);
  assert.notEqual(denied.attemptId, failed.attemptId);
  assert.equal(denied.reason, 'permission-denied');
  assert.equal(failed.reason, 'source-changed');
  for (const attempt of [denied, failed]) {
    assert.equal(attempt.status, 'capture-unavailable');
    const row = (await f.history()).find(item => item.attemptId === attempt.attemptId && item.stage === 'finish');
    assert.ok(row.reason);
    assert.equal(row.reason, attempt.reason);
    assert.equal(row.screenshot, null);
  }
  assert.deepEqual((await readdir(f.folder)).filter(name => name.endsWith('.png')), []);
});

test('the log action selects the persisted JSONL and still works after saving', async t => {
  const f = await fixture(t);
  let selected;
  const open = async path => { selected = { path, contents: await readFile(path, 'utf8') }; };
  const { call } = await f.boot(candidate, { screenshotReveal: { open } });
  await assert.rejects(call('identityDebugReveal'));
  const attempt = await call('identitySuggest');
  await call('identitySave', 'SavedPlayer');
  assert.deepEqual(await call('identityDebugReveal'), { ok: true });
  assert.equal(selected.path, join(f.folder, 'attempts.jsonl'));
  assert.equal(selected.contents.split('\n').filter(Boolean).map(line => JSON.parse(line)).at(-1).attemptId, attempt.attemptId);
  await assert.rejects(call('identityDebugReveal', f.configPath));
});

test('failed recognition and a worker timeout retain each acquired frame until manual confirmation', async t => {
  const f = await fixture(t);
  let timedOut = false;
  const { call } = await f.boot((request, signal, progress) => {
    candidate(request, signal, progress);
    if (timedOut) return { status: 'capture-unavailable', reason: 'worker-timeout' };
    progress({ kind: 'trace', event: { stage: 'finish', status: 'nickname-unreadable', reason: 'no-selected-tab',
      ocrCalls: 1, localOcrStarted: false, deadlineSkipped: false } });
    return { status: 'identity', suggestion: { status: 'nickname-unreadable' } };
  });
  const shortCircuit = await call('identitySuggest');
  timedOut = true;
  const timeout = await call('identitySuggest');
  assert.equal(shortCircuit.reason, 'no-selected-tab');
  assert.equal(timeout.reason, 'worker-timeout');
  assert.notEqual(shortCircuit.screenshot, timeout.screenshot);
  const history = await f.history();
  for (const attempt of [shortCircuit, timeout]) {
    assert.deepEqual(await readFile(join(f.folder, attempt.screenshot)), png);
    const finish = history.findLast(row => row.stage === 'finish' && row.attemptId === attempt.attemptId);
    assert.equal(finish.screenshot, attempt.screenshot);
    assert.equal(finish.reason, attempt.reason);
  }
  assert.equal(history.find(row => row.stage === 'recognition-finish' && row.attemptId === shortCircuit.attemptId).ocrCalls, 1);
  await call('identitySave', 'ManualEntry');
  assert.deepEqual((await readdir(f.folder)).filter(name => name.endsWith('.png')), []);
});

test('a second click while reading gets its own log entry; a confirmed save discards a late frame', async t => {
  const f = await fixture(t);
  const port = Promise.withResolvers(), result = Promise.withResolvers();
  const { call } = await f.boot((_request, signal, progress) => {
    port.resolve({ signal, progress });
    return result.promise;
  });
  const active = call('identitySuggest');
  const { signal, progress } = await port.promise;
  const busy = await call('identitySuggest');
  assert.equal(busy.reason, 'busy');
  const candidateResult = candidate(null, null, progress);
  assert.deepEqual((await call('state')).identityDebug, { hasLog: true, pendingFrames: true });
  await call('identitySave', 'ManualEntry');
  assert.ok(signal.aborted);
  candidate(null, null, progress);
  result.resolve(candidateResult);
  const cancelled = await active;
  assert.equal(cancelled.reason, 'id-saved');
  assert.notEqual(busy.attemptId, cancelled.attemptId);
  assert.equal((await readdir(f.folder)).filter(name => name.endsWith('.png')).length, 0);
  for (const attempt of [busy, cancelled]) {
    const rows = (await f.history()).filter(row => row.attemptId === attempt.attemptId);
    assert.equal(rows.filter(row => row.stage === 'finish').length, 1);
    assert.equal(rows.at(-1).reason, attempt.reason);
  }
});

test('revoking capture permission before the frame arrives suppresses its archive', async t => {
  const f = await fixture(t);
  const port = Promise.withResolvers(), result = Promise.withResolvers();
  const { call } = await f.boot((_request, _signal, progress) => {
    port.resolve(progress);
    return result.promise;
  });
  const pending = call('identitySuggest');
  const progress = await port.promise;
  Object.assign(f.policy, { viewPermitted: false, revision: 'two' });
  result.resolve(candidate(null, null, progress));
  const cancelled = await pending;
  assert.equal(cancelled.reason, 'permission-revoked');
  assert.equal((await readdir(f.folder)).filter(name => name.endsWith('.png')).length, 0);
  assert.equal((await f.history()).findLast(row => row.stage === 'finish').screenshot, null);
});
