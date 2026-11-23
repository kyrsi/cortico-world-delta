import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import { calibrationViewports, project } from './calibration-viewport.ts';
import type { DeltaOcrBox as Box, DeltaOcrLayout, DeltaOcrLine } from './ocr.ts';
import { DEFAULT_GAME_ASPECT_RATIO, type DeltaGameAspectRatio, type DeltaIdentitySuggestion } from './protocol.ts';
import { uiGreen } from './pixels.ts';
import { compactLower } from './text.ts';

const profileTitles = new Set(['个人信息', '个人资料', '个人档案', '我的资料', '我的档案', 'myprofile', 'playerprofile', 'playerinfo', 'personalinformation']);
const nicknameLabel = /^(?:(?:玩\s*家\s*|游\s*戏\s*|角\s*色\s*)?昵\s*称|(?:player\s+name|nick\s*name))(?=\s|[:：]|$)[\s:：]*(.*)$/iu;
const uidField = /^(?:cn\s*)?(?:u\s*i\s*d|玩家\s*ID|数字\s*ID|角色\s*ID)(?:\s*[:：#=_-].*|\s*\d[\d\s_-]*)?$/iu;
const placeholders = new Set(['匿名玩家', 'anonymousplayer']);

export const profileTab = { x: .066, y: .047, width: .069, height: .047 };
export const watermarkFormat = /^(?:cn)?uid[:#]?(\d{8,24})(?:_\d+)?$/u;
export const playerNumberFormat = /^(?:编号|uid|playerid)[:#]?(\d{8,24})$/u;
export const isProfileTitle = (text: string) => profileTitles.has(compactLower(text));
export const excludesOwnProfile = (text: string) => /^(?:出发(?:\(?[123]\/3\)?)?|准备就绪|邀请入队|他人资料|举报玩家|reportplayer)$/u.test(compactLower(text));
export const hasNicknameLabel = (text: string) => nicknameLabel.test(text.trim());

export function validIdentityNickname(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 64 || /[\p{Cc}\p{Cf}]/u.test(value)) return false;
  const name = value.trim();
  return !placeholders.has(compactLower(name)) && !uidField.test(name.normalize('NFKC'));
}

function adjacentValue(label: DeltaOcrLine, other: DeltaOcrLine): boolean {
  const a = label.box, b = other.box;
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const gap = b.x - (a.x + a.width);
  return other !== label && overlap >= 0.65 * Math.min(a.height, b.height)
    && gap >= 0 && gap <= 4 * a.height;
}

function contains(area: Box, box: Box): boolean {
  return box.x >= area.x && box.y >= area.y && box.x + box.width <= area.x + area.width && box.y + box.height <= area.y + area.height;
}

export function selectedProfileTab(frame: CapturedRegion, area: Box): boolean {
  const stripe = project(area, { x: .072, y: .087, width: .056, height: .01 });
  for (let y = stripe.y; y < stripe.y + stripe.height; y++) {
    let green = 0;
    for (let i = 0; i < 16; i++) {
      const x = stripe.x + Math.floor((i + .5) * stripe.width / 16);
      const p = (y * frame.width + x) * 4;
      const b = frame.bgra[p]!, g = frame.bgra[p + 1]!, r = frame.bgra[p + 2]!;
      if (uiGreen(b, g, r)) green++;
    }
    if (green >= 15) return true;
  }
  return false;
}

function accountNumber(lines: readonly DeltaOcrLine[], area: Box, format: RegExp): string | undefined {
  const matches = lines.filter(line => contains(area, line.box)).map(line => format.exec(compactLower(line.text))?.[1]).filter(Boolean);
  return matches.length === 1 ? matches[0] : undefined;
}

export function frameLines(layout: DeltaOcrLayout, frame: CapturedRegion): DeltaOcrLine[] {
  const sx = frame.width / layout.width, sy = frame.height / layout.height;
  return layout.lines.map(line => ({ ...line, box: {
    x: line.box.x * sx, y: line.box.y * sy, width: line.box.width * sx, height: line.box.height * sy,
  } }));
}

export function cardAccounts(lines: readonly DeltaOcrLine[], area: Box) {
  const watermark = project(area, { x: 0, y: 0, width: .35, height: .04 });
  const footer = project(area, { x: .737, y: .899, width: .22, height: .047 });
  return { account: accountNumber(lines, watermark, watermarkFormat), player: accountNumber(lines, footer, playerNumberFormat) };
}

export function validCardName(name: string) {
  return validIdentityNickname(name) && /^[\p{L}\p{M}\p{N}_-]+$/u.test(name) && /\p{L}/u.test(name) && !isProfileTitle(name)
    && !/^(?:编号|uid|playerid|lv|等级)[_-]?\d*$/iu.test(name);
}

export function cardNameLine(lines: readonly DeltaOcrLine[], area: Box): DeltaOcrLine | undefined {
  const row = project(area, { x: .755, y: .788, width: .193, height: .023 });
  const overlapping = lines.filter(({ box }) => box.y < row.y + row.height && box.y + box.height > row.y
    && box.x < row.x + row.width && box.x + box.width > row.x);
  if (overlapping.length !== 1) return;
  const line = overlapping[0]!;
  // The card's icon precedes the name. A line starting farther right may contain only its suffix.
  if (contains(row, line.box) && line.box.x <= area.x + .761 * area.width && validCardName(line.text.trim())) return line;
}

function cardIdentity(layout: DeltaOcrLayout, frame: CapturedRegion, aspectRatio: DeltaGameAspectRatio, labeledName?: string): DeltaIdentitySuggestion {
  const lines = frameLines(layout, frame);
  const candidates = new Set<string>(labeledName ? [labeledName] : []);
  let selected = false, inactiveCard = false, activeCard = false;
  for (const area of calibrationViewports(frame, aspectRatio)) {
    const tab = project(area, profileTab);
    if (!lines.some(line => contains(tab, line.box) && profileTitles.has(compactLower(line.text)))) continue;
    const { account, player } = cardAccounts(lines, area);
    if (account && player && account !== player) return { status: 'profile-unrecognized' };
    if (!selectedProfileTab(frame, area)) {
      if (account && player) inactiveCard = true;
      continue;
    }
    selected = true;
    if (!account || !player) continue;
    activeCard = true;

    const name = cardNameLine(lines, area);
    if (name) candidates.add(name.text.trim());
  }
  if (inactiveCard && !activeCard) return { status: 'profile-unrecognized' };
  const [nickname] = candidates;
  if (nickname && candidates.size === 1) return { status: 'candidate', nickname };
  return { status: selected ? 'nickname-unreadable' : 'profile-unrecognized' };
}

export function profileIdentity(layout: DeltaOcrLayout, frame?: CapturedRegion, aspectRatio: DeltaGameAspectRatio = DEFAULT_GAME_ASPECT_RATIO): DeltaIdentitySuggestion {
  const lines = layout.lines;
  if (!lines.some(line => isProfileTitle(line.text)) || lines.some(line => excludesOwnProfile(line.text))) {
    return { status: 'profile-unrecognized' };
  }
  if (layout.truncated) return { status: 'nickname-unreadable' };
  const candidates = new Set<string>();
  for (const line of lines) {
    const match = nicknameLabel.exec(line.text.trim());
    if (!match) continue;
    const neighbors = match[1] ? [match[1]] : lines.filter(other => adjacentValue(line, other)).map(other => other.text);
    if (neighbors.length !== 1) return { status: 'nickname-unreadable' };
    const name = neighbors[0]!.trim();
    if (!validIdentityNickname(name) || !/[\p{L}]/u.test(name) || /[:：]|\s(?:UID|玩家\s*ID)(?=[\s\d#=_-]|$)/iu.test(name)
      || profileTitles.has(compactLower(name))) return { status: 'nickname-unreadable' };
    candidates.add(name);
  }
  const [nickname] = candidates;
  if (candidates.size <= 1 && frame) return cardIdentity(layout, frame, aspectRatio, nickname);
  return nickname && candidates.size === 1 ? { status: 'candidate', nickname } : { status: 'nickname-unreadable' };
}
