/** Types imported from cortico-world-desktop-pet/capture. That package is not published. */
import type { CuaFrame } from 'cortico-world-desktop-pet';

interface CuaBounds { x: number; y: number; width: number; height: number }
interface CapturedFrame { frame: CuaFrame; jpeg: Uint8Array }

export interface CapturedRegion {
  display: CuaFrame['display']; topologyRevision: string; capturedAt: string;
  width: number; height: number; bgra: Uint8Array;
}
export interface CapturedEvidence {
  capture: CapturedFrame; region: CapturedRegion; crop: CuaBounds; cropJpeg: Uint8Array;
}
