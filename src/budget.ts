import { DELTA_MAX_LOOT_CONTEXT_PIXELS, DELTA_MAX_LOOT_ITEMS_PIXELS, DELTA_MAX_LOOT_ROI_AREA, DELTA_MAX_ROI_AREA, DELTA_MAX_ROI_PIXELS } from './limits.ts';
import type { DeltaCalibration, DeltaLootCalibration, DeltaRoi } from './protocol.ts';
import { unionRect } from './rect.ts';
import { captureRectangle, captureRoi, outwardRectangle } from './roi.ts';

function acceptedRoi(roi: DeltaRoi | null): roi is DeltaRoi {
  return captureRoi(roi) !== null;
}

/** Live combat regions. A non-finite total stays under the limit; saved calibrations use calibrationFitsBudget. */
export function combatSelectionTooLarge(regions: readonly DeltaRoi[], width: number, height: number): boolean {
  const area = regions.reduce((total, roi) => total + roi.width * roi.height, 0);
  const pixels = regions.reduce((total, roi) => {
    const box = outwardRectangle(roi, width, height);
    return total + box.width * box.height;
  }, 0);
  return area > DELTA_MAX_ROI_AREA || pixels > DELTA_MAX_ROI_PIXELS;
}

export function calibrationFitsBudget(calibration: DeltaCalibration): boolean {
  try {
    const regions = [calibration.roi, ...(calibration.personalFeedbackRoi ? [calibration.personalFeedbackRoi] : [])];
    const { width, height } = calibration.display.bounds;
    for (const roi of regions) captureRectangle(roi, width, height);
    return !combatSelectionTooLarge(regions, width, height);
  } catch { return false; }
}

/** Live loot regions. An invalid region contributes no pixels; saved calibrations use lootCalibrationFitsBudget. */
export function lootSelectionTooLarge(items: DeltaRoi | null, context: DeltaRoi | null, width: number, height: number,
  valid: (roi: DeltaRoi | null) => roi is DeltaRoi): boolean {
  const pixels = (roi: DeltaRoi | null): number => {
    if (!valid(roi)) return 0;
    const box = outwardRectangle(roi, width, height);
    return box.width * box.height;
  };
  const regions = [items, context].filter(valid);
  const area = regions.reduce((sum, roi) => sum + roi.width * roi.height, 0);
  const bounds = regions.length === 0 ? null : regions.length === 1 ? regions[0]! : unionRect(regions[0]!, regions[1]!);
  return pixels(items) > DELTA_MAX_LOOT_ITEMS_PIXELS || pixels(context) > DELTA_MAX_LOOT_CONTEXT_PIXELS
    || area > DELTA_MAX_LOOT_ROI_AREA || pixels(bounds) > DELTA_MAX_ROI_PIXELS;
}

export function lootCalibrationFitsBudget(calibration: DeltaLootCalibration): boolean {
  try {
    const { width, height } = calibration.display.bounds;
    captureRectangle(calibration.itemsRoi, width, height);
    captureRectangle(calibration.contextRoi, width, height);
    captureRectangle(unionRect(calibration.itemsRoi, calibration.contextRoi), width, height);
    return !lootSelectionTooLarge(calibration.itemsRoi, calibration.contextRoi, width, height, acceptedRoi);
  } catch { return false; }
}
