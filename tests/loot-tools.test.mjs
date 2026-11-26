import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import jpeg from 'jpeg-js';
import { DeltaWorld, DELTA_DEFAULTS } from '../src/index.ts';
import { lootDetailPixels } from '../src/loot-detector.ts';
import { encodeIdentityFrame } from '../src/identity-debug-png.ts';
import { createFrameSource, displays } from './fixtures/dual-display-source.mjs';

const fixture = new URL('./fixtures/dual-display-source.mjs', import.meta.url).href;
const log = { warn() {}, child() { return this; } };
const modelFacts = { accepts: type => ['image/jpeg', 'image/png'].includes(type) };

function callTool(world, name, args) {
  const tool = world.tools().find(tool => tool.name === name);
  assert.ok(tool, name);
  return tool.handler(args, {});
}

test('the model can search every catalog entry and compare an unreviewed reference without a network dependency', async t => {
  const world = new DeltaWorld({ cfg: structuredClone(DELTA_DEFAULTS), persist() {} });
  await world.start({ log, modelFacts });
  t.after(() => world.stop());
  const { items } = JSON.parse(await readFile(new URL('../knowledge/red-items.json', import.meta.url), 'utf8'));
  const lookup = args => callTool(world, 'delta_lookup_red_item', args);
  const listed = await lookup({});
  for (const item of items) assert.ok(listed.text.includes(item.name), item.name);
  const reference = items.find(item => !item.reviewed) ?? items[0];
  const png = encodeIdentityFrame({ width: 1, height: 1, bgra: Uint8Array.of(4, 3, 2, 255) });
  const sent = [];
  t.mock.method(globalThis, 'fetch', async url => {
    sent.push(String(url));
    return new Response(png, { headers: { 'content-type': 'image/png' } });
  });
  assert.equal((await lookup({ query: reference.name })).blobs, undefined);
  const sources = new Map(items.map(item => [new URL(item.image).origin, item]));
  sources.set(new URL(reference.image).origin, reference);
  for (const item of sources.values()) {
    const result = await lookup({ query: item.id, includeImage: true });
    assert.ok(result.text.includes(item.name));
    assert.equal(result.blobs?.[0]?.mime, 'image/png', item.name);
    assert.deepEqual(Buffer.from(result.blobs[0].bytes), png);
  }
  assert.deepEqual(sent, [...sources.values()].map(item => item.image));
  assert.equal((await lookup({ query: '绝无此物-测试', includeImage: true })).blobs, undefined);
});

test('lookalike names show both identification notes and each catalog ID selects its own picture', async t => {
  const world = new DeltaWorld({ cfg: structuredClone(DELTA_DEFAULTS), persist() {} });
  await world.start({ log, modelFacts });
  t.after(() => world.stop());
  const lookup = args => callTool(world, 'delta_lookup_red_item', args);
  const { items } = JSON.parse(await readFile(new URL('../knowledge/red-items.json', import.meta.url), 'utf8'));
  const pictures = new Map();
  t.mock.method(globalThis, 'fetch', async url => new Response(pictures.get(String(url))));
  for (const names of [['数据密钥', '空白存储'], ['无人机', '军用无人机']]) {
    const pair = names.map(name => items.find(item => item.name === name));
    for (const [index, item] of pair.entries()) {
      assert.ok(item?.recognitionNote, names[index]);
      pictures.set(item.image, encodeIdentityFrame({ width: 1, height: 1, bgra: Uint8Array.of(10, index, 20, 255) }));
    }
    for (const item of pair) {
      const comparison = await lookup({ query: item.name });
      for (const other of pair) {
        const line = comparison.text.split('\n').find(row => row.startsWith(other.id + ' '));
        assert.ok(line?.includes(other.name) && line.includes(other.recognitionNote), other.name);
      }
      const selected = await lookup({ query: item.id, includeImage: true });
      assert.equal(selected.blobs.length, 1);
      assert.ok(selected.blobs[0].fallbackText.includes(item.name));
      assert.deepEqual(Buffer.from(selected.blobs[0].bytes), pictures.get(item.image));
      if (item.name !== '无人机') {
        const named = await lookup({ query: item.name, includeImage: true });
        assert.deepEqual(Buffer.from(named.blobs[0].bytes), pictures.get(item.image));
      }
    }
  }
  assert.equal((await lookup({ query: '无人机', includeImage: true })).blobs, undefined);
});

test('native slot crops keep the name row and the individual source pixels at the edge of the frame', () => {
  const width = 32, height = 24;
  const bgra = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    bgra.set([x, y, y === 3 ? 255 : 0, 255], (y * width + x) * 4);
  }
  const box = { x: 18, y: 3, width: 14, height: 12 };
  const detail = lootDetailPixels({ width, height, bgra }, box);
  assert.ok(detail.width < width && detail.height < height);
  const bgrAt = (x, y) => {
    const i = (y * detail.width + x) * 4;
    return Array.from(detail.bgra.slice(i, i + 3));
  };
  const [left, top] = bgrAt(0, 0);
  for (let x = box.x; x < box.x + box.width; x++) assert.deepEqual(bgrAt(x - left, box.y - top), [x, 3, 255]);
  assert.deepEqual(bgrAt(31 - left, 14 - top), [31, 14, 0]);
});

