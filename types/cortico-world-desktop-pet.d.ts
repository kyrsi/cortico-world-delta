/** Types imported from cortico-world-desktop-pet. That package is not published. */

/** Desktop-pet panel `pet` computer-use data. Display coordinates are physical desktop pixels. */
interface CuaBounds { x: number; y: number; width: number; height: number }

export interface CuaDisplay {
  /** Monitor device-interface identity on Windows; independent of enumeration order. */
  id: string;
  name: string;
  /** Windows GDI display number, or null when the platform supplies no number. */
  systemNumber: number | null;
  primary: boolean;
  bounds: CuaBounds;
  scaleFactor: number | null;
  rotation: number | null;
}

export interface CuaFrame {
  frameId: string;
  capturedAt: string;
  display: CuaDisplay;
  topologyRevision: string;
  width: number;
  height: number;
  mime: 'image/jpeg';
  /** Desktop position = origin + screenshot position / scale, independently on each axis. */
  transform: { originX: number; originY: number; scaleX: number; scaleY: number };
}
