import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { PREPARATION_ROIS, SOLO_PREPARATION_MODE_ROI } from './calibration.ts';
import { measureSafeBox } from './calibration-anchors-grid.ts';
import { calibrationViewports, project } from './calibration-viewport.ts';
import type { DeltaOcrBox as Box, DeltaOcrLine, DeltaOcrPort } from './ocr.ts';
import { doubleOcrRaster } from './personal-text-fallback.ts';
import type { DeltaCalibrationRegions, DeltaRoi } from './protocol.ts';

export type CalibrationAnchors =
  | { scene: 'preparation'; start: DeltaRoi; actions: DeltaRoi }
  | { scene: 'inventory'; loot: DeltaCalibrationRegions['loot'] };

const labels = {
  start: /^[开犴]始游戏$/u, gear: /^配装$/u, deploy: /^出发$/u,
  squad: /^出发[[(]?[1-3彐]\/([3彐引])[\])]?$/u,
  solo: /^行前备战$/u, mode: /^端游对局[一、]?$/u, matching: /^(匹配成功|正在匹配|正在搜索对局)$/u,
  safe: /^(安全箱|保险箱|safebox|securecontainer)$/u,
};
type Label = keyof typeof labels;
type Anchor = { label: Label; box: Box };
const labelPatterns = Object.entries(labels) as [Label, RegExp][];
const extent = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};

function lineAnchors(line: DeltaOcrLine): Anchor[] {
  const result: Anchor[] = [];
  for (let first = 0; first < line.words.length; first++) {
    let text = '', box = line.words[first]!.box;
    for (let last = first; last < Math.min(line.words.length, first + 10); last++) {
      const word = line.words[last]!;
      text += word.text.normalize('NFKC').toLowerCase().replace(/\s+/gu, '');
      if (text.length > 16) break;
      box = extent(box, word.box);
      const label = labelPatterns.find(([name, pattern]) => pattern.test(name === 'safe' ? text.replace(/[:;：；]+$/u, '') : text))?.[0];
      if (!label) continue;
      // Windows can merge adjacent controls into one line. Require an independent label within that line.
      const previous = line.words[first - 1], next = line.words[last + 1];
      if (previous && /[\p{L}\p{N}]$/u.test(previous.text.trim()) &&
        box.x - previous.box.x - previous.box.width < box.height * .6) continue;
      if (next && (label === 'safe' ? /^\p{L}/u : /^[\p{L}\p{N}]/u).test(next.text.trim()) &&
        next.box.x - box.x - box.width < box.height * .6) continue;
      result.push({ label, box });
    }
  }
  return result;
}

export function scanRaster(frame: CapturedRegion, box: Box, enlargeText: boolean, maxScale: number) {
  const budget = 1_750_000;
  if (enlargeText && 4 * box.width * box.height <= budget && Math.max(box.width, box.height) <= 1150) {
    const gray = new Uint8Array(box.width * box.height);
    for (let y = 0, i = 0; y < box.height; y++) {
      let at = ((box.y + y) * frame.width + box.x) * 4;
      for (let x = 0; x < box.width; x++, i++, at += 4) {
        gray[i] = (frame.bgra[at]! * 3735 + frame.bgra[at + 1]! * 19235 + frame.bgra[at + 2]! * 9798 + 16384) >> 15;
      }
    }
    return doubleOcrRaster(gray, box.width, box.height);
  }
  const scale = Math.min(maxScale, Math.sqrt(budget / (box.width * box.height)), 2350 / Math.max(box.width, box.height));
  const width = Math.max(1, Math.floor(box.width * scale)), height = Math.max(1, Math.floor(box.height * scale));
  const bgra = new Uint8Array(width * height * 4);
  const pixels = new Uint32Array(bgra.buffer);
  const columns = Int32Array.from({ length: width }, (_, x) => box.x + Math.floor(x * box.width / width));
  // Native capture is aligned. An extension-supplied frame may be a byte-offset view.
  const sourcePixels = frame.bgra.byteOffset % 4 === 0 ? new Uint32Array(frame.bgra.buffer, frame.bgra.byteOffset, frame.bgra.byteLength / 4) : null;
  for (let y = 0; y < height; y++) {
    const offset = (box.y + Math.floor(y * box.height / height)) * frame.width;
    for (let x = 0; x < width; x++) {
      const index = offset + columns[x]!;
      if (sourcePixels) pixels[y * width + x] = sourcePixels[index]!;
      else bgra.set(frame.bgra.subarray(index * 4, index * 4 + 4), (y * width + x) * 4);
    }
  }
  return { width, height, bgra };
}

