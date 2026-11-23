import { crc32, deflateSync } from 'node:zlib';
import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';

function chunk(type: string, data: Buffer): Buffer {
  const result = Buffer.allocUnsafe(12 + data.length);
  result.writeUInt32BE(data.length);
  result.write(type, 4, 4, 'ascii');
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

/** Windows capture supplies BGR pixels with an unused alpha byte. */
export function encodeIdentityFrame({ width, height, bgra }: CapturedRegion): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  const scanlines = Buffer.allocUnsafe(height * (1 + width * 3));
  let read = 0, write = 0;
  for (let y = 0; y < height; y++) {
    scanlines[write++] = 0;
    for (let x = 0; x < width; x++, read += 4) {
      scanlines[write++] = bgra[read + 2]!;
      scanlines[write++] = bgra[read + 1]!;
      scanlines[write++] = bgra[read]!;
    }
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
