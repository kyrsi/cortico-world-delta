/** Local fork IPC; frame-source modules provide capture only, never input operations. */
import type { CuaFrame } from 'cortico-world-desktop-pet';
import type { CapturedEvidence, CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { CalibrationSource } from './calibration.ts';
import type { DeltaGameAspectRatio, DeltaGameLanguage, DeltaPreparationAnchors, DeltaCalibrationRegions } from './protocol.ts';
import type { DeltaAttribution, DeltaCalibrationDiagnostic, DeltaDetectionConfig, DeltaDetectionState, DeltaKind, DeltaLootConfig, DeltaLootState, DeltaRoi, DeltaRecognition } from './protocol.ts';
import type { PersonalSignature } from './personal-notification.ts';

export interface DeltaCapture { frame: CuaFrame; jpeg: Uint8Array }
export interface DeltaFrameSource {
  capture(displayId: string): Promise<DeltaCapture>;
  captureRoi(displayId: string, roi: DeltaRoi): Promise<CapturedRegion>;
  captureEvidence(displayId: string, roi: DeltaRoi): Promise<CapturedEvidence>;
  close?(): Promise<void>;
}
export interface CalibrationWorkerRequest {
  kind: 'calibration-suggest' | 'calibration-source';
  frameSourceModule: string;
  displayId: string;
  gameAspectRatio?: DeltaGameAspectRatio;
  language?: DeltaGameLanguage;
}
export type CalibrationWorkerResult = { status: 'ready'; capture: DeltaCapture; anchors?: DeltaPreparationAnchors }
  | { status: 'inventory-ready'; capture: DeltaCapture; loot: DeltaCalibrationRegions['loot'] }
  | { status: 'source'; source: CalibrationSource } | { status: DeltaCalibrationDiagnostic; capture?: DeltaCapture }
  | { status: 'capture-unavailable' };

export interface DeltaWorkerSettings {
  displayId: string;
  frameSourceModule: string;
  captureIntervalMs: number;
  heartbeatMs: number;
  detection: DeltaDetectionConfig;
  loot?: DeltaLootConfig;
}
export type MainToChild = { kind: 'start'; version: 1; generation: number; settings: DeltaWorkerSettings }
  | { kind: 'stop' }
  | { kind: 'preview'; requestId: number }
  | { kind: 'simulate'; requestId: number; eventId: string; eventKind: DeltaKind; dedupKey: string };
export type ChildToMain = { kind: 'ready'; generation: number }
  | { kind: 'heartbeat'; generation: number; capturedAt: string | null; frame: CuaFrame | null; captures: number; detection: Omit<DeltaDetectionState, 'config'>;
      loot?: Omit<DeltaLootState, 'config'>; lootVisible?: Uint8Array[] }
  | { kind: 'preview'; generation: number; requestId: number; capture: DeltaCapture | null }
  | { kind: 'event'; generation: number; requestId: number; id: string; eventKind: DeltaKind; dedupKey: string; synthetic: boolean; recognition: DeltaRecognition | null;
      attribution?: DeltaAttribution | null;
      personalSignature?: PersonalSignature | null;
      lootSignature?: Uint8Array;
      /** crop uses full JPEG pixel coordinates. */
      capture: DeltaCapture; crop: { x: number; y: number; width: number; height: number }; cropJpeg: Uint8Array }
  | { kind: 'error'; generation: number; reason: 'source-unavailable' | 'worker-failed'; message: string };
