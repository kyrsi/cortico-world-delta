import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { project } from './calibration-viewport.ts';
import type { DeltaOcrBox as Box } from './ocr.ts';
import type { ProfileIconResult } from './profile-debug-trace.ts';

type Run = { x: number; y: number; width: number };
type Mask = (x: number, y: number) => boolean;
const nativeAspect = 16 / 9;

function* horizontalRuns(area: Box, bright: Mask): Generator<Run> {
  const right = area.x + area.width;
  for (let y = area.y; y < area.y + area.height; y++) {
    let x = area.x;
    while (x < right) {
      while (x < right && !bright(x, y)) x++;
      const start = x;
      while (x < right && bright(x, y)) x++;
      if (x > start) yield { x: start, y, width: x - start };
    }
  }
}

function briefcaseTop(viewport: Box, bright: Mask): Run | undefined {
  const area = project(viewport, { x: .742, y: .79, width: .016, height: .012 });
  const sy = viewport.height / 1440;
  for (const run of horizontalRuns(area, bright)) {
    if (run.width < .0065 * viewport.width || run.width > .012 * viewport.width) continue;
    const sample = (u: number, dy: number) => bright(run.x + Math.round((run.width - 1) * u), run.y + Math.round(dy * sy));
    // The filled rim is wider than the handle. A dark clasp interrupts the seam above the filled base.
    if (sample(.2, -2) || sample(.8, -2) || sample(.5, -2)) continue;
    if (!sample(.18, 2) || !sample(.82, 2) || !sample(.18, 10) || !sample(.82, 10)) continue;
    if (!sample(.5, 5) && sample(.5, 11)) return run;
  }
}

function matchesPencil(line: Run, viewport: Box, bright: Mask): boolean {
  const height = line.width * nativeAspect * viewport.height / viewport.width;
  // A blank row separates the underline from the nib. The shaft slopes up towards the cap.
  const gapY = line.y - Math.max(1, Math.round(height * .13));
  for (let x = line.x; x < line.x + line.width; x++) if (bright(x, gapY)) return false;
  const matchesSlice = (dy: number, center: number) => {
    const y = line.y - dy;
    let left = line.width, right = -1;
    for (let dx = 0; dx < line.width; dx++) {
      if (bright(line.x + dx, y)) { left = Math.min(left, dx); right = dx; }
    }
    return right >= left && right - left + 1 <= line.width * .43 &&
      Math.abs((left + right + 1) / (2 * line.width) - center) <= .15;
  };
  for (let dy = Math.round(height * .24); dy <= Math.round(height * .71); dy++) {
    if (!matchesSlice(dy, .92 * dy / height - .105)) return false;
  }
  return matchesSlice(Math.round(height * .91), .80);
}

/** Both boxes use source-frame pixels. The editable name lies between the briefcase and its underlined pencil. */
export function profileNameRegion(frame: CapturedRegion, viewport: Box, report?: (result: ProfileIconResult) => void): { box: Box; ink: Box } | null {
  const missing = (reason: ProfileIconResult) => { report?.(reason); return null; };
  const neutral = (threshold: number): Mask => (x, y) => {
    const at = (y * frame.width + x) * 4;
    const b = frame.bgra[at]!, g = frame.bgra[at + 1]!, r = frame.bgra[at + 2]!;
    const low = Math.min(r, g, b);
    return low >= threshold && Math.max(r, g, b) - low <= 32;
  };
  const inkPixel = neutral(145);
  const badge = briefcaseTop(viewport, inkPixel);
  if (!badge) return missing('badge-missing');
  const row = project(viewport, { x: .754, y: .7885, width: .218, height: .0235 });
  const baselines = project(viewport, { x: .754, y: .802, width: .218, height: .011 });
  const shaft = neutral(117);
  let pencil: Run | undefined;
  for (const run of horizontalRuns(baselines, neutral(102))) {
    if (run.x <= badge.x + badge.width || run.width < .006 * viewport.width || run.width > .011 * viewport.width) continue;
    if (!matchesPencil(run, viewport, shaft)) continue;
    if (pencil && Math.abs(pencil.x - run.x) > run.width * .2) return missing('pencil-ambiguous');
    pencil = run;
  }
  if (!pencil) return missing('pencil-missing');

  let start = badge.x + badge.width;
  for (let y = badge.y; y < row.y + row.height; y++) {
    let x = badge.x + Math.floor(.75 * badge.width);
    while (x < pencil.x && inkPixel(x, y)) x++;
    start = Math.max(start, x);
  }
  const end = pencil.x;
  let left = end, right = start - 1, top = row.y + row.height, bottom = row.y - 1;
  for (let y = row.y; y < row.y + row.height; y++) for (let x = start; x < end; x++) {
    if (!inkPixel(x, y)) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return missing('no-ink');
  if (left <= start || right >= end - 1 || top <= row.y || bottom >= row.y + row.height - 1) return missing('ink-touches-edge');
  const ink = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  if (left - start > badge.width * .7 || end - right > badge.width * 1.2) return missing('icon-gap');
  const padX = Math.max(1, Math.round(ink.height * .22 * viewport.width / (viewport.height * nativeAspect)));
  const padY = Math.max(1, Math.round(ink.height * .25));
  const x = Math.max(start, left - padX), y = Math.max(row.y, top - padY);
  report?.('found');
  return { box: { x, y, width: Math.min(end, right + 1 + padX) - x,
    height: Math.min(row.y + row.height, bottom + 1 + padY) - y }, ink };
}
