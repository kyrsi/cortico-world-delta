import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { scanRaster } from './calibration-anchors.ts';
import { calibrationViewports, project } from './calibration-viewport.ts';
import type { DeltaOcrBox as Box, DeltaOcrLayout, DeltaOcrLine, DeltaOcrPort } from './ocr.ts';
import type { ProfileDebugTrace, ProfileFinishReason, ProfileOcrField, ProfileTitleEvidence } from './profile-debug-trace.ts';
import { cardAccounts, cardNameLine, excludesOwnProfile, frameLines, hasNicknameLabel, isProfileTitle, playerNumberFormat, profileIdentity,
  profileTab, selectedProfileTab, validCardName, watermarkFormat } from './profile-identity.ts';
import { profileNameRegion } from './profile-name-region.ts';
import type { DeltaGameAspectRatio, DeltaIdentitySuggestion } from './protocol.ts';
import { compactLower } from './text.ts';

const unreadable = { status: 'nickname-unreadable' } as const;
const unrecognized = { status: 'profile-unrecognized' } as const;
const historyTab = { x: .135, y: .047, width: .066, height: .047 };
type TileField = Exclude<ProfileOcrField, 'overview'>;
type ReadTile = (field: TileField, box: Box, twice: boolean) => Promise<DeltaOcrLayout | undefined>;

function singleLine(layout: DeltaOcrLayout | undefined) {
  return layout && !layout.truncated && layout.lines.length === 1 ? layout.lines[0] : undefined;
}

async function readField(read: ReadTile, field: TileField, box: Box, format: RegExp): Promise<string | undefined> {
  for (const twice of [false, true]) {
    const line = singleLine(await read(field, box, twice));
    const match = line && format.exec(compactLower(line.text));
    if (match) return match[1];
  }
}

async function recognizedTab(read: ReadTile, area: Box): Promise<ProfileTitleEvidence> {
  const box = project(area, profileTab);
  let nearTitle = false;
  for (const twice of [false, true]) {
    const line = singleLine(await read('profile-tab', box, twice));
    if (!line) continue;
    const title = compactLower(line.text);
    if (isProfileTitle(title)) return 'exact';
    if (/^\p{Script=Han}{4}$/u.test(title) && [...title].filter((c, i) => c !== '个人信息'[i]).length === 1) nearTitle = true;
  }
  if (!nearTitle) return 'no-match';
  const history = await readField(read, 'history-tab', project(area, historyTab), /^(历史战绩)$/u);
  return history ? 'history-confirmed' : 'history-unconfirmed';
}

// An independent full-frame line supplies the crop only when both account numbers identify the player.
function lineRegion(ink: Box, frame: CapturedRegion) {
  const pad = Math.ceil(ink.height * .2);
  const x = Math.max(0, Math.floor(ink.x) - pad), y = Math.max(0, Math.floor(ink.y) - pad);
  return { ink, box: { x, y, width: Math.min(frame.width, Math.ceil(ink.x + ink.width) + pad) - x,
    height: Math.min(frame.height, Math.ceil(ink.y + ink.height) + pad) - y } };
}

function nameText(line: DeltaOcrLine): { name: string } | { rejection: 'invalid-text' | 'word-spacing' } {
  const name = line.text.trim();
  if (validCardName(name)) return { name };
  // Windows inserts spaces between CJK tokens, including at a change of script.
  const tokens = name.split(/\s+/u);
  if (tokens.length < 2 || tokens.length !== line.words.length || !tokens.every((token, i) => token === line.words[i]!.text)) {
    return { rejection: 'invalid-text' };
  }
  for (let i = 1; i < line.words.length; i++) {
    const left = line.words[i - 1]!, right = line.words[i]!;
    if (!/\p{Script=Han}$/u.test(left.text) && !/^\p{Script=Han}/u.test(right.text)) return { rejection: 'invalid-text' };
    const gap = right.box.x - left.box.x - left.box.width;
    const overlap = Math.min(left.box.y + left.box.height, right.box.y + right.box.height) - Math.max(left.box.y, right.box.y);
    const height = Math.min(left.box.height, right.box.height);
    if (gap < -.1 * height || gap > .2 * height || overlap < .65 * height) return { rejection: 'word-spacing' };
  }
  const joined = tokens.join('');
  return validCardName(joined) ? { name: joined } : { rejection: 'invalid-text' };
}

