import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaOcrBox as Box } from './ocr.ts';
import type { DeltaRoi } from './protocol.ts';

export function project(area: Box, roi: DeltaRoi): Box {
  const x = Math.floor(roi.x * area.width), y = Math.floor(roi.y * area.height);
  return { x: area.x + x, y: area.y + y, width: Math.ceil((roi.x + roi.width) * area.width) - x,
    height: Math.ceil((roi.y + roi.height) * area.height) - y };
}

function hintedViewport(frame: CapturedRegion, hint: string): Box {
  const [w, h] = hint.split(':').map(Number);
  const ratio = w && h && w > 0 && h > 0 ? w / h : 16 / 10;
  const width = Math.max(1, Math.min(frame.width, Math.round(frame.height * ratio)));
  const height = Math.max(1, Math.min(frame.height, Math.round(frame.width / ratio)));
  return { x: Math.floor((frame.width - width) / 2), y: Math.floor((frame.height - height) / 2), width, height };
}

function letterboxedViewport(frame: CapturedRegion): Box {
  const { width, height } = frame;
  function border(horizontal: boolean, reverse: boolean) {
    const across = horizontal ? width : height, extent = horizontal ? height : width;
    for (let offset = 0; offset < extent * .32; offset++) {
      const coordinate = reverse ? extent - 1 - offset : offset;
      let dark = 0;
      for (let n = 0; n < 48; n++) {
        const cross = Math.floor((n + .5) * across / 48);
        const at = (horizontal ? coordinate * width + cross : cross * width + coordinate) * 4;
        if (Math.max(frame.bgra[at]!, frame.bgra[at + 1]!, frame.bgra[at + 2]!) <= 8) dark++;
      }
      if (dark < 47) return offset;
    }
    return 0;
  }
  const pair = (horizontal: boolean) => {
    const near = border(horizontal, false), far = border(horizontal, true);
    return Math.min(near, far) >= 4 && Math.abs(near - far) <= Math.max(3, near * .04) ? [near, far] as const : [0, 0] as const;
  };
  const [x, right] = pair(false), [y, bottom] = pair(true);
  return { x, y, width: width - x - right, height: height - y - bottom };
}

/** The capture can be stretched or letterboxed independently of the configured game ratio. */
export function calibrationViewports(frame: CapturedRegion, aspectRatio: string): readonly [Box, Box, Box] {
  return [hintedViewport(frame, aspectRatio), letterboxedViewport(frame), { x: 0, y: 0, width: frame.width, height: frame.height }];
}