function relative(box: Box, frame: CapturedRegion): DeltaRoi {
  return { x: box.x / frame.width, y: box.y / frame.height,
    width: (box.x + box.width) / frame.width - box.x / frame.width, height: (box.y + box.height) / frame.height - box.y / frame.height };
}

function matchingBanner(frame: CapturedRegion, start: Box, action: Box) {
  const count = 24;
  const span = action.x + action.width - start.x;
  let rows = 0;
  for (let y = Math.max(0, start.y - 6 * start.height); y < start.y; y++) {
    let green = 0;
    for (let column = 0; column < count; column++) {
      const x = start.x + Math.floor((column + .5) * span / count);
      const at = (frame.width * y + x) * 4, g = frame.bgra[at + 1]!;
      if (g >= 105 && g - frame.bgra[at + 2]! >= 48 && g - frame.bgra[at]! >= 24) green++;
    }
    rows = green >= 21 ? rows + 1 : 0;
    if (rows >= Math.max(3, start.height / 4)) return true;
  }
  return false;
}

function preparation(frame: CapturedRegion, anchors: Anchor[]): CalibrationAnchors | null {
  if (anchors.some(({ label }) => label === 'matching')) return null;
  const boxes = (name: Label) => anchors.filter(({ label }) => label === name).map(({ box }) => box);
  const actions = boxes('solo'), modes = boxes('mode');
  for (const gear of boxes('gear')) {
    const hasMode = modes.some(mode => mode.y + mode.height < gear.y && gear.y - mode.y <= gear.height * 18 &&
      Math.abs(mode.x - gear.x) <= 14 * Math.max(gear.width, mode.width));
    for (const button of [...boxes('squad'), ...(hasMode ? boxes('deploy') : [])]) {
      const gap = button.x - gear.x - gear.width;
      if (gap >= 0 && gap <= 8 * Math.max(button.width, gear.width) &&
        Math.abs(gear.y + gear.height / 2 - button.y - button.height / 2) <= Math.max(button.height, gear.height)) actions.push(extent(gear, button));
    }
  }
  for (const start of boxes('start')) for (const action of actions) {
    if (action.x < start.x + start.width || action.y < start.y + 3 * start.height || matchingBanner(frame, start, action)) continue;
    return { scene: 'preparation', start: relative(start, frame), actions: relative(action, frame) };
  }
  return null;
}

// When broad OCR only reads one corner, green underlines and buttons identify the opposite corner's text crop.
function preparationFocus(frame: CapturedRegion, anchors: Anchor[]): Box[] {
  const start = anchors.find(({ label }) => label === 'start');
  const action = anchors.find(({ label }) => label === 'gear' || label === 'solo' || label === 'squad');
  if (!start && !action) return [];
  const size = (start ?? action)!.box.height;
  const x0 = start ? Math.min(frame.width - 1, start.box.x + start.box.width) : 0;
  const x1 = start ? frame.width : action!.box.x;
  const y0 = start ? start.box.y + start.box.height : 0, y1 = start ? frame.height : action!.box.y;
  const candidates: Box[] = [];
  let active: Box[] = [];
  function retain(box: Box) {
    if (start ? box.height < size * .85 || box.height > size * 4 || box.width <= box.height * 3
      : box.height < 2 || box.height >= size / 2 || box.y <= size * 2 || box.width >= size * 15) return;
    candidates.push(box);
    candidates.sort(start ? (a, b) => b.width * b.height - a.width * a.height : (a, b) => a.y - b.y || b.width - a.width);
    if (candidates.length > 3) candidates.pop();
  }
  const maxGap = start ? 3 * size : Math.ceil(size / 4);
  for (let y = y0; y < y1; y++) {
    const next: Box[] = [];
    let first = -1, last = -1;
    for (let x = x0; x <= x1; x++) {
      if (x < x1) {
        const at = (y * frame.width + x) * 4, g = frame.bgra[at + 1]!;
        if (g > 102 && g - frame.bgra[at + 2]! > 40 && g - frame.bgra[at]! > 12) {
          if (first < 0) first = x;
          last = x;
          continue;
        }
      }
      if (first < 0 || (x < x1 && x - last <= maxGap)) continue;
      const width = last - first + 1;
      if (width >= size * 4 && width <= size * 35) {
        const prior = active.find(box => Math.abs(first - box.x) < size && Math.abs(width - box.width) < size * 1.5);
        if (prior) {
          prior.height = y - prior.y + 1;
          next.push(prior);
        } else {
          next.push({ x: first, y, width, height: 1 });
        }
      }
      first = last = -1;
    }
    for (const candidate of active) if (!next.includes(candidate)) retain(candidate);
    active = next;
  }
  for (const candidate of active) retain(candidate);
  return start ? candidates : candidates.map(box => ({ ...box, y: Math.max(0, box.y - 3 * size), height: Math.min(box.y, 3 * size) }));
}