test('the model receives the requested real event pixels across batches and releases discarded, expired and stopped evidence', async t => {
  const workspace = await mkdtemp(join(tmpdir(), 'delta-loot-evidence-'));
  const control = join(workspace, 'connected.json');
  await writeFile(control, JSON.stringify(['secondary']));
  const oldControl = process.env.DELTA_TEST_DISPLAYS;
  process.env.DELTA_TEST_DISPLAYS = control;
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  cfg.speech.probability = 1; cfg.speech.cooldownMs = 0;
  const region = { x: 0, y: 0, width: 0.5, height: 0.5 };
  cfg.loot = { enabled: true, language: 'zh-CN', sensitivity: 'balanced',
    calibration: { display: displays[1], topologyRevision: 'test', itemsRoi: region, contextRoi: { x: 0, y: 0.5, width: 0.25, height: 0.125 } } };
  const world = new DeltaWorld({ cfg, persist: patch => Object.assign(cfg, patch),
    standalone: { frameSourceModule: fixture, listDisplays: async () => displays } });
  t.after(async () => {
    await world.stop();
    if (oldControl === undefined) delete process.env.DELTA_TEST_DISPLAYS;
    else process.env.DELTA_TEST_DISPLAYS = oldControl;
    await rm(workspace, { recursive: true, force: true });
  });
  const wakes = [];
  let acceptsPng = true;
  await world.start({ log, modelFacts: { accepts: mime => mime === 'image/jpeg' || (acceptsPng && mime === 'image/png') },
    pushDeferred: wake => wakes.push(wake) });
  const call = (method, ...args) => world.webUi('en').invoke('observer', method, args);
  await call('startStandalone', 'secondary');
  const deadline = Date.now() + 10_000;
  while (world.state().phase !== 'running' && Date.now() < deadline) await delay(20);
  assert.equal(world.state().phase, 'running');
  const source = createFrameSource();
  const crop = { x: 0, y: 0, width: 16, height: 12 };
  const cropJpeg = jpeg.encode({ width: crop.width, height: crop.height, data: Buffer.alloc(crop.width * crop.height * 4, 180) }).data;
  const detail = async (id, value) => {
    const capture = await source.capture('secondary');
    const slot = { width: 4, height: 3, bgra: new Uint8Array(4 * 3 * 4).fill(value) };
    world.receive({ kind: 'event', id, eventKind: 'loot', synthetic: false, capture, crop, cropJpeg,
      dedupKey: id, lootSignature: new Uint8Array(768).fill(value), lootDetail: slot,
      recognition: { kind: 'loot-candidate', text: '保险箱', target: '', scene: 'container', basis: 'red-grid-ui', quality: 'unconfirmed', itemName: null } });
    return encodeIdentityFrame(slot);
  };
  const inspect = eventId => callTool(world, 'delta_inspect_loot', { eventId });
  const first = await detail('first-box', 20);
  const second = await detail('second-box', 80);
  assert.equal(wakes.length, 1);
  const firstWake = wakes.shift();
  const rendered = firstWake.render();
  assert.ok(rendered.text.includes('first-box') && rendered.text.includes('second-box'));
  assert.equal(rendered.blobs.length, 4);
  assert.deepEqual(Buffer.from((await inspect('second-box')).blobs[0].bytes), second);
  world.onEventsSettled([{ meta: firstWake.meta }], 'delivered');
  assert.deepEqual(Buffer.from((await inspect('first-box')).blobs[0].bytes), first);
  acceptsPng = false;
  const jpegDetail = (await inspect('second-box')).blobs[0];
  assert.equal(jpegDetail.mime, 'image/jpeg');
  const decoded = jpeg.decode(jpegDetail.bytes);
  assert.equal(decoded.width, 4);
  assert.equal(decoded.height, 3);
  assert.ok(Math.abs(decoded.data[0] - 80) <= 2);
  acceptsPng = true;
  const simulated = await call('simulate', { kind: 'loot', dedupKey: 'synthetic' });
  const simulation = wakes.shift(); simulation.render();
  world.onEventsSettled([{ meta: simulation.meta }], 'delivered');
  assert.equal((await inspect(simulated.eventId)).blobs, undefined);
  await detail('discarded', 140);
  const discard = wakes.shift(); discard.render();
  world.onEventsSettled([{ meta: discard.meta }], 'discarded');
  assert.equal((await inspect('discarded')).blobs, undefined);
  const clock = Date.now();
  const advanced = t.mock.method(Date, 'now', () => clock + 600_000);
  assert.equal((await inspect('first-box')).blobs, undefined);
  advanced.mock.restore();
  const last = await detail('last-box', 210);
  const lastWake = wakes.shift(); lastWake.render();
  world.onEventsSettled([{ meta: lastWake.meta }], 'delivered');
  assert.deepEqual(Buffer.from((await inspect('last-box')).blobs[0].bytes), last);
  await call('pause');
  assert.equal((await inspect('last-box')).blobs, undefined);
});
