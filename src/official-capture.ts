/** Read-only adapter for the Win32 capture component shipped by Coopanion. */
import { randomUUID } from 'node:crypto';
import jpeg from 'jpeg-js';
import { captureRectangle } from './roi.ts';
import type { DeltaRoi } from './protocol.ts';

export interface NativeDisplay { id: string; primary: boolean; x: number; y: number; width: number; height: number; scale: number }
export interface NativeCapture {
  displays(): NativeDisplay[];
  capture(display: NativeDisplay): { width: number; height: number; bgra: Uint8Array };
}
const displayOf = (d: NativeDisplay) => ({ id: d.id, primary: d.primary,
  bounds: { x: d.x, y: d.y, width: d.width, height: d.height }, scaleFactor: d.scale, rotation: 0 });
export function captureSource(native: NativeCapture) {
  function read(id: string, roi: DeltaRoi) {
    const displays = native.displays();
    const d = id ? displays.find(d => d.id === id) : displays.find(d => d.primary);
    if (!d) throw new Error('Selected display is unavailable');
    if (d.width * d.height > 7680 * 4320) throw new Error('Display exceeds capture budget');
    const box = captureRectangle(roi, d.width, d.height);
    const image = native.capture(d);
    if (image.width !== d.width || image.height !== d.height || image.bgra.length !== d.width * d.height * 4) throw new Error('Invalid native capture');
    const capturedAt = new Date().toISOString(), display = displayOf(d);
    const topologyRevision = JSON.stringify(displays.map(displayOf));
    const bgra = new Uint8Array(box.width * box.height * 4);
    for (let y = 0; y < box.height; y++) {
      const offset = ((box.y + y) * d.width + box.x) * 4;
      bgra.set(image.bgra.subarray(offset, offset + box.width * 4), y * box.width * 4);
    }
    return { image, display, topologyRevision, capturedAt, box,
      region: { ...box, bgra, display, topologyRevision, capturedAt } };
  }
  function encode(bgra: Uint8Array, width: number, height: number) {
    const data = new Uint8Array(bgra.length);
    for (let i = 0; i < data.length; i += 4) { data[i] = bgra[i+2]!; data[i+1] = bgra[i+1]!; data[i+2] = bgra[i]!; data[i+3] = 255; }
    return jpeg.encode({ data, width, height }, 85).data;
  }
  return {
    async captureRoi(id: string, roi: DeltaRoi) { return read(id, roi).region; },
    async captureEvidence(id: string, roi: DeltaRoi) {
      const r = read(id, roi), { width, height } = r.image;
      const frame = { frameId: randomUUID(), capturedAt: r.capturedAt, display: r.display,
        topologyRevision: r.topologyRevision, width, height, mime: 'image/jpeg' as const,
        transform: { originX: r.display.bounds.x, originY: r.display.bounds.y, scaleX: 1, scaleY: 1 } };
      return { region: r.region, capture: { frame, jpeg: encode(r.image.bgra, width, height) },
        crop: r.box, cropJpeg: encode(r.region.bgra, r.box.width, r.box.height) };
    },
    async capture(id: string) { return (await this.captureEvidence(id, { x: 0, y: 0, width: 1, height: 1 })).capture; },
    async close() {},
  };
}
export async function createFrameSource() {
  const url = new URL(import.meta.url).searchParams.get('native');
  if (!url || !url.startsWith('file:')) throw new Error('Missing Coopanion capture module');
  return captureSource(await import(url));
}
// Enumeration is isolated from the Core process and never captures pixels.
if (process.argv[2] === '--displays') {
  const native = await import(process.argv[3]!);
  process.stdout.write(JSON.stringify(native.displays().map(displayOf)));
}
