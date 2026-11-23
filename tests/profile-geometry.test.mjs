import assert from 'node:assert/strict';
import test from 'node:test';
import { profileIdentity } from '../src/profile-identity.ts';

// Pixel landmarks measured on the supplied 2560 × 1437 frame. Text and account numbers are synthetic.
const referenceWidth = 2560, referenceHeight = 1437;
const account = '1234567890123456789';
const landmarks = {
  watermark: [`CN UID:${account}_202611221518`, 40, 12, 428, 15],
  tab: ['个人信息', 214, 92, 84, 22],
  name: ['海River', 1937, 1139, 73, 21],
  title: ['守信不渝', 2003, 1174, 82, 20],
  number: [`编号:${account}`, 1913, 1311, 293, 20],
  security: ['安全环境良好', 2308, 1104, 124, 24],
};

function sample({ width = 1280, height = 720, left = 0, top = 0, activeTab = 0, entries = {} } = {}) {
  const frame = { width: width + 2 * left, height: height + 2 * top };
  frame.bgra = new Uint8Array(frame.width * frame.height * 4);
  for (let y = top; y < top + height; y++) {
    frame.bgra.fill(32, (y * frame.width + left) * 4, (y * frame.width + left + width) * 4);
  }
  const screenX = x => left + x * width / referenceWidth;
  const screenY = y => top + y * height / referenceHeight;
  if (activeTab !== null) {
    const offset = 174 * activeTab;
    for (let y = Math.round(screenY(129)); y < Math.round(screenY(135)); y++) {
      for (let x = Math.round(screenX(169 + offset)); x < Math.round(screenX(343 + offset)); x++) {
        frame.bgra.set([147, 199, 92, 255], (y * frame.width + x) * 4);
      }
    }
  }

  // The worker receives OCR boxes in a downscaled full-screen raster.
  const scale = Math.min(1, 960 / Math.max(frame.width, frame.height));
  const layout = { width: Math.floor(frame.width * scale), height: Math.floor(frame.height * scale), truncated: false, lines: [] };
  for (const entry of Object.values({ ...landmarks, ...entries })) {
    if (!entry) continue;
    const [text, x, y, w, h] = entry;
    const box = { x: screenX(x) * layout.width / frame.width, y: screenY(y) * layout.height / frame.height,
      width: w * width / referenceWidth * layout.width / frame.width, height: h * height / referenceHeight * layout.height / frame.height };
    layout.lines.push({ text, box, words: [{ text, box }] });
  }
  return { frame, layout };
}

function suggest(options, hint = '16:9') {
  const { layout, frame } = sample(options);
  return profileIdentity(layout, frame, hint);
}

for (const [hint, w, h] of [
  ['16:9', 1280, 720], ['16:10', 1280, 800], ['4:3', 1024, 768], ['5:4', 1280, 1024],
  ['5:3', 1200, 720], ['3:2', 1080, 720], ['21:9', 1680, 720], ['32:9', 2560, 720],
]) {
  test(`reads the card's name line in a generated ${hint} viewport`, () => {
    assert.deepEqual(suggest({ width: w, height: h }, hint), { status: 'candidate', nickname: landmarks.name[0] });
  });
}

for (const [label, geometry] of [
  ['top and bottom', { width: 1280, height: 720, top: 120 }],
  ['left and right', { width: 1024, height: 768, left: 218 }],
]) {
  test(`uses the visible game viewport with ${label} black bars and a different ratio hint`, () => {
    assert.deepEqual(suggest(geometry, '21:9'), { status: 'candidate', nickname: landmarks.name[0] });
  });
}

for (const [label, options] of [
  ['another selected tab', { activeTab: 1 }],
  ['a nickname label on a different selected tab', { activeTab: 1,
    entries: { label: ['昵称: WrongTab', 340, 225, 210, 20] } }],
  ['no selected tab', { activeTab: null }],
  ['a similar-looking tab heading', { entries: { tab: ['个人信患', ...landmarks.tab.slice(1)] } }],
  ['a hidden nickname with the title and the numeric ID still visible', { entries: { name: null } }],
  ['the surviving suffix of a covered nickname', { entries: { name: ['River', 1959, 1139, 49, 21] } }],
  ['an edit icon merged into the name', { entries: { name: ['海River ／', 1937, 1139, 109, 21] } }],
  ['a nickname displaced into the title ribbon', { entries: { name: ['海River', 1937, 1174, 73, 21] } }],
  ['a second nickname fragment on the same row', { entries: { extra: ['Blue', 2015, 1139, 41, 21] } }],
  ['a masked or anonymous name', { entries: { name: ['匿名玩家', ...landmarks.name.slice(1)] } }],
  ['another account differing by one digit', { entries: { number: ['编号:1234567890123456788', ...landmarks.number.slice(1)] } }],
  ['a nickname label on a different account', { entries: {
    number: ['编号:1234567890123456788', ...landmarks.number.slice(1)], label: ['昵称: WrongAccount', 340, 225, 210, 20],
  } }],
  ['an absent card number', { entries: { number: null } }],
  ['an absent account watermark', { entries: { watermark: null } }],
  ['a damaged watermark digit', { entries: { watermark: ['CN UID:123456789O123456789_202611221518', ...landmarks.watermark.slice(1)] } }],
]) {
  test(`declines a suggestion for ${label}`, () => {
    assert.notEqual(suggest(options).status, 'candidate');
  });
}

test('declines a truncated layout even when all expected marks are present', () => {
  const { layout, frame } = sample();
  assert.notEqual(profileIdentity({ ...layout, truncated: true }, frame, '16:9').status, 'candidate');
});
