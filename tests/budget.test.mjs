import assert from 'node:assert/strict';
import test from 'node:test';
import { calibrationFitsBudget, combatSelectionTooLarge, lootCalibrationFitsBudget, lootSelectionTooLarge } from '../src/budget.ts';
import { calibrationFitsBudget as exportedFits } from '../src/detector.ts';
import { DELTA_MAX_LOOT_CONTEXT_PIXELS, DELTA_MAX_LOOT_ITEMS_PIXELS, DELTA_MAX_LOOT_ROI_AREA, DELTA_MAX_ROI_AREA, DELTA_MAX_ROI_PIXELS } from '../src/limits.ts';
import { lootCalibrationFitsBudget as exportedLootFits } from '../src/loot-detector.ts';

const display = { bounds: { x: 0, y: 0, width: 4000, height: 3000 } };

function valid(roi) {
  return !!roi && Object.values(roi).every(Number.isFinite) && roi.x >= 0 && roi.y >= 0 && roi.width > 0 && roi.height > 0
    && roi.x + roi.width <= 1 && roi.y + roi.height <= 1;
}

function rectangle(roi, width, height) {
  const x = Math.floor(roi.x * width), y = Math.floor(roi.y * height);
  return { width: Math.max(1, Math.min(width - x, Math.ceil((roi.x + roi.width) * width) - x)),
    height: Math.max(1, Math.min(height - y, Math.ceil((roi.y + roi.height) * height) - y)) };
}

function previousCombat(regions, width, height) {
  const area = regions.reduce((total, roi) => total + roi.width * roi.height, 0);
  const pixels = regions.reduce((total, roi) => {
    const box = rectangle(roi, width, height);
    return total + box.width * box.height;
  }, 0);
  return area > DELTA_MAX_ROI_AREA || pixels > DELTA_MAX_ROI_PIXELS;
}

function previousLoot(items, context, width, height) {
  const pixels = (roi) => {
    if (!valid(roi)) return 0;
    const box = rectangle(roi, width, height);
    return box.width * box.height;
  };
  const regions = [items, context].filter(valid);
  const area = regions.reduce((sum, roi) => sum + roi.width * roi.height, 0);
  const left = Math.min(...regions.map((roi) => roi.x)), top = Math.min(...regions.map((roi) => roi.y));
  const right = Math.max(...regions.map((roi) => roi.x + roi.width)), bottom = Math.max(...regions.map((roi) => roi.y + roi.height));
  const bounds = regions.length ? { x: left, y: top, width: right - left, height: bottom - top } : null;
  return pixels(items) > DELTA_MAX_LOOT_ITEMS_PIXELS || pixels(context) > DELTA_MAX_LOOT_CONTEXT_PIXELS
    || area > DELTA_MAX_LOOT_ROI_AREA || pixels(bounds) > DELTA_MAX_ROI_PIXELS;
}

function previousFits(roi, personal) {
  try {
    const regions = [roi, ...(personal ? [personal] : [])];
    for (const region of regions) if (!valid(region)) throw new Error('invalid');
    return !previousCombat(regions, display.bounds.width, display.bounds.height);
  } catch { return false; }
}

const regions = [
  { x: 0, y: 0, width: 0.2, height: 0.2 },
  { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  { x: 0, y: 0, width: 0.25, height: 1 },
  { x: 0, y: 0, width: 0, height: 0.2 },
  { x: 0, y: 0, width: NaN, height: 0.2 },
  { x: -0.1, y: 0, width: 0.2, height: 0.2 },
  { x: 0.9, y: 0.9, width: 0.2, height: 0.2 },
  null,
];

test('combat and loot budget checks match the previous formulas', () => {
  assert.equal(exportedFits, calibrationFitsBudget);
  assert.equal(exportedLootFits, lootCalibrationFitsBudget);
  for (const width of [100, 1920, 4000]) for (const height of [80, 1080, 3000]) {
    for (const roi of regions) {
      const present = roi ? [roi] : [];
      assert.equal(combatSelectionTooLarge(present, width, height), previousCombat(present, width, height));
      for (const other of regions) {
        assert.equal(lootSelectionTooLarge(roi, other, width, height, valid), previousLoot(roi, other, width, height));
        if (roi && other) assert.equal(combatSelectionTooLarge([roi, other], width, height), previousCombat([roi, other], width, height));
      }
    }
  }
  for (const roi of regions) for (const personal of regions) {
    if (!roi) continue;
    const calibration = { display, topologyRevision: 't', roi, personalFeedbackRoi: personal };
    assert.equal(calibrationFitsBudget(calibration), previousFits(roi, personal));
    if (personal) {
      const loot = { display, topologyRevision: 't', itemsRoi: roi, contextRoi: personal };
      const fits = valid(roi) && valid(personal) && !previousLoot(roi, personal, display.bounds.width, display.bounds.height);
      assert.equal(lootCalibrationFitsBudget(loot), fits);
    }
  }
});