async function readName(read: ReadTile, region: { box: Box; ink: Box }, overviewName?: string, trace?: ProfileDebugTrace): Promise<string | undefined> {
  const { box, ink } = region;
  let previous = overviewName;
  let complete = false;
  for (const twice of [false, true]) {
    const scale = twice ? 2 : 1;
    const layout = await read('nickname', box, twice);
    const line = singleLine(layout);
    if (!layout) continue;
    if (!line) {
      trace?.({ stage: 'name-reading', scale, result: 'no-single-line' });
      continue;
    }
    const reading = nameText(line);
    if ('rejection' in reading) {
      trace?.({ stage: 'name-reading', scale, result: reading.rejection });
      continue;
    }
    const { name } = reading;
    if (previous && previous !== name) {
      trace?.({ stage: 'name-reading', scale, result: 'conflict' });
      return;
    }
    const corroborated = name === previous;
    previous = name;
    const toFrame = box.width / layout.width;
    const left = box.x + line.box.x * toFrame, right = left + line.box.width * toFrame;
    const slack = Math.max(2, ink.height * .16);
    const leftErrorPx = left - ink.x, rightErrorPx = right - ink.x - ink.width;
    const coversInk = Math.abs(leftErrorPx) <= slack && Math.abs(rightErrorPx) <= slack;
    trace?.({ stage: 'name-reading', scale, leftErrorPx, rightErrorPx, tolerancePx: slack,
      result: !coversInk ? 'ink-edges-mismatch' : corroborated ? 'corroborated' : 'covers-ink' });
    if (!coversInk) continue;
    complete = true;
    if (corroborated) return name;
  }
  return complete ? previous : undefined;
}

