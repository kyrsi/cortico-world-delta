/** Read-only Windows capture for hosts without a desktop observation API. */
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import type { CuaDisplay } from 'cortico-world-desktop-pet';
import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaCapture, DeltaFrameSource } from './engine-ipc.ts';
import { copyPixelRect } from './image.ts';
import { powershellExecutable } from './powershell.ts';
import type { DeltaRoi } from './protocol.ts';
import { captureRectangle } from './roi.ts';

const nativeSource = fileURLToPath(new URL('../src/standalone/WindowsCapture.cs', import.meta.url));
const bootstrap = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -TypeDefinition ([IO.File]::ReadAllText($env:DELTA_CAPTURE_SOURCE)) -ReferencedAssemblies @('System.Drawing.dll','System.Web.Extensions.dll','System.Core.dll','System.dll')",
  '[DeltaObservation.CaptureService]::Run()',
].join('\n');

interface Header {
  displays: CuaDisplay[];
  capturedAt: string;
  width: number;
  height: number;
  roiWidth: number;
  roiHeight: number;
  jpegLength: number;
  bgraLength: number;
  regions?: { width: number; height: number; length: number }[];
  error?: string;
}

type Operation = 'list' | 'frame' | 'region' | 'evidence' | 'regions';
interface Reply { header: Header; jpeg: Buffer; bgra: Buffer }

function transportFailure(message: string) {
  return Object.assign(new Error(message), { code: 'captureTransportFailed' });
}

function openNativeCapture() {
  if (process.platform !== 'win32') throw new Error('Standalone screen capture requires Windows');
  const command = powershellExecutable();
  const helper = spawn(command, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', bootstrap], {
    shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, DELTA_CAPTURE_SOURCE: nativeSource },
  });
  let closed = false;
  let diagnostic = '';
  helper.stderr.setEncoding('utf8').on('data', (chunk: string) => { diagnostic = (diagnostic + chunk).slice(-1200); });
  helper.on('error', error => { diagnostic = error.message; });
  helper.stdin.on('error', () => {}); // Pending writes receive the same error in their callback.
  const done = new Promise<void>(resolve => { helper.once('close', () => { closed = true; resolve(); }); });
  const reader = helper.stdout[Symbol.asyncIterator]();
  let remainder: Buffer = Buffer.alloc(0);

  async function read(size: number, limit: number) {
    if (!Number.isSafeInteger(size) || size < 0 || size > limit) throw new Error('Invalid screen capture response size');
    const result = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      if (!remainder.length) {
        const part = await reader.next();
        if (part.done) throw new Error(diagnostic.trim() || 'Screen capture process exited');
        remainder = part.value;
      }
      const copied = remainder.copy(result, offset, 0, size - offset);
      offset += copied;
      remainder = remainder.subarray(copied);
    }
    return result;
  }

  function close() {
    if (!closed) {
      closed = true;
      helper.kill();
    }
    return done;
  }

  let queue: Promise<void> = Promise.resolve();
  function request(op: Operation, displayId?: string, roi?: DeltaRoi, rois?: readonly DeltaRoi[]): Promise<Reply> {
    const next = queue.then(async () => {
      if (closed) throw transportFailure(diagnostic.trim() || 'Screen capture process closed');
      // The binary response is framed; a timed-out or incomplete response invalidates this pipe.
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; void close(); }, 12_000);
      let header: Header;
      let image: Buffer, pixels: Buffer;
      try {
        const body = rois ? { op, displayId, rois } : { op, displayId, roi };
        await new Promise<void>((resolve, reject) => {
          helper.stdin.write(JSON.stringify(body) + '\n', error => error ? reject(error) : resolve());
        });
        const headerSize = (await read(4, 4)).readUInt32LE();
        header = JSON.parse((await read(headerSize, 256 * 1024)).toString('utf8')) as Header;
        image = await read(header.error ? 0 : header.jpegLength, 8 * 1024 * 1024);
        pixels = await read(header.error ? 0 : header.bgraLength, 256 * 1024 * 1024);
      } catch (error) {
        await close();
        throw transportFailure(timedOut ? 'Screen capture process timed out' : String(error));
      } finally { clearTimeout(timeout); }
      if (header.error) {
        const code = header.error === 'displayUnavailable' || header.error === 'displayChanged' ? header.error : 'captureFailed';
        throw Object.assign(new Error(header.error), { code });
      }
      return { header, jpeg: image, bgra: pixels };
    });
    queue = next.then(() => {}, () => {});
    return next;
  }
  return { request, close };
}

