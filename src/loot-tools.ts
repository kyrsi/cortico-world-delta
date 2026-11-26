import { readFile } from 'node:fs/promises';
import jpeg from 'jpeg-js';
import type { ToolDef, ToolOutcome } from 'cortico/core/types.ts';
import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import describe from '../describe.json' with { type: 'json' };
import { encodeIdentityFrame } from './identity-debug-png.ts';

interface RedItem {
  id: string;
  name: string;
  category: string;
  image: string;
  recognitionNote?: string;
  lookalikeIds?: string[];
}
const MAX_ICON_BYTES = 2 * 1024 * 1024;

export const lootToolDescriptions = describe.tools.map(tool => ({ ...tool, tags: ['read'] as const }));

export function encodeLootDetail(pixels: Pick<CapturedRegion, 'width' | 'height' | 'bgra'>, acceptsPng: boolean) {
  if (acceptsPng) return { bytes: encodeIdentityFrame(pixels), mime: 'image/png' };
  const data = new Uint8Array(pixels.bgra);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = pixels.bgra[i + 2]!; data[i + 2] = pixels.bgra[i]!; data[i + 3] = 255;
  }
  return { bytes: jpeg.encode({ width: pixels.width, height: pixels.height, data }, 95).data, mime: 'image/jpeg' };
}

async function lookup(args: Record<string, unknown>, acceptsPng: boolean, signal?: AbortSignal): Promise<ToolOutcome> {
  let items: RedItem[];
  try {
    const catalog = JSON.parse(await readFile(new URL('../knowledge/red-items.json', import.meta.url), 'utf8'));
    items = catalog.items;
  } catch {
    return { text: 'The red item catalog is unavailable.', failed: true };
  }
  const query = String(args.query ?? '').trim().toLowerCase();
  const exact = items.filter(item => item.id.toLowerCase() === query || item.name.toLowerCase() === query);
  const matches = exact.length ? exact : items.filter(item => (item.name + ' ' + item.category).toLowerCase().includes(query));
  if (!matches.length) return { text: 'No matching entry. Try a shorter Chinese name or omit query to list the catalog.' };
  const candidates = new Map(matches.map(item => [item.id, item]));
  if (query) {
    const related = new Set(matches.flatMap(item => item.lookalikeIds ?? []));
    for (const item of items) if (related.has(item.id)) candidates.set(item.id, item);
  }
  const text = Array.from(candidates.values(), item => {
    const label = `${item.id}  ${item.name}  ${item.category}`;
    return query && item.recognitionNote ? `${label} — ${item.recognitionNote}` : label;
  }).join('\n');
  if (!args.includeImage) return { text };
  const item = matches.length === 1 ? matches[0] : undefined;
  const ambiguousName = item && item.id.toLowerCase() !== query && Array.from(candidates.values())
    .some(other => other !== item && other.name.toLowerCase().includes(query));
  if (!item || ambiguousName) return { text: `${text}\nUse a catalog ID to request one reference image.` };
  const caption = `Catalog reference for ${item.name} (${item.id}).`;
  if (!acceptsPng) return { text: `${text}\n${caption} ${item.image}` };
  try {
    const url = new URL(item.image);
    const isTencentIcon = url.origin === 'https://playerhub.df.qq.com' && /^\/playerhub\/60004\/object\/\d+\.png$/.test(url.pathname);
    if (!isTencentIcon && url.href !== 'https://img1.ali213.net/glpic/2026/11/10/584_202611104105283.png') {
      return { text: `${text}\nNo supported reference image URL.` };
    }
    const timeout = AbortSignal.timeout(5000);
    const response = await fetch(url, { redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!response.ok || !response.body) throw new Error('Unavailable image');
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ICON_BYTES) { await reader.cancel(); throw new Error('Oversize reference image'); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) throw new Error('Invalid reference PNG');
    return { text: `${text}\n${caption}`, blobs: [{ bytes, mime: 'image/png', fallbackText: caption }] };
  } catch {
    return { text: `${text}\nReference image unavailable. Use the event image and qualify uncertain guesses.` };
  }
}

export function lootTools(acceptsPng: () => boolean, inspect: (eventId: string) => ToolOutcome): ToolDef[] {
  return lootToolDescriptions.map(tool => ({ ...tool, handler: async (args, ctx) => tool.name === 'delta_lookup_red_item'
    ? lookup(args, acceptsPng(), ctx.signal)
    : inspect(String(args.eventId ?? '')) }));
}
