/** Checks saved calibration against the latest captured display without changing regions. */
import type { CuaFrame } from 'cortico-world-desktop-pet';
import { calibrationFitsBudget, matchesCalibration } from './detector.ts';
import { lootCalibrationFitsBudget } from './loot-detector.ts';
import type { DeltaCalibration, DeltaDetectionConfig, DeltaLootConfig, DeltaStartupCalibrationState, DeltaStartupCheck } from './protocol.ts';

function calibrationState(frame: CuaFrame | null, enabled: boolean, calibration: DeltaCalibration | null, fitsBudget: () => boolean): DeltaStartupCalibrationState {
  if (!enabled) return { status: 'disabled', reason: null };
  if (!calibration) return { status: 'missing', reason: 'calibration-required' };
  if (!frame) return { status: 'pending', reason: null };
  const current = frame.display, saved = calibration.display, a = current.bounds, b = saved.bounds;
  let reason: DeltaStartupCalibrationState['reason'] = null;
  if (current.id !== saved.id) reason = 'display-changed';
  else if (a.width * b.height !== b.width * a.height) reason = 'aspect-changed';
  else if (a.width !== b.width || a.height !== b.height) reason = 'resolution-changed';
  else if (current.scaleFactor !== saved.scaleFactor) reason = 'scale-changed';
  else if (a.x !== b.x || a.y !== b.y || current.rotation !== saved.rotation || current.name !== saved.name
    || current.systemNumber !== saved.systemNumber || current.primary !== saved.primary) reason = 'geometry-changed';
  else if (frame.topologyRevision !== calibration.topologyRevision) reason = 'topology-changed';
  else if (!matchesCalibration(frame, calibration)) reason = 'geometry-changed';
  if (!reason) {
    try { if (!fitsBudget()) reason = 'roi-too-large'; }
    catch { reason = 'roi-too-large'; }
  }
  return { status: reason ? 'invalid' : 'compatible', reason };
}

export function startupCheck(frame: CuaFrame | null, detection: DeltaDetectionConfig, loot: DeltaLootConfig): DeltaStartupCheck {
  const ratio = frame ? frame.display.bounds.width / frame.display.bounds.height : 0;
  // Ultrawide display modes marketed as 21:9 include 2560x1080 and 3440x1440.
  const aspectClass = Math.abs(ratio - 16 / 9) <= 0.01 ? '16:9' : Math.abs(ratio - 16 / 10) <= 0.01 ? '16:10'
    : Math.abs(ratio - 21 / 9) <= 0.06 ? '21:9' : 'other';
  return {
    phase: frame ? 'checked' : 'pending', checkedAt: frame?.capturedAt ?? null,
    source: frame ? { displayId: frame.display.id, width: frame.display.bounds.width, height: frame.display.bounds.height,
      aspectRatio: ratio, aspectClass, scaleFactor: frame.display.scaleFactor, rotation: frame.display.rotation, topologyRevision: frame.topologyRevision } : null,
    detection: calibrationState(frame, detection.enabled, detection.calibration, () => calibrationFitsBudget(detection.calibration!)),
    loot: calibrationState(frame, loot.enabled, loot.calibration ? { ...loot.calibration, roi: loot.calibration.itemsRoi } : null,
      () => lootCalibrationFitsBudget(loot.calibration!)),
  };
}
