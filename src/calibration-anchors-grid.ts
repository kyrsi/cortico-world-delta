import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaOcrBox as Box } from './ocr.ts';

interface Edges {
  width: number;
  height: number;
  horizontal: Uint8Array;
  vertical: Uint8Array;
  contrast: Uint8Array;
}

// Closing short gaps joins compression artifacts along a border without joining adjacent slots.
function closeGaps(mask: Uint8Array, start: number, count: number, stride: number, gap: number) {
  let previous = -gap - 2;
  for (let i = 0, index = start; i < count; i++, index += stride) {
    if (!mask[index]) continue;
    if (i - previous <= gap + 1) {
      for (let between = previous + 1; between < i; between++) mask[start + between * stride] = 1;
    }
    previous = i;
  }
}

function edgeMap(frame: CapturedRegion, crop: Box, textHeight: number): Edges {
  const { width, height } = crop;
  const size = width * height;
  const horizontal = new Uint8Array(size), vertical = new Uint8Array(size), contrast = new Uint8Array(size);
  const lastRow = new Uint8Array(width);
  const gap = (Math.max(3, Math.round(textHeight * .22)) | 1) - 1;
  for (let y = 0; y < height; y++) {
    let previous = 0;
    let source = ((crop.y + y) * frame.width + crop.x) * 4;
    for (let x = 0; x < width; x++, source += 4) {
      const pixel = (frame.bgra[source]! * 29 + frame.bgra[source + 1]! * 150 + frame.bgra[source + 2]! * 77 + 128) >> 8;
      const index = y * width + x;
      const delta = y ? Math.abs(pixel - lastRow[x]!) : 0;
      contrast[index] = delta;
      horizontal[index] = Number(delta >= 7);
      vertical[index] = Number(x > 0 && Math.abs(pixel - previous) >= 7);
      lastRow[x] = previous = pixel;
    }
    closeGaps(horizontal, y * width, width, 1, gap);
  }
  for (let x = 0; x < width; x++) closeGaps(vertical, x, height, width, gap);
  return { width, height, horizontal, vertical, contrast };
}

interface Segment { left: number; right: number; y: number }

function segments(edges: Edges, y: number, left: number, right: number, minLength: number) {
  const result: Segment[] = [];
  let start = left;
  const row = y * edges.width;
  for (let x = left; x <= right; x++) {
    if (x < right && edges.horizontal[row + x]) continue;
    if (x - start >= minLength) result.push({ left: start, right: x, y });
    start = x + 1;
  }
  return result;
}

function medianContrast(edges: Edges, line: Segment) {
  const offset = line.y * edges.width;
  const samples = edges.contrast.slice(offset + line.left, offset + line.right).sort();
  return samples[Math.floor(samples.length / 2)]!;
}

function header(edges: Edges, text: Box): Box | undefined {
  const h = text.height;
  const lines = (from: number, to: number) => {
    const found: Segment[] = [];
    for (let y = Math.max(1, Math.round(from)); y <= Math.min(edges.height - 1, Math.round(to)); y++) {
      for (const line of segments(edges, y, 0, edges.width, 8 * h)) {
        if (line.left >= text.x - 2.5 * h && line.left <= text.x + .25 * h && line.right >= text.x + text.width + 3 * h) found.push(line);
      }
    }
    return found;
  };
  const upper = lines(text.y - 1.35 * h, text.y);
  const lower = lines(text.y + h, text.y + 2.2 * h);
  let best = -Infinity, result: Box | undefined;
  for (const top of upper) for (const bottom of lower) {
    const overlap = (Math.min(top.right, bottom.right) - Math.max(top.left, bottom.left)) /
      (Math.max(top.right, bottom.right) - Math.min(top.left, bottom.left));
    const separation = bottom.y - top.y;
    if (overlap < .94 || separation < 1.25 * h || separation > 3 * h) continue;
    const score = 3 * overlap + (medianContrast(edges, top) + medianContrast(edges, bottom)) / 60 - Math.abs(separation - 2 * h) / (3 * h);
    if (score <= best) continue;
    best = score;
    const x = Math.round((top.left + bottom.left) / 2);
    result = { x, y: top.y, width: Math.round((top.right + bottom.right) / 2) - x, height: separation + 1 };
  }
  return result;
}

