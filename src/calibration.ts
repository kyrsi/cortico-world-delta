import type { CuaFrame } from 'cortico-world-desktop-pet';
import { calibrationFitsBudget } from './detector.ts';
import { lootCalibrationFitsBudget } from './loot-detector.ts';
import { DEFAULT_GAME_ASPECT_RATIO, sameDeltaDisplay, type DeltaCalibration, type DeltaCalibrationRegions, type DeltaGameAspectRatio, type DeltaLootCalibration, type DeltaPreparationAnchors, type DeltaPreparationRegionSource, type DeltaRoi } from './protocol.ts';

const WIDTH = 2560;
const HEIGHT = 1440;
const normalized = (x: number, y: number, width: number, height: number) => ({
  x: x / WIDTH, y: y / HEIGHT, width: width / WIDTH, height: height / HEIGHT,
});

export const PREPARATION_ROIS = {
  start: normalized(165, 45, 180, 55),
  actions: normalized(1940, 1255, 510, 65),
};
export const SOLO_PREPARATION_MODE_ROI = normalized(2285, 1075, 155, 43);
export const CALIBRATION_SOURCE_PROBE = { x: 0, y: 0, width: 0.000001, height: 0.000001 };
export const CALIBRATION_PREVIEW_MS = 60_000;
export type CalibrationSource = Pick<CuaFrame, 'display' | 'topologyRevision'>;

const PRESET: DeltaCalibrationRegions = {
  combat: { roi: normalized(1850, 80, 710, 220), personalFeedbackRoi: normalized(1000, 1010, 700, 80) },
  loot: { itemsRoi: normalized(980, 1000, 460, 280), contextRoi: normalized(980, 945, 650, 55) },
};

export function supportsPreparation(source: CalibrationSource): boolean {
  return source.display.bounds.width === WIDTH && source.display.bounds.height === HEIGHT;
}

export function sameCalibrationSource(a: CalibrationSource, b: CalibrationSource): boolean {
  return a.topologyRevision === b.topologyRevision && sameDeltaDisplay(a.display, b.display);
}

const center = (roi: DeltaRoi) => ({ x: roi.x + roi.width / 2, y: roi.y + roi.height / 2 });
const containsCenter = (bounds: DeltaRoi, box: DeltaRoi) => {
  const { x, y } = center(box);
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
};

function projectedRegions(anchors: DeltaPreparationAnchors): DeltaCalibrationRegions | null {
  // Centers of the visible labels in the reference 2560 × 1440 preparation frames.
  const start = center(anchors.start), end = center(anchors.actions);
  const scaleX = (end.x - start.x) / ((2195 - 256) / WIDTH);
  const scaleY = (end.y - start.y) / ((1288 - 74) / HEIGHT);
  // Compare the inferred layout scale with independent ink dimensions from the same start label.
  const widthRatio = anchors.start.width / (85 / WIDTH * scaleX);
  const heightRatio = anchors.start.height / (24 / HEIGHT * scaleY);
  if (widthRatio < 0.4 || widthRatio > 2.5 || heightRatio < 0.4 || heightRatio > 2.5) return null;
  const offsetX = start.x - (256 / WIDTH) * scaleX, offsetY = start.y - (74 / HEIGHT) * scaleY;
  function project(roi: DeltaRoi): DeltaRoi | null {
    const left = offsetX + roi.x * scaleX, top = offsetY + roi.y * scaleY;
    const width = roi.width * scaleX, height = roi.height * scaleY;
    const x = Math.max(0, left), y = Math.max(0, top);
    const visibleWidth = Math.min(1, left + width) - x, visibleHeight = Math.min(1, top + height) - y;
    // OCR ink bounds vary by a few pixels; a substantially cropped estimate needs manual calibration.
    if (!(width > 0 && height > 0 && visibleWidth >= width * 0.95 && visibleHeight >= height * 0.95)) return null;
    return { x, y, width: visibleWidth, height: visibleHeight };
  }
  const roi = project(PRESET.combat.roi), personalFeedbackRoi = project(PRESET.combat.personalFeedbackRoi!);
  const itemsRoi = project(PRESET.loot.itemsRoi), contextRoi = project(PRESET.loot.contextRoi);
  return roi && personalFeedbackRoi && itemsRoi && contextRoi ? { combat: { roi, personalFeedbackRoi }, loot: { itemsRoi, contextRoi } } : null;
}

export function calibrationRegions(source: CalibrationSource, aspectRatio: DeltaGameAspectRatio, combat: DeltaCalibration | null, loot: DeltaLootCalibration | null, anchors?: DeltaPreparationAnchors) {
  let savedCombat: DeltaCalibrationRegions['combat'] | null = null;
  if (combat && sameCalibrationSource(source, combat) && (combat.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO) === aspectRatio && calibrationFitsBudget(combat))
    savedCombat = { roi: combat.roi, personalFeedbackRoi: combat.personalFeedbackRoi ?? null };
  const savedLoot = loot && sameCalibrationSource(source, loot) && (loot.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO) === aspectRatio && lootCalibrationFitsBudget(loot)
    ? { itemsRoi: loot.itemsRoi, contextRoi: loot.contextRoi } : null;
  const native = supportsPreparation(source) && (!anchors || (containsCenter(PREPARATION_ROIS.start, anchors.start) && containsCenter(PREPARATION_ROIS.actions, anchors.actions)));
  const projection = native ? PRESET : anchors && projectedRegions(anchors);
  const combatRegion = savedCombat ?? projection?.combat, lootRegion = savedLoot ?? projection?.loot;
  if (!combatRegion || !lootRegion || !calibrationFitsBudget({ ...source, ...combatRegion }) || !lootCalibrationFitsBudget({ ...source, ...lootRegion })) return null;
  const fallback: DeltaPreparationRegionSource = native ? 'preset' : 'estimated';
  return { combat: combatRegion, loot: lootRegion, sources: { combat: savedCombat ? 'saved' as const : fallback, loot: savedLoot ? 'saved' as const : fallback } };
}
