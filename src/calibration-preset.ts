import type { DeltaCalibrationRegions } from './protocol.ts';

// Normalized areas shared by preparation calibration and its illustrated help.
const normalized = (x: number, y: number, width: number, height: number) => ({
  x: x / 2560, y: y / 1440, width: width / 2560, height: height / 1440,
});

export const PREPARATION_REFERENCE_REGIONS: DeltaCalibrationRegions = {
  combat: { roi: normalized(1850, 80, 710, 220), personalFeedbackRoi: normalized(1000, 1010, 700, 80) },
  loot: { itemsRoi: normalized(980, 1000, 460, 280), contextRoi: normalized(980, 945, 650, 55) },
};
