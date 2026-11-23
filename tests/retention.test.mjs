import assert from 'node:assert/strict';
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { IdentityDebugStore } from '../src/identity-debug.ts';
import { DELTA_IDENTITY_DEBUG_MAX_FRAMES, DELTA_REVEAL_MAX_SCREENSHOTS } from '../src/limits.ts';
import { revealCapture } from '../src/screenshot-reveal.ts';

function attemptId(n) {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}
function frameFile(id) { return `frame-${id}.png`; }

async function temp(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { force: true, recursive: true }));
  return root;
}

test('identity frames beyond the cap are deleted oldest-first and pendingFrames follows the files that remain', async t => {
  const root = await temp(t, 'delta-frames-');
  const cap = 2;
  const store = new IdentityDebugStore(root, { maxFrames: cap });
  assert.equal(store.state().pendingFrames, false);
  const dir = join(root, 'worlds', 'delta', 'identity-debug');
  const now = Date.now();
  const ids = [1, 2, 3].map(attemptId);
  assert.equal(store.writeFrame(ids[2], Buffer.from('3')), frameFile(ids[2]));
  await utimes(join(dir, frameFile(ids[2])), now / 1000, (now - 10_000) / 1000);
  for (const [index, id] of [ids[0], ids[1]].entries()) {
    const path = join(dir, frameFile(id));
    await writeFile(path, String(index), { mode: 0o600 });
    await utimes(path, now / 1000, (now - (40_000 - index * 10_000)) / 1000);
  }
  await writeFile(join(dir, 'other.png'), 'owned elsewhere');
  await writeFile(join(dir, 'notes.txt'), 'owned elsewhere');
  const anchor = join(dir, 'anchor.bin');
  await writeFile(anchor, 'linked');
  const linkedId = attemptId(9);
  const linkedPath = join(dir, frameFile(linkedId));
  await link(anchor, linkedPath);
  await utimes(linkedPath, now / 1000, (now - 50_000) / 1000);
  const frameDir = join(dir, frameFile(attemptId(8)));
  await mkdir(frameDir);

  const added = attemptId(4);
  assert.equal(store.writeFrame(added, Buffer.from('4')), frameFile(added));
  const names = await readdir(dir);
  const frames = names.filter(name => name.startsWith('frame-') && name.endsWith('.png') && name !== frameFile(attemptId(8)));
  assert.deepEqual(frames.sort(), [frameFile(ids[2]), frameFile(added), frameFile(linkedId)].sort());
  assert.equal(names.includes(frameFile(attemptId(8))), true);
  assert.equal(await readFile(join(dir, frameFile(added)), 'utf8'), '4');
  assert.equal(await readFile(join(dir, 'other.png'), 'utf8'), 'owned elsewhere');
  assert.equal(await readFile(linkedPath, 'utf8'), 'linked');
  assert.equal((await lstat(anchor)).nlink, 2);
  assert.equal((await lstat(frameDir)).isDirectory(), true);
  assert.equal(store.state().pendingFrames, true);
  assert.equal(new IdentityDebugStore(root, { maxFrames: cap }).state().pendingFrames, true);

  store.clearFrames();
  assert.equal(store.state().pendingFrames, false);
  const cleared = await readdir(dir);
  for (const name of [frameFile(ids[2]), frameFile(added), frameFile(linkedId)]) assert.equal(cleared.includes(name), false);
  assert.equal(cleared.includes(frameFile(attemptId(8))), true);
  assert.equal(cleared.includes('other.png'), true);
  assert.equal(await readFile(anchor, 'utf8'), 'linked');
  assert.equal(new IdentityDebugStore(root, { maxFrames: cap }).state().pendingFrames, false);
});

