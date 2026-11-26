import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import jpeg from 'jpeg-js';
import { WorldAssembly } from 'cortico/world.ts';
import { DELTA_DEFAULTS, deltaDefinition } from '../src/index.ts';
import { profileIdentity } from '../src/profile-identity.ts';
import { matchesCalibration } from '../src/detector.ts';
import { startupCheck } from '../src/startup-check.ts';

function layout(...entries) {
  return { width: 1000, height: 500, truncated: false,
    lines: entries.map((entry, i) => typeof entry === 'string'
      ? { text: entry, box: { x: 5, y: 10 + 20 * i, width: 100, height: 14 }, words: [] }
      : { words: [], ...entry }) };
}

test('profile OCR requires a labeled, unambiguous nickname', () => {
  assert.deepEqual(profileIdentity(layout('个人资料', 'UID: 137532121981231', '玩家昵称：RiverFish')),
    { status: 'candidate', nickname: 'RiverFish' });
  assert.deepEqual(profileIdentity(layout('个人资料', '昵称: DruidFish')), { status: 'candidate', nickname: 'DruidFish' });
  const label = { text: '昵 称', box: { x: 10, y: 40, width: 50, height: 20 } };
  const value = { text: '小鱼123', box: { x: 67, y: 40, width: 100, height: 19 } };
  assert.deepEqual(profileIdentity(layout('个人信息', label, value)), { status: 'candidate', nickname: value.text });
  const examples = [
    layout('我的资料', 'UID: 678912344563', 'RiverFish'),
    layout('我的资料', '昵称: 678912344563'), layout('个人资料', '昵称: 匿 名 玩 家'),
    layout('Player profile', 'Nickname: Anonymous Player'),
    layout('个人资料', '昵称: RiverFish', '昵称: OtherFish'),
    layout('我的资料', label, { ...value, box: { ...value.box, y: 61 } }),
    { ...layout('个人资料', '昵称: RiverFish'), truncated: true },
  ];
  for (const sample of examples) assert.equal(profileIdentity(sample).status, 'nickname-unreadable');
  for (const sample of [layout('烽火地带', '开始游戏', '昵称: Teammate'), layout('个人资料', '邀请入队', '昵称: Teammate')]) {
    assert.equal(profileIdentity(sample).status, 'profile-unrecognized');
  }
});

const display = { id: 'secondary', bounds: { x: -2560, y: 0, width: 2560, height: 1440 },
  name: 'Synthetic 2', systemNumber: 2, primary: false, scaleFactor: 1, rotation: 0 };
const source = { display, topologyRevision: 'test-topology' };
const capture = { frame: { ...source, frameId: 'profile-test-frame', capturedAt: new Date().toISOString(),
  width: 64, height: 36, mime: 'image/jpeg', transform: { originX: -2560, originY: 0, scaleX: 0.025, scaleY: 0.025 } },
  jpeg: jpeg.encode({ width: 64, height: 36, data: Buffer.alloc(64 * 36 * 4, 220) }).data };
const host = { modelFacts: { accepts: () => true } };