/** All tiles come from the same captured display. The OCR port processes them serially. */
export async function recognizeProfile(frame: CapturedRegion, aspectRatio: DeltaGameAspectRatio,
  ocr: Pick<DeltaOcrPort, 'recognizeLayout'>, deadline = Date.now() + 20_000, trace?: ProfileDebugTrace): Promise<DeltaIdentitySuggestion> {
  let ocrCalls = 0, deadlineSkipped = false;
  const finish = (result: DeltaIdentitySuggestion, reason: ProfileFinishReason) => {
    trace?.({ stage: 'finish', status: result.status, reason, ocrCalls, localOcrStarted: ocrCalls > 1, deadlineSkipped });
    return result;
  };
  const performOcr = async (field: ProfileOcrField, box: Box, scale: 1 | 2, raster: ReturnType<typeof scanRaster>) => {
    ocrCalls++;
    trace?.({ stage: 'ocr-start', field, box, scale, width: raster.width, height: raster.height });
    try {
      const layout = await ocr.recognizeLayout({ ...frame, ...raster });
      trace?.({ stage: 'ocr-result', field, box, scale, lineCount: layout.lines.length, truncated: layout.truncated });
      return layout;
    } catch (error) {
      finish({ status: 'ocr-unavailable' }, 'ocr-error');
      throw error;
    }
  };
  trace?.({ stage: 'recognition-start', deadline, remainingMs: Math.max(0, deadline - Date.now()) });
  const areas = calibrationViewports(frame, aspectRatio);
  const overview = await performOcr('overview', areas[2], 1, scanRaster(frame, areas[2], false, 1));
  if (overview.lines.some(line => excludesOwnProfile(line.text))) return finish(unrecognized, 'excluded-page');
  if (overview.truncated) return finish(unreadable, 'overview-truncated');
  const lines = frameLines(overview, frame);
  const legacy = profileIdentity(overview);
  const labeled = overview.lines.some(line => hasNicknameLabel(line.text));
  trace?.({ stage: 'legacy', status: legacy.status, hasNicknameLabel: labeled });
  if (labeled && legacy.status === 'nickname-unreadable') return finish(legacy, 'legacy-label-unreadable');
  const tiles = new Map<string, DeltaOcrLayout>();
  let card = false, selected = false;
  const read: ReadTile = async (field, box, twice) => {
    const scale = twice ? 2 : 1;
    const key = [box.x, box.y, box.width, box.height, twice].join('/');
    const previous = tiles.get(key);
    if (previous) {
      trace?.({ stage: 'ocr-skip', field, box, scale, reason: 'cached' });
      return previous;
    }
    if (Date.now() >= deadline) {
      deadlineSkipped = true;
      trace?.({ stage: 'ocr-skip', field, box, scale, reason: 'deadline' });
      return;
    }
    const raster = scanRaster(frame, box, twice, 1);
    if (twice && (raster.width !== 2 * box.width || raster.height !== 2 * box.height)) {
      trace?.({ stage: 'ocr-skip', field, box, scale, reason: 'scale-unavailable' });
      return;
    }
    const layout = await performOcr(field, box, scale, raster);
    tiles.set(key, layout);
    return layout;
  };
  const sameViewport = (a: Box, b: Box) => Math.abs(a.x - b.x) <= frame.width * .003 && Math.abs(a.width - b.width) <= frame.width * .003
    && Math.abs(a.y - b.y) <= frame.height * .003 && Math.abs(a.height - b.height) <= frame.height * .003;
  // Slight aspect rounding (e.g. 2560×1437 vs. 16:9) describes the same page. Keep its measured pixel boundaries.
  const [hint, measured, whole] = areas;
  const viewports = [measured];
  if (!sameViewport(hint, measured)) viewports.unshift(hint);
  if (!viewports.some(area => sameViewport(area, whole))) viewports.push(whole);
  for (const area of viewports) {
    const selectedGreenLine = selectedProfileTab(frame, area);
    trace?.({ stage: 'viewport', kind: area === hint ? 'hint' : area === measured ? 'measured' : 'whole', box: area, selectedGreenLine });
    if (!selectedGreenLine) continue;
    selected = true;
    const evidence = await recognizedTab(read, area);
    trace?.({ stage: 'title', evidence });
    if (evidence !== 'exact' && evidence !== 'history-confirmed') continue;
    card = true;
    const full = cardAccounts(lines, area);
    const account = full.account ?? await readField(read, 'watermark', project(area, { x: .011, y: .003, width: .18, height: .022 }), watermarkFormat);
    const player = full.player ?? await readField(read, 'player-number', project(area, { x: .743, y: .902, width: .128, height: .032 }), playerNumberFormat);
    trace?.({ stage: 'accounts', hasAccount: !!account, hasPlayer: !!player, match: account && player ? account === player : null });
    if (account && player && account !== player) return finish(unrecognized, 'account-mismatch');
    const fullName = cardNameLine(lines, area);
    const iconRegion = profileNameRegion(frame, area, trace && (result => trace({ stage: 'name-icons', result })));
    const region = iconRegion ?? (account && player && fullName ? lineRegion(fullName.box, frame) : null);
    if (!region) {
      trace?.({ stage: 'name-region', source: 'missing' });
      continue;
    }
    const { box, ink } = region;
    trace?.({ stage: 'name-region', source: iconRegion ? 'icons' : 'overview', box, ink, paddingPx: {
      left: ink.x - box.x, top: ink.y - box.y, right: box.x + box.width - ink.x - ink.width,
      bottom: box.y + box.height - ink.y - ink.height,
    } });
    const name = await readName(read, region, fullName?.text.trim(), trace);
    if (!name) return finish(unreadable, 'nickname-unreadable');
    if (legacy.status === 'candidate' && legacy.nickname !== name) return finish(unreadable, 'legacy-name-conflict');
    return finish({ status: 'candidate', nickname: name }, 'card-candidate');
  }
  if (!card) {
    if (legacy.status !== 'candidate') return finish(legacy, selected ? 'title-unconfirmed' : 'no-selected-tab');
    // The legacy labelled form has no player card. Its label cannot override an unreadable or inactive card tab.
    const playerCard = viewports.some(area => {
      const { account, player } = cardAccounts(lines, area);
      return (account && player) || profileNameRegion(frame, area);
    });
    return playerCard ? finish(unrecognized, 'legacy-card-veto') : finish(legacy, 'legacy-candidate');
  }
  return finish(unreadable, 'name-region-missing');
}