test('the default frame cap keeps the newest frames from the exported limit', async t => {
  const root = await temp(t, 'delta-frame-cap-');
  const store = new IdentityDebugStore(root);
  const dir = join(root, 'worlds', 'delta', 'identity-debug');
  const count = DELTA_IDENTITY_DEBUG_MAX_FRAMES + 1;
  const now = Date.now();
  for (let n = 1; n <= count; n++) {
    assert.equal(store.writeFrame(attemptId(n), Buffer.from(String(n))), frameFile(attemptId(n)));
    if (n === 1) await writeFile(join(dir, 'other.png'), 'owned elsewhere');
    if (n < count) await utimes(join(dir, frameFile(attemptId(n))), now / 1000, (now - (count - n) * 1000) / 1000);
  }
  const names = (await readdir(dir)).filter(name => name.startsWith('frame-'));
  assert.equal(names.length, DELTA_IDENTITY_DEBUG_MAX_FRAMES);
  assert.equal(names.includes(frameFile(attemptId(1))), false);
  assert.equal(names.includes(frameFile(attemptId(count))), true);
  assert.equal(store.state().pendingFrames, true);
  assert.equal(await readFile(join(dir, 'other.png'), 'utf8'), 'owned elsewhere');
});

test('frame pruning does not follow a symlink', async t => {
  const root = await temp(t, 'delta-frame-link-');
  const store = new IdentityDebugStore(root, { maxFrames: 1 });
  const dir = join(root, 'worlds', 'delta', 'identity-debug');
  const anchor = join(dir, 'anchor.bin');
  assert.equal(store.writeFrame(attemptId(1), Buffer.from('1')), frameFile(attemptId(1)));
  await writeFile(anchor, 'target');
  const linkPath = join(dir, frameFile(attemptId(2)));
  try { await symlink(anchor, linkPath, 'file'); }
  catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'ENOTSUP' || error?.code === 'EACCES') {
      t.skip('creating a symlink was not permitted');
      return;
    }
    throw error;
  }
  const now = Date.now();
  await utimes(linkPath, now / 1000, (now - 60_000) / 1000);
  assert.equal(store.writeFrame(attemptId(3), Buffer.from('3')), frameFile(attemptId(3)));
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal(await readFile(anchor, 'utf8'), 'target');
  assert.equal((await readdir(dir)).includes(frameFile(attemptId(3))), true);
  assert.equal(store.state().pendingFrames, true);
});

test('attempts.jsonl rotates at the size cap and logPath stays on the current file', async t => {
  const root = await temp(t, 'delta-log-');
  const store = new IdentityDebugStore(root, { maxLogBytes: 1 });
  const dir = join(root, 'worlds', 'delta', 'identity-debug');
  const id = attemptId(1);
  const current = join(dir, 'attempts.jsonl');
  const archived = join(dir, 'attempts.1.jsonl');
  store.record(id, { stage: 'one' });
  const first = await readFile(current, 'utf8');
  assert.equal(store.logPath(), current);
  assert.match(first, /"stage":"one"/);
  store.record(id, { stage: 'two' });
  assert.equal(await readFile(archived, 'utf8'), first);
  const second = await readFile(current, 'utf8');
  assert.match(second, /"stage":"two"/);
  assert.equal(second.includes('"stage":"one"'), false);
  assert.equal(store.logPath(), current);
  assert.equal(store.state().hasLog, true);
  store.record(id, { stage: 'three' });
  assert.equal(await readFile(archived, 'utf8'), second);
  assert.match(await readFile(current, 'utf8'), /"stage":"three"/);
  assert.equal(store.logPath(), current);
});

test('log rotation leaves an unsafe attempts.1.jsonl untouched and does not append', async t => {
  const root = await temp(t, 'delta-log-unsafe-');
  const store = new IdentityDebugStore(root, { maxLogBytes: 1 });
  const dir = join(root, 'worlds', 'delta', 'identity-debug');
  const id = attemptId(1);
  const current = join(dir, 'attempts.jsonl');
  const archived = join(dir, 'attempts.1.jsonl');
  store.record(id, { stage: 'one' });
  const before = await readFile(current, 'utf8');
  await mkdir(archived);
  store.record(id, { stage: 'two' });
  assert.equal(await readFile(current, 'utf8'), before);
  assert.equal((await lstat(archived)).isDirectory(), true);
  await rm(archived, { recursive: true });
  const previous = join(dir, 'previous.bin');
  await writeFile(previous, 'previous');
  await link(previous, archived);
  store.record(id, { stage: 'three' });
  assert.equal(await readFile(current, 'utf8'), before);
  assert.equal(await readFile(previous, 'utf8'), 'previous');
  assert.equal((await lstat(archived)).nlink, 2);
  assert.equal((await lstat(current)).nlink, 1);
  assert.equal(store.logPath(), current);
});

