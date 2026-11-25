import assert from 'node:assert/strict';
import { link, lstat, mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { copyPixelRect } from '../src/image.ts';
import { bgraGray, uiGreen } from '../src/pixels.ts';
import { powershellExecutable } from '../src/powershell.ts';
import { unionRect, unionRects } from '../src/rect.ts';
import { retainNewestFiles } from '../src/retain-files.ts';
import { compact, compactLower, compactUpper, stripWhitespace, upperNFKC } from '../src/text.ts';

test('compactUpper and compactLower keep their case mapping and drop whitespace after NFKC', () => {
  assert.equal(compactUpper(' ﬁ\u00a0K '), 'FIK');
  assert.equal(compactLower(' ﬁ\u00a0K '), 'fik');
  assert.equal(compact(' ﬁ\u00a0K '), 'fiK');
  assert.equal(compactUpper('i'), 'i'.normalize('NFKC').replace(/\s+/gu, '').toLocaleUpperCase('en-US'));
  assert.equal(compactLower('I'), 'i');
});

test('upperNFKC keeps spaces and uses the default uppercase mapping', () => {
  const joined = 'safe box';
  const text = upperNFKC(joined);
  assert.equal(text, joined.normalize('NFKC').toUpperCase());
  assert.equal(stripWhitespace(text), text.replace(/\s+/gu, ''));
  assert.equal(stripWhitespace(text).includes(' '), false);
});

test('uiGreen uses the shared banner thresholds', () => {
  assert.equal(uiGreen(0, 105, 57), true);
  assert.equal(uiGreen(81, 105, 57), true);
  assert.equal(uiGreen(0, 104, 56), false);
  assert.equal(uiGreen(0, 105, 58), false);
  assert.equal(uiGreen(82, 105, 57), false);
});

test('bgraGray matches the fixed-point luma at black and white', () => {
  assert.equal(bgraGray(0, 0, 0), 0);
  assert.equal(bgraGray(255, 255, 255), 255);
  assert.equal(bgraGray(10, 20, 30), (10 * 3735 + 20 * 19235 + 30 * 9798 + 16384) >> 15);
});

test('unionRect and unionRects bound the same edges', () => {
  const a = { x: 2, y: 4, width: 3, height: 5 };
  const b = { x: 1, y: 8, width: 6, height: 2 };
  const c = { x: 4, y: 1, width: 1, height: 3 };
  assert.deepEqual(unionRect(a, b), { x: 1, y: 4, width: 6, height: 6 });
  assert.deepEqual(unionRects([a, b, c]), {
    x: Math.min(a.x, b.x, c.x), y: Math.min(a.y, b.y, c.y),
    width: Math.max(a.x + a.width, b.x + b.width, c.x + c.width) - Math.min(a.x, b.x, c.x),
    height: Math.max(a.y + a.height, b.y + b.height, c.y + c.height) - Math.min(a.y, b.y, c.y),
  });
  assert.deepEqual(unionRects([a]), { x: a.x, y: a.y, width: a.width, height: a.height });
});

test('copyPixelRect packs one rectangle of 4-byte pixels', () => {
  const sourceWidth = 4, height = 3;
  const source = new Uint8Array(sourceWidth * height * 4);
  for (let i = 0; i < source.length; i++) source[i] = i;
  const copy = copyPixelRect(source, sourceWidth, 1, 1, 2, 2);
  assert.equal(copy.length, 16);
  assert.deepEqual([...copy], [
    ...source.subarray((1 * 4 + 1) * 4, (1 * 4 + 1) * 4 + 8),
    ...source.subarray((2 * 4 + 1) * 4, (2 * 4 + 1) * 4 + 8),
  ]);
});

test('powershellExecutable reads SystemRoot when the path is built', () => {
  const previous = process.env.SystemRoot;
  process.env.SystemRoot = 'D:\\Win';
  try {
    assert.equal(powershellExecutable(), join('D:\\Win', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  } finally {
    if (previous === undefined) delete process.env.SystemRoot;
    else process.env.SystemRoot = previous;
  }
});

test('retainNewestFiles keeps the newest matches, the named file, and other entries', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'delta-retain-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const pattern = /^keep-\d\.txt$/;
  const now = Date.now();
  const names = ['keep-1.txt', 'keep-2.txt', 'keep-3.txt'];
  for (const [index, name] of names.entries()) {
    const path = join(root, name);
    await writeFile(path, name);
    await utimes(path, now / 1000, (now - (3 - index) * 1000) / 1000);
  }
  await writeFile(join(root, 'other.txt'), 'other');
  await mkdir(join(root, 'keep-9.txt'));
  const anchor = join(root, 'anchor.bin');
  await writeFile(anchor, 'linked');
  const linked = join(root, 'keep-0.txt');
  await link(anchor, linked);
  await utimes(linked, now / 1000, (now - 10_000) / 1000);
  retainNewestFiles(root, pattern, 'keep-1.txt', 2);
  const left = (await readdir(root)).sort();
  assert.deepEqual(left, ['anchor.bin', 'keep-0.txt', 'keep-1.txt', 'keep-3.txt', 'keep-9.txt', 'other.txt'].sort());
  assert.equal((await lstat(anchor)).nlink, 2);
  assert.equal((await lstat(linked)).nlink, 2);
});