function topology(displays: CuaDisplay[]) {
  // The host hashes this field order when it saves calibration and screenshot metadata.
  const ordered = displays.map(d => ({
    id: d.id, name: d.name, systemNumber: d.systemNumber, primary: d.primary,
    bounds: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height },
    scaleFactor: d.scaleFactor, rotation: d.rotation,
  })).sort((a, b) => a.id.localeCompare(b.id));
  return { displays: ordered, revision: createHash('sha256').update(JSON.stringify(ordered)).digest('hex') };
}

/** Enumeration reads only Windows display metadata and releases the helper before returning. */
export async function listDisplays(): Promise<CuaDisplay[]> {
  const helper = openNativeCapture();
  try { return topology((await helper.request('list')).header.displays).displays; }
  finally { await helper.close(); }
}

function cropPreview(image: Uint8Array, roi: DeltaRoi, width: number, height: number) {
  const crop = captureRectangle(roi, width, height);
  const full = jpeg.decode(image, { useTArray: true });
  const data = copyPixelRect(full.data, width, crop.x, crop.y, crop.width, crop.height);
  return { crop, cropJpeg: jpeg.encode({ width: crop.width, height: crop.height, data }, 75).data };
}

export function createFrameSource(): DeltaFrameSource {
  const helper = openNativeCapture();
  async function capture(op: Exclude<Operation, 'list'>, id: string, roi?: DeltaRoi) {
    if (!id) throw Object.assign(new Error('displayUnavailable'), { code: 'displayUnavailable' });
    if (roi) captureRectangle(roi, 1, 1);
    const reply = await helper.request(op, id, roi);
    const topo = topology(reply.header.displays);
    const display = topo.displays.find(candidate => candidate.id === id);
    if (!display) throw new Error('Selected display missing from capture response');
    return { ...reply, meta: { display, topologyRevision: topo.revision, capturedAt: reply.header.capturedAt } };
  }
  type Sample = Awaited<ReturnType<typeof capture>>;
  function frame({ header, jpeg: image, meta }: Sample): DeltaCapture {
    const { width, height } = header;
    const bounds = meta.display.bounds;
    return { jpeg: image, frame: { ...meta, frameId: randomUUID(), width, height, mime: 'image/jpeg',
      transform: { originX: bounds.x, originY: bounds.y, scaleX: width / bounds.width, scaleY: height / bounds.height } } };
  }
  function region({ header, bgra, meta }: Sample): CapturedRegion {
    return { ...meta, width: header.roiWidth, height: header.roiHeight, bgra };
  }
  function splitRegions(sample: Sample, count: number): CapturedRegion[] {
    const parts = sample.header.regions;
    if (!parts || parts.length !== count) throw Object.assign(new Error('Incomplete capture'), { code: 'captureFailed' });
    let offset = 0;
    const regions = parts.map(part => {
      const bytes = part.length;
      if (!Number.isInteger(part.width) || !Number.isInteger(part.height) || !Number.isInteger(bytes) || part.width < 1 || part.height < 1
        || bytes !== part.width * part.height * 4 || offset + bytes > sample.bgra.length) {
        throw Object.assign(new Error('Invalid capture region size'), { code: 'captureFailed' });
      }
      const bgra = sample.bgra.subarray(offset, offset + bytes);
      offset += bytes;
      return { ...sample.meta, width: part.width, height: part.height, bgra };
    });
    if (offset !== sample.bgra.length) throw Object.assign(new Error('Invalid capture region size'), { code: 'captureFailed' });
    return regions;
  }
  return {
    capture: async id => frame(await capture('frame', id)),
    captureRoi: async (id, roi) => region(await capture('region', id, roi)),
    async captureRois(id, rois) {
      if (rois.length < 2 || rois.length > 8) throw new Error('Invalid capture region');
      for (const roi of rois) captureRectangle(roi, 1, 1);
      if (!id) throw Object.assign(new Error('displayUnavailable'), { code: 'displayUnavailable' });
      const reply = await helper.request('regions', id, undefined, rois);
      const topo = topology(reply.header.displays);
      const display = topo.displays.find(candidate => candidate.id === id);
      if (!display) throw new Error('Selected display missing from capture response');
      return splitRegions({ ...reply, meta: { display, topologyRevision: topo.revision, capturedAt: reply.header.capturedAt } }, rois.length);
    },
    async captureEvidence(id, roi) {
      const sample = await capture('evidence', id, roi);
      return { capture: frame(sample), region: region(sample),
        ...cropPreview(sample.jpeg, roi, sample.header.width, sample.header.height) };
    },
    close: helper.close,
  };
}
