import assert from 'node:assert/strict';
import test from 'node:test';
import { DeltaWorld, DELTA_DEFAULTS } from '../src/index.ts';
import { deltaText } from '../src/i18n/index.ts';
import { displays } from './fixtures/dual-display-source.mjs';

const fixture = new URL('./fixtures/dual-display-source.mjs', import.meta.url).href;

function setup() {
  const cfg = structuredClone(DELTA_DEFAULTS);
  cfg.enabled = true;
  const world = new DeltaWorld({ cfg, persist() {}, standalone: { frameSourceModule: fixture, async listDisplays() { return displays; } } });
  const call = (method, ...args) => world.webUi('en').invoke('observer', method, args);
  return { world, call };
}

test('unknown panel methods return the localized unknownMethod error', async () => {
  const { world } = setup();
  const en = deltaText('en').errors, zh = deltaText('zh').errors;
  for (const method of ['missing', 'toString', 'constructor']) {
    await assert.rejects(world.webUi('en').invoke('observer', method, []), { message: en.unknownMethod });
  }
  await assert.rejects(world.webUi('en').invoke('settings', 'state', []), { message: en.unknownMethod });
  await assert.rejects(world.webUi('zh').invoke('observer', 'missing', []), { message: zh.unknownMethod });
});

test('panel methods reject the wrong argument count with invalidRequest', async () => {
  const { call } = setup();
  const message = deltaText('en').errors.invalidRequest;
  const cases = [
    ['state', [true]], ['start', [1]], ['pause', ['x']], ['stop', [false]],
    ['identitySuggest', [1]], ['identityDebugReveal', [1]], ['identitySave', []],
    ['speechConfigure', []], ['knowledgeRead', ['x']], ['knowledgeImport', []], ['knowledgeReload', [1]], ['knowledgeRestore', [1]],
    ['listStandaloneDisplays', [1]], ['prepareCalibration', []], ['startStandalone', []], ['cancelCalibration', [1]],
    ['quickSetupConfigure', []], ['calibrationSuggest', [1]], ['calibrationAspectRatioConfigure', []], ['calibrationApply', []],
    ['calibrationDismiss', []], ['detectionPreview', [1]], ['detectionPreviewImage', []], ['detectionConfigure', []],
    ['detectionCalibrate', []], ['detectionCalibrate', ['frame', {}, {}, 'extra']],
    ['lootConfigure', []], ['lootCalibrate', []], ['lootCalibrate', ['frame', { x: 0, y: 0, width: .1, height: .1 }]],
    ['simulate', []], ['eventImage', ['id']], ['revealScreenshot', []],
  ];
  for (const [method, args] of cases) await assert.rejects(call(method, ...args), { message }, method);
});