/** Ratio selects the first search windows. Returned rectangles are measured in the complete captured frame. */
export async function detectCalibrationAnchors(frame: CapturedRegion, aspectRatio: string, ocr: Pick<DeltaOcrPort, 'recognizeLayout'>): Promise<CalibrationAnchors | null> {
  const areas = calibrationViewports(frame, aspectRatio);
  const whole = areas[2];
  const scanned = new Set<string>(), anchors: Anchor[] = [];
  const measured = new Map<string, ReturnType<typeof measureSafeBox>>();
  async function scan(box: Box, enlarge = false, maxScale = 2.4) {
    const key = [box.x, box.y, box.width, box.height, enlarge, maxScale].join('/');
    if (scanned.has(key) || box.width < 2 || box.height < 2) return;
    scanned.add(key);
    const raster = scanRaster(frame, box, enlarge, maxScale);
    const layout = await ocr.recognizeLayout({ ...frame, ...raster });
    if (layout.truncated) return;
    for (const line of layout.lines) for (const hit of lineAnchors(line)) {
      const p = hit.box;
      const x = box.x + Math.round(p.x * box.width / raster.width), y = box.y + Math.round(p.y * box.height / raster.height);
      const right = box.x + Math.round((p.x + p.width) * box.width / raster.width);
      const bottom = box.y + Math.round((p.y + p.height) * box.height / raster.height);
      if (right > x && bottom > y) anchors.push({ label: hit.label, box: { x, y, width: right - x, height: bottom - y } });
    }
  }
  function inventory(): CalibrationAnchors | null {
    let chosen: ReturnType<typeof measureSafeBox> = null;
    for (const { label, box } of anchors) {
      if (label !== 'safe') continue;
      const key = [box.x, box.y, box.width, box.height].join('/');
      if (!measured.has(key)) measured.set(key, measureSafeBox(frame, box));
      const grid = measured.get(key);
      if (!grid) continue;
      if (chosen && (Math.abs(chosen.items.x - grid.items.x) > 4 || Math.abs(chosen.items.y - grid.items.y) > 4 ||
        Math.abs(chosen.items.width - grid.items.width) > 4 || Math.abs(chosen.items.height - grid.items.height) > 4)) return null;
      chosen = grid;
    }
    return chosen && { scene: 'inventory', loot: { contextRoi: relative(chosen.title, frame), itemsRoi: relative(chosen.items, frame) } };
  }
  for (const area of areas) {
    await scan(project(area, { x: .24, y: .49, width: .42, height: .43 }));
    const loot = inventory();
    if (loot) return loot;
    await scan(project(area, PREPARATION_ROIS.start), true);
    await scan(project(area, PREPARATION_ROIS.actions), true);
    if (anchors.some(({ label }) => label === 'deploy') && !anchors.some(({ label }) => label === 'squad')) await scan(project(area, SOLO_PREPARATION_MODE_ROI), true);
    const ready = preparation(frame, anchors);
    if (ready) return ready;
  }
  await scan(whole);
  const overviewLoot = inventory();
  if (overviewLoot) return overviewLoot;
  // Overlapping quadrants also cover controls moved outside the expected positions by a different layout.
  for (const y of [0, .41]) for (const x of [0, .41]) {
    await scan(project(whole, { x, y, width: .59, height: .59 }));
  }
  const found = inventory() ?? preparation(frame, anchors);
  if (found || anchors.some(({ label }) => label === 'matching')) return found;
  // A stretched font can be clearer at its native pixel width than after interpolation.
  if (anchors.some(({ label }) => label === 'gear' || label === 'squad' || label === 'solo') && !anchors.some(({ label }) => label === 'start')) {
    await scan(project(whole, { x: 0, y: 0, width: .58, height: .58 }), false, 1);
    const ready = preparation(frame, anchors);
    if (ready) return ready;
  }
  for (const box of preparationFocus(frame, anchors)) {
    await scan(box, true);
    const ready = preparation(frame, anchors);
    if (ready) return ready;
  }
  return null;
}
