import assert from 'node:assert/strict';
import test from 'node:test';
import jpeg from 'jpeg-js';
import { Detector } from '../src/detector.ts';
import { DELTA_OCR_TRANSIENT_FAILURE_LIMIT, deltaOcrBackoffMs } from '../src/limits.ts';
import { LootDetector, detectLootItems, lootCalibrationFitsBudget, lootCaptureRoi, sameLootSignature } from '../src/loot-detector.ts';
import { captureRectangle } from '../src/roi.ts';
import { SharedOcr } from '../src/shared-ocr.ts';

const display = { id: 'offline', name: 'Test display', primary: true, systemNumber: 1,
  bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1, rotation: 0 };
const topologyRevision = 'topology';
const capturedAt = '2026-01-01T00:00:00.000Z';

function frame(mark, width = 32, height = 16) {
  const bgra = new Uint8Array(width * height * 4);
  bgra.fill(mark);
  return { display, topologyRevision, capturedAt, width, height, bgra };
}
function evidenceFor(region) {
  return { capture: { jpeg: Uint8Array.of(1), frame: { frameId: 'frame', capturedAt, display, topologyRevision, width: region.width, height: region.height,
    mime: 'image/jpeg', transform: { originX: 0, originY: 0, scaleX: 1, scaleY: 1 } } }, region,
  crop: { x: 0, y: 0, width: 1, height: 1 }, cropJpeg: Uint8Array.of(1) };
}
function combatConfig() {
  return { enabled: true, nickname: 'Player', language: 'en-US',
    calibration: { display, topologyRevision, roi: { x: 0.1, y: 0.1, width: 0.15, height: 0.06 } } };
}
const killLayout = { width: 32, height: 16, truncated: false, lines: [{ text: 'Player killed Enemy',
  box: { x: 1, y: 1, width: 28, height: 12 }, words: [{ text: 'Player killed Enemy', box: { x: 1, y: 1, width: 28, height: 12 } }] }] };
function port(recognizeLayout, language = 'en-US') {
  return { pid: 1, availableLanguages: ['en-US'], language, exited: new Promise(() => {}), recognizeLayout,
    async recognize(region) { const layout = await recognizeLayout(region); return layout.lines.map((line) => line.text); }, async close() {} };
}
async function until(predicate, label) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`${label} timed out`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('transient OCR backoff waits 1s, then 2s, then 4s', () => {
  assert.deepEqual([1, 2, 3].map((failures) => deltaOcrBackoffMs(failures)), [1000, 2000, 4000]);
});

test('combat detection confirms the newest frame after a rejected OCR read', async () => {
  const confirmed = [];
  let reads = 0, scanned = null;
  const openOcr = async () => port(async (region) => {
    reads++;
    if (reads === 1) throw new Error('Windows OCR timed out');
    scanned ??= region;
    return killLayout;
  });
  const detector = new Detector(combatConfig(), async () => evidenceFor(frame(9)), (_evidence, match) => confirmed.push(match), openOcr, () => 40);
  detector.submit(frame(10));
  await until(() => detector.status.lastError, 'first OCR failure');
  assert.equal(detector.status.phase, 'starting');
  const newest = frame(200);
  detector.submit(newest);
  await until(() => confirmed.length === 1, 'confirmed kill');
  assert.equal(detector.status.phase, 'ready');
  assert.equal(confirmed[0].kind, 'kill');
  assert.equal(scanned, newest);
  assert.ok(reads >= 2);
  await detector.close();
});

test('three consecutive OCR start failures put combat detection in error', async () => {
  let opens = 0;
  const detector = new Detector(combatConfig(), async () => evidenceFor(frame(1)), () => {}, async () => { opens++; throw new Error('Windows OCR timed out'); }, () => 5);
  detector.submit(frame(1));
  await until(() => detector.status.phase === 'error', 'error phase');
  assert.equal(opens, DELTA_OCR_TRANSIENT_FAILURE_LIMIT);
  assert.equal(detector.status.reason, null);
  assert.match(detector.status.lastError, /Windows OCR timed out/);
  detector.submit(frame(2));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(opens, DELTA_OCR_TRANSIENT_FAILURE_LIMIT);
  await detector.close();
});

test('OCR unavailable on this platform stays unavailable after one attempt', async () => {
  let opens = 0;
  const detector = new Detector(combatConfig(), async () => evidenceFor(frame(1)), () => {}, async () => {
    opens++;
    throw new Error('Windows OCR is unavailable on this platform');
  }, () => 5);
  detector.submit(frame(1));
  await until(() => detector.status.phase === 'unavailable', 'platform unavailable');
  assert.equal(detector.status.reason, 'ocr-unavailable');
  assert.equal(opens, 1);
  detector.submit(frame(2));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(opens, 1);
  await detector.close();
});