for (const customized of [false, true]) {
  test('Core persists calibrated regions and preserves ' + (customized ? 'custom detection settings' : 'default detection settings'), async t => {
    const directory = await mkdtemp(join(tmpdir(), 'delta-calibration-save-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, 'config.json');
    const cfg = structuredClone(DELTA_DEFAULTS);
    cfg.enabled = true;
    if (customized) {
      Object.assign(cfg.detection, { enabled: true, language: 'zh-CN', nickname: 'ExistingFish' });
      Object.assign(cfg.loot, { enabled: true, language: 'zh-CN', sensitivity: 'conservative' });
    }
    await writeFile(path, JSON.stringify({ worlds: { delta: cfg } }));
    let permitted = true, suggestion = { status: 'ready', capture };
    const def = deltaDefinition({ binding: { version: 1, snapshot: () => ({ revision: String(permitted),
      viewEnabled: true, viewPermitted: permitted, observationEnabled: true, displayId: display.id, corePaused: false, outputAvailable: true }) },
      calibrationOperation: async request => {
        if (request.kind === 'calibration-source') return { status: 'source', source };
        if (request.kind === 'identity-suggest') return { status: 'identity', suggestion: { status: 'candidate', nickname: 'BlueFish' } };
        return suggestion;
      } });
    async function reboot() {
      const config = JSON.parse(await readFile(path, 'utf8'));
      const assembly = new WorldAssembly({ config, rootDir: directory, dataDir: directory }, [def], ['delta']);
      const world = assembly.slot('delta').instance;
      await world.start(host);
      t.after(() => world.stop());
      return { world, call: (method, ...args) => world.webUi().invoke('observer', method, args) };
    }
    const { world, call } = await reboot();
    const initial = await call('calibrationSuggest');
    assert.equal(initial.status, 'ready');
    const saved = await call('calibrationApply', { frameId: initial.frame.frameId });
    assert.deepEqual(saved.detection.config.calibration.roi, initial.combat.roi);
    assert.deepEqual(saved.loot.config.calibration.itemsRoi, initial.loot.itemsRoi);
    const persisted = JSON.parse(await readFile(path, 'utf8')).worlds.delta;
    assert.deepEqual(persisted.detection, { ...cfg.detection, calibration: saved.detection.config.calibration });
    assert.deepEqual(persisted.loot, { ...cfg.loot, calibration: saved.loot.config.calibration });
    assert.deepEqual((await call('state')).detection.config, persisted.detection);
    const inv = { itemsRoi: { x: 0.4, y: 0.6, width: 0.1, height: 0.1 }, contextRoi: { x: 0.4, y: 0.55, width: 0.1, height: 0.04 } };
    suggestion = { status: 'inventory-ready', capture, loot: inv };
    const inventory = await call('calibrationSuggest');
    assert.equal(inventory.status, 'inventory-ready');
    const afterInventory = await call('calibrationApply', { frameId: inventory.frame.frameId });
    assert.deepEqual(afterInventory.detection.config, saved.detection.config);
    assert.deepEqual(afterInventory.loot.config.calibration.itemsRoi, inv.itemsRoi);
    assert.equal((await call('identitySuggest')).nickname, 'BlueFish');
    assert.equal((await call('state')).detection.config.nickname, cfg.detection.nickname);
    permitted = false;
    assert.equal((await call('identitySuggest')).status, 'capture-unavailable');
    await assert.rejects(call('identitySave', '匿名玩家'));
    await assert.rejects(call('identitySave', 'UID: 12345678'));
    await call('identitySave', ' BlueFish ');
    await world.stop();
    const { call: reread } = await reboot();
    const state = await reread('state');
    assert.deepEqual(state.detection.config, { ...saved.detection.config, nickname: 'BlueFish' });
    assert.deepEqual(state.loot.config, afterInventory.loot.config);
  });
}

test('quick setup keeps calibrated areas and confirms an English-compatible combat region', async t => {
  const root = await mkdtemp(join(tmpdir(), 'delta-quick-setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, 'config.json');
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  cfg.detection.nickname = 'Fixture';
  cfg.loot.sensitivity = 'conservative';
  const config = { worlds: { delta: cfg } };
  await writeFile(path, JSON.stringify(config));
  const def = deltaDefinition({ standalone: { frameSourceModule: 'unused', listDisplays: async () => [display] },
    calibrationOperation: async request => request.kind === 'calibration-source' ? { status: 'source', source } : { status: 'ready', capture } });
  const world = new WorldAssembly({ rootDir: root, dataDir: root, config }, [def], ['delta']).slot('delta').instance;
  await world.start(host);
  t.after(() => world.stop());
  const call = (name, ...args) => world.webUi('en').invoke('observer', name, args);
  await call('prepareCalibration', display.id);
  await call('quickSetupConfigure', { combat: true, loot: true, language: 'zh-CN' });
  const zh = await call('calibrationSuggest');
  assert.ok(zh.combat.personalFeedbackRoi);
  const original = await call('calibrationApply', { frameId: zh.frame.frameId });
  const beforeEdit = await readFile(path, 'utf8');
  for (const invalid of [{ combat: false, loot: false, language: 'zh-CN' }, { combat: true, loot: true, language: '' }]) {
    await assert.rejects(call('quickSetupConfigure', invalid));
    assert.equal(await readFile(path, 'utf8'), beforeEdit);
  }
  const en = await call('quickSetupConfigure', { combat: true, loot: false, language: 'en-US' });
  assert.equal(en.detection.config.nickname, 'Fixture');
  assert.equal(en.detection.config.language, 'en-US');
  assert.deepEqual(en.detection.config.calibration, original.detection.config.calibration);
  assert.deepEqual(en.loot.config, { ...original.loot.config, enabled: false });
  assert.equal(en.detection.reason, 'feedback-language-unsupported');
  const preview = await call('calibrationSuggest');
  assert.equal(preview.combat.personalFeedbackRoi, null);
  const confirmed = await call('calibrationApply', { frameId: preview.frame.frameId });
  assert.equal(confirmed.detection.reason, null);
  assert.deepEqual(confirmed.detection.config.calibration.roi, original.detection.config.calibration.roi);
  const saved = JSON.parse(await readFile(path, 'utf8')).worlds.delta;
  assert.equal(saved.detection.language, 'en-US');
  assert.equal(saved.detection.calibration.personalFeedbackRoi, null);
  assert.equal(saved.loot.language, 'zh-CN');
  assert.equal(saved.loot.sensitivity, 'conservative');
});

test('reordered JSON display keys retain compatibility but changed geometry does not', () => {
  const reorder = obj => Object.fromEntries(Object.entries(obj).reverse());
  const calibration = { display: { ...reorder(display), bounds: reorder(display.bounds) }, topologyRevision: source.topologyRevision,
    roi: { x: 0.4, y: 0.05, width: 0.1, height: 0.05 } };
  assert.equal(matchesCalibration(source, calibration), true);
  const detection = { ...DELTA_DEFAULTS.detection, enabled: true, calibration };
  assert.equal(startupCheck(capture.frame, detection, DELTA_DEFAULTS.loot).detection.status, 'compatible');
  calibration.display.bounds.x += 1;
  assert.equal(matchesCalibration(source, calibration), false);
  assert.equal(startupCheck(capture.frame, detection, DELTA_DEFAULTS.loot).detection.reason, 'geometry-changed');
});

test('global calibration hotkey auto-saves with no panel mounted and leaves preview readable', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'delta-auto-hotkey-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  const config = { worlds: { delta: cfg } };
  const path = join(directory, 'config.json');
  await writeFile(path, JSON.stringify(config));
  let press;
  const def = deltaDefinition({ binding: { version: 1,
    snapshot: () => ({revision: 'hotkey', viewEnabled: true, viewPermitted: true, observationEnabled: true,
      displayId: display.id, corePaused: false, outputAvailable: true}),
    calibrationHotkey: { register(callback, status) { press = callback; status('registered'); return () => {}; } } },
    calibrationOperation: async request => request.kind === 'calibration-source' ? { status: 'source', source } : {status: 'ready', capture} });
  const world = new WorldAssembly({config, rootDir: directory, dataDir: directory}, [def], ['delta']).slot('delta').instance;
  t.after(() => world.stop());
  await world.start(host);
  const call = (method, ...args) => world.webUi().invoke('observer', method, args);
  await call('state');
  assert.equal(typeof press, 'function');
  press();
  let state;
  for (let i = 0; i < 100; i++) {
    state = await call('state');
    if (state.calibrationHotkey?.attempt?.result.status !== 'capturing') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const result = state.calibrationHotkey?.attempt?.result;
  assert.equal(result?.status, 'ready');
  const saved = JSON.parse(await readFile(path, 'utf8')).worlds.delta;
  assert.deepEqual(saved.detection.calibration.roi, result.combat.roi);
  assert.equal(saved.detection.nickname, '');
  assert.ok((await call('detectionPreviewImage', result.frame.frameId)).$binary.base64);
});