function sideCoverage(edge: Edges, x: number, start: number, end: number, margin: number) {
  let covered = 0;
  const left = Math.max(0, x - margin), right = Math.min(edge.width - 1, x + margin);
  for (let y = start; y < end; y++) for (let column = left; column <= right; column++) {
    if (edge.vertical[y * edge.width + column]) { covered++; break; }
  }
  return covered / (end - start);
}

function horizontalCoverage(edge: Edges, y: number, left: number, right: number) {
  if (left < 0 || right > edge.width || right <= left) return 0;
  let covered = 0;
  for (let x = left; x < right; x++) covered += edge.horizontal[y * edge.width + x]!;
  return covered / (right - left);
}

function inventoryGrid(edges: Edges, title: Box, h: number): Box | undefined {
  const top = title.y + title.height, margin = Math.max(2, Math.round(h * .24));
  let best = -Infinity, result: Box | undefined;
  for (let y = top; y <= Math.min(edges.height - 1, top + Math.round(1.2 * h)); y++) {
    const caps = segments(edges, y, Math.max(0, title.x - h), title.x + title.width, 3 * h);
    for (let i = 1; i < caps.length; i++) {
      const slot = caps[i - 1]!, grid = caps[i]!, separation = grid.left - slot.right;
      if (Math.abs(slot.left - title.x) > .7 * h || separation < .15 * h || separation > 1.6 * h ||
        grid.right - grid.left < .55 * (slot.right - slot.left) || y + 2 * h >= edges.height) continue;
      const sides = (cap: Segment, start: number, end: number) =>
        Math.min(sideCoverage(edges, cap.left, start, end, margin), sideCoverage(edges, cap.right, start, end, margin));
      if (sides(slot, y + 1, y + 2 * h) < .65) continue;
      const topContrast = medianContrast(edges, grid);
      for (let bottom = y + Math.round(1.8 * h); bottom < Math.min(edges.height, y + 34 * h); bottom++) {
        const coverage = horizontalCoverage(edges, bottom, grid.left, grid.right);
        if (coverage < .87 || grid.left < 2 * margin || grid.right + 2 * margin > edges.width ||
          horizontalCoverage(edges, bottom, grid.left - 2 * margin, grid.left - margin) > .60 ||
          horizontalCoverage(edges, bottom, grid.right + margin, grid.right + 2 * margin) > .60) continue;
        const support = sides(grid, y + 1, bottom);
        const after = Math.min(edges.height, bottom + Math.max(3, Math.floor(h / 3)) + 1);
        if (support < .78 || after <= bottom + 2) continue;
        const onward = sides(grid, bottom + 2, after);
        const score = 2 * support + coverage - onward + topContrast / 100;
        if (onward > .4 || score <= best) continue;
        best = score;
        result = { x: grid.left, y, width: grid.right - grid.left, height: bottom - y + 1 };
      }
    }
  }
  return result;
}

/** Source-pixel rectangles for the heading and the item grid, excluding the equipment slot to its left. */
export function measureSafeBox(frame: CapturedRegion, anchor: Box): { title: Box; items: Box } | null {
  const h = Math.round(anchor.height);
  if (h < 6) return null;
  const x = Math.max(0, Math.floor(anchor.x - 3 * h)), y = Math.max(0, Math.floor(anchor.y - 2 * h));
  const width = Math.min(frame.width, Math.ceil(anchor.x + Math.max(45 * h, 8 * anchor.width))) - x;
  const height = Math.min(frame.height, Math.ceil(anchor.y + 39 * h)) - y;
  if (width * height > 8_000_000 || width <= 0 || height <= 0) return null;
  const edges = edgeMap(frame, { x, y, width, height }, h);
  const title = header(edges, { ...anchor, x: anchor.x - x, y: anchor.y - y, height: h });
  const items = title && inventoryGrid(edges, title, h);
  if (!title || !items) return null;
  const offset = (box: Box) => ({ ...box, x: box.x + x, y: box.y + y });
  return { title: offset(title), items: offset(items) };
}
