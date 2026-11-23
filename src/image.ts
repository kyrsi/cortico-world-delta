/** Copy one rectangle of 4-byte pixels into a tightly packed buffer. */
export function copyPixelRect(source: Uint8Array, sourceWidth: number, x: number, y: number, width: number, height: number): Uint8Array {
  const target = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const start = ((y + row) * sourceWidth + x) * 4;
    target.set(source.subarray(start, start + width * 4), row * width * 4);
  }
  return target;
}
