/** Game UI green. Channels are B, G, R. */
export function uiGreen(b: number, g: number, r: number): boolean {
  return g >= 105 && g - r >= 48 && g - b >= 24;
}

/** Fixed-point luma. Channels are B, G, R. */
export function bgraGray(b: number, g: number, r: number): number {
  return (b * 3735 + g * 19235 + r * 9798 + 16384) >> 15;
}