test('an unavailable OCR language opens one process and stays unavailable', async () => {
  let opens = 0;
  const detector = new Detector(combatConfig(), async () => evidenceFor(frame(1)), () => {}, async () => { opens++; return port(async () => killLayout, null); }, () => 5);
  detector.submit(frame(1));
  await until(() => detector.status.phase === 'unavailable', 'language unavailable');
  assert.equal(detector.status.reason, 'ocr-language-unavailable');
  assert.equal(opens, 1);
  detector.submit(frame(2));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(opens, 1);
  assert.equal(detector.status.phase, 'unavailable');
  await detector.close();
});

test('Detector.close finishes while OCR backoff is still waiting', async () => {
  const detector = new Detector(combatConfig(), async () => evidenceFor(frame(1)), () => {},
    async () => port(async () => { throw new Error('Windows OCR timed out'); }), () => 60_000);
  detector.submit(frame(4));
  await until(() => detector.status.lastError, 'backoff');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const finished = detector.close();
  await Promise.race([finished, new Promise((_resolve, reject) => setTimeout(() => reject(new Error('close hung during backoff')), 500))]);
});

test('SharedOcr opens 2 OCR processes after the previous process exits', async () => {
  const ports = [];
  let created = 0;
  const shared = new SharedOcr(async () => {
    created++;
    let markExit = () => {};
    const exited = new Promise((resolve) => { markExit = resolve; });
    const opened = { pid: created, availableLanguages: ['en-US'], language: 'en-US', exited, dead: false,
      async recognizeLayout() {
        if (opened.dead) throw new Error('Windows OCR is closed');
        return { width: 1, height: 1, lines: [], truncated: false };
      },
      async recognize() { return []; },
      async close() { opened.dead = true; markExit(); },
      exit() { opened.dead = true; markExit(); } };
    ports.push(opened);
    return opened;
  });
  const first = await shared.open('en-US');
  const other = await shared.open('en-US');
  assert.equal(created, 1);
  ports[0].exit();
  await Promise.resolve();
  await assert.rejects(other.recognizeLayout(frame(1, 1, 1)), /OCR lease closed/);
  const renewed = await shared.open('en-US');
  assert.equal(created, 2);
  await renewed.recognizeLayout(frame(1, 1, 1));
  await Promise.all([first.close(), other.close(), renewed.close(), shared.close()]);
});

test('SharedOcr opens 2 OCR processes after a request fails because the process is gone', async () => {
  let created = 0;
  const shared = new SharedOcr(async () => {
    created++;
    let markExit = () => {};
    return { pid: created, availableLanguages: ['en-US'], language: 'en-US', exited: new Promise((resolve) => { markExit = resolve; }),
      async recognizeLayout() { throw new Error('Windows OCR is closed'); }, async recognize() { return []; }, async close() { markExit(); } };
  });
  const lease = await shared.open('en-US');
  await assert.rejects(lease.recognizeLayout(frame(1, 1, 1)), /Windows OCR is closed/);
  const renewed = await shared.open('en-US');
  assert.equal(created, 2);
  await Promise.all([lease.close(), renewed.close(), shared.close()]);
});

function redGrid(width, height) {
  const bgra = new Uint8Array(width * height * 4);
  const set = (x, y, b, g, r) => { const at = (y * width + x) * 4; bgra[at] = b; bgra[at + 1] = g; bgra[at + 2] = r; bgra[at + 3] = 255; };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, 20, 20, 20);
  const xs = [8, 70, 140], ys = [8, 60, 112];
  for (const x of xs) for (let y = 0; y < height; y++) set(x, y, 100, 100, 100);
  for (const y of ys) for (let x = 0; x < width; x++) set(x, y, 100, 100, 100);
  for (let column = 0; column < xs.length - 1; column++) for (let row = 0; row < ys.length - 1; row++) {
    for (let y = ys[row] + 1; y < ys[row + 1]; y++) for (let x = xs[column] + 1; x < xs[column + 1]; x++) set(x, y, 0, 0, 200);
  }
  return bgra;
}

