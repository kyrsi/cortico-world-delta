import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import jpeg from 'jpeg-js';

export const displays = ['primary', 'secondary'].map((id, index) => ({
  id, name: id, primary: index === 0, systemNumber: index + 1, scaleFactor: 1, rotation: 0,
  bounds: { x: 32 * index, y: 0, width: 32, height: 24 },
}));

export function createFrameSource() {
  let closed = false;
  async function selected(id) {
    const connected = JSON.parse(await readFile(process.env.DELTA_TEST_DISPLAYS, 'utf8'));
    if (connected === 'broken-pipe') closed = true;
    if (closed) throw Object.assign(new Error('Screen capture pipe closed'), { code: 'captureTransportFailed' });
    const display = displays.find(display => display.id === id && connected.includes(id));
    if (!display) throw new Error('Selected test display is disconnected');
    return display;
  }
  return {
    async captureRoi(id) {
      return { display: await selected(id), capturedAt: new Date().toISOString(), topologyRevision: 'test',
        width: 1, height: 1, bgra: new Uint8Array([30, 90, 170, 255]) };
    },
    async capture(id) {
      const display = await selected(id), { width, height, x, y } = display.bounds;
      return { frame: { frameId: randomUUID(), capturedAt: new Date().toISOString(), display, width, height,
        topologyRevision: 'test', mime: 'image/jpeg', transform: { originX: x, originY: y, scaleX: 1, scaleY: 1 } },
        jpeg: jpeg.encode({ width, height, data: Buffer.alloc(width * height * 4, 230) }).data };
    },
  };
}
