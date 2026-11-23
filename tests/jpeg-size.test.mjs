import assert from 'node:assert/strict';
import test from 'node:test';
import jpeg from 'jpeg-js';
import { jpegSize } from '../src/jpeg-size.ts';

function rgba(width, height) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = i & 255; data[i + 1] = (i * 3) & 255; data[i + 2] = (i * 7) & 255; data[i + 3] = 255;
  }
  return data;
}

test('jpegSize reads a baseline JPEG produced by jpeg-js', () => {
  const width = 18, height = 13;
  const encoded = jpeg.encode({ width, height, data: rgba(width, height) }, 75).data;
  const decoded = jpeg.decode(encoded, { useTArray: true });
  assert.deepEqual(jpegSize(encoded), { width, height });
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
});

test('jpegSize reads SOF1 and a progressive SOF2 header', () => {
  const sof1 = Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc1, 0x00, 0x0b, 0x08, 0x00, 0x09, 0x00, 0x07, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ]);
  const sof2 = Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xfe, 0x00, 0x05, 0x41, 0x42, 0x43,
    0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x64, 0x00, 0xc8, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ]);
  assert.deepEqual(jpegSize(sof1), { width: 7, height: 9 });
  assert.deepEqual(jpegSize(sof2), { width: 200, height: 100 });
});

test('jpegSize returns null for truncated, empty, and garbage input', () => {
  const encoded = jpeg.encode({ width: 8, height: 8, data: rgba(8, 8) }, 75).data;
  const progressive = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x20, 0x01, 0x01, 0x11, 0x00,
  ]);
  assert.equal(jpegSize(Uint8Array.of()), null);
  assert.equal(jpegSize(Uint8Array.of(0xff, 0xd8)), null);
  assert.equal(jpegSize(Uint8Array.of(0xff, 0xd8, 0xff, 0xc0, 0x00)), null);
  assert.equal(jpegSize(encoded.subarray(0, 4)), null);
  assert.equal(jpegSize(progressive.subarray(0, 8)), null);
  assert.equal(jpegSize(Uint8Array.of(0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10)), null);
  assert.equal(jpegSize(Uint8Array.from([1, 2, 3, 4, 5])), null);
  assert.equal(jpegSize(Uint8Array.of(0xff, 0xd8, 0x00, 0x00)), null);
  assert.equal(jpegSize(Uint8Array.of(0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x00, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00)), null);
});