test('loot detection scans again after a rejected OCR read', async () => {
  const lootDisplay = { ...display, bounds: { x: 0, y: 0, width: 320, height: 240 } };
  const itemsRoi = { x: 0, y: 0, width: 0.5, height: 0.5 }, contextRoi = { x: 0.5, y: 0, width: 0.25, height: 0.25 };
  const calibration = { display: lootDisplay, topologyRevision, itemsRoi, contextRoi };
  assert.equal(lootCalibrationFitsBudget(calibration), true);
  const itemsBox = captureRectangle(itemsRoi, lootDisplay.bounds.width, lootDisplay.bounds.height);
  const unionBox = captureRectangle(lootCaptureRoi(calibration), lootDisplay.bounds.width, lootDisplay.bounds.height);
  assert.deepEqual([itemsBox.x, itemsBox.y, itemsBox.width, itemsBox.height], [0, 0, 160, 120]);
  assert.deepEqual([unionBox.width, unionBox.height], [240, 120]);
  const grid = redGrid(itemsBox.width, itemsBox.height);
  const seen = detectLootItems({ ...frame(0), display: lootDisplay, width: itemsBox.width, height: itemsBox.height, bgra: grid }, 'balanced');
  assert.ok(seen.length >= 1);
  const union = new Uint8Array(unionBox.width * unionBox.height * 4);
  for (let y = 0; y < itemsBox.height; y++) union.set(grid.subarray(y * itemsBox.width * 4, (y + 1) * itemsBox.width * 4), y * unionBox.width * 4);
  const extracted = new Uint8Array(itemsBox.width * itemsBox.height * 4);
  for (let y = 0; y < itemsBox.height; y++) extracted.set(union.subarray(y * unionBox.width * 4, y * unionBox.width * 4 + itemsBox.width * 4), y * itemsBox.width * 4);
  const checked = detectLootItems({ ...frame(0), display: lootDisplay, width: itemsBox.width, height: itemsBox.height, bgra: extracted }, 'balanced');
  assert.ok(seen.some((item) => checked.some((candidate) => sameLootSignature(item.signature, candidate.signature))));
  const picture = jpeg.encode({ data: Buffer.alloc(16 * 16 * 4, 80), width: 16, height: 16 }, 80).data;
  const inventory = { width: 80, height: 60, truncated: false, lines: [{ text: 'BACKPACK RIG', box: { x: 1, y: 1, width: 70, height: 16 },
    words: [{ text: 'BACKPACK', box: { x: 1, y: 1, width: 40, height: 16 } }, { text: 'RIG', box: { x: 44, y: 1, width: 20, height: 16 } }] }] };
  let reads = 0;
  const openOcr = async () => port(async () => {
    reads++;
    if (reads === 1) throw new Error('Windows OCR timed out');
    return inventory;
  });
  const items = { display: lootDisplay, topologyRevision, capturedAt, width: itemsBox.width, height: itemsBox.height, bgra: grid };
  const evidence = async () => ({ capture: { jpeg: picture, frame: { frameId: 'loot', capturedAt, display: lootDisplay, topologyRevision,
    width: 16, height: 16, mime: 'image/jpeg', transform: { originX: 0, originY: 0, scaleX: 1, scaleY: 1 } } },
  region: { display: lootDisplay, topologyRevision, capturedAt, width: unionBox.width, height: unionBox.height, bgra: union },
  crop: { x: 0, y: 0, width: 8, height: 8 }, cropJpeg: picture });
  const detector = new LootDetector({ enabled: true, language: 'en-US', sensitivity: 'balanced', calibration }, evidence, () => {}, openOcr, undefined, () => 40, 0);
  detector.submit(items);
  await until(() => detector.status.scans === 1, 'first loot scan');
  await new Promise((resolve) => setTimeout(resolve, 0));
  detector.submit(items);
  await until(() => detector.status.lastError, 'loot OCR failure');
  assert.equal(detector.status.phase, 'starting');
  await until(() => detector.status.scene === 'inventory' && detector.status.phase === 'ready', 'loot recovery');
  assert.equal(reads, 2);
  assert.ok(detector.status.scans >= 3);
  await detector.close();
});

test('the detector runs without a nickname and leaves actor-only ownership unconfirmed', async t => {
  const confirmed = [], config = { ...combatConfig(), nickname: '' };
  const detector = new Detector(config, async () => evidenceFor(frame(9)), (_evidence, match) => confirmed.push(match),
    async () => port(async () => killLayout));
  t.after(() => detector.close());
  detector.submit(frame(8));
  await until(() => confirmed.length === 1, 'optional nickname confirmation');
  assert.equal(confirmed[0].attribution.relation, 'unknown');
  assert.equal(detector.status.reason, null);
});