function capture(stamp, body) {
  return { frame: { capturedAt: stamp }, jpeg: Buffer.from(body) };
}

test('reveal screenshots keep the newest files and the file just written, and leave other names', async t => {
  const root = await temp(t, 'delta-shots-');
  const directory = join(root, 'screenshots');
  const opened = [];
  const options = { directory, maxFiles: 2, open: async (path) => { opened.push(path); } };
  async function reveal(stamp, body) {
    await revealCapture(options, capture(stamp, body), 'full');
  }
  await reveal('2026-01-01T00:00:00.000Z', 'one');
  await reveal('2026-01-01T00:00:01.000Z', 'two');
  const first = (await readdir(directory)).filter(name => name.endsWith('.jpg')).sort();
  assert.equal(first.length, 2);
  const now = Date.now();
  await utimes(join(directory, first[0]), now / 1000, (now + 10_000) / 1000);
  await utimes(join(directory, first[1]), now / 1000, (now + 20_000) / 1000);
  await writeFile(join(directory, 'notes.txt'), 'owned elsewhere');
  await writeFile(join(directory, '2026-01-01T00-00-00.000Z-full-short.jpg'), 'owned elsewhere');
  await reveal('2026-01-01T00:00:02.000Z', 'three');
  const names = await readdir(directory);
  assert.equal(await readFile(join(directory, 'notes.txt'), 'utf8'), 'owned elsewhere');
  assert.equal(await readFile(join(directory, '2026-01-01T00-00-00.000Z-full-short.jpg'), 'utf8'), 'owned elsewhere');
  assert.equal(names.includes(first[0]), false);
  assert.equal(names.includes(first[1]), true);
  const written = opened.at(-1);
  assert.equal(names.some(name => written.endsWith(`\\${name}`) || written.endsWith(`/${name}`)), true);
  assert.equal(names.filter(name => /^[0-9].*\.jpg$/.test(name) && !name.endsWith('short.jpg')).length, 2);
});

test('reveal screenshots keep the exported number of newest files', async t => {
  const root = await temp(t, 'delta-shot-cap-');
  const directory = join(root, 'screenshots');
  const options = { directory, open: async () => {} };
  const stamps = [];
  for (let i = 0; i < DELTA_REVEAL_MAX_SCREENSHOTS + 1; i++) {
    const stamp = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    stamps.push(stamp);
    await revealCapture(options, capture(stamp, `j${i}`), i % 2 === 0 ? 'preview' : 'crop');
  }
  const names = (await readdir(directory)).filter(name => name.endsWith('.jpg'));
  assert.equal(names.length, DELTA_REVEAL_MAX_SCREENSHOTS);
  assert.equal(names.some(name => name.startsWith(stamps[0].replaceAll(':', '-'))), false);
  assert.equal(names.some(name => name.startsWith(stamps.at(-1).replaceAll(':', '-'))), true);
});

test('reveal pruning does not delete a hard-linked screenshot name', async t => {
  const root = await temp(t, 'delta-shot-link-');
  const directory = join(root, 'screenshots');
  const options = { directory, maxFiles: 1, open: async () => {} };
  await revealCapture(options, capture('2026-01-02T00:00:00.000Z', 'one'), 'preview');
  const [kept] = await readdir(directory);
  const anchor = join(directory, 'anchor.bin');
  await writeFile(anchor, 'linked');
  const linked = join(directory, `2026-01-02T00-00-01.000Z-crop-${'ab'.repeat(32)}.jpg`);
  await link(anchor, linked);
  const now = Date.now();
  await utimes(join(directory, kept), now / 1000, (now - 30_000) / 1000);
  await utimes(linked, now / 1000, (now - 40_000) / 1000);
  await revealCapture(options, capture('2026-01-02T00:00:02.000Z', 'two'), 'full');
  const names = await readdir(directory);
  assert.equal(names.includes(kept), false);
  assert.equal(names.includes(linked.slice(directory.length + 1)), true);
  assert.equal(await readFile(anchor, 'utf8'), 'linked');
  assert.equal((await lstat(linked)).nlink, 2);
});
