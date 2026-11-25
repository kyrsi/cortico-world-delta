import assert from 'node:assert/strict';
import test from 'node:test';
import { recognizeProfile } from '../src/profile-recognition.ts';

const width = 2560, height = 1437;
const account = '1234567890123456789';
const fields = {
  tab: { ink: 188, rect: [214, 92, 84, 22], text: '个人信息' },
  adjacent: { ink: 145, rect: [389, 92, 83, 22], text: '历史战绩' },
  top: { ink: 178, rect: [40, 12, 428, 15], text: `CN UID:${account}_202611221518` },
  bottom: { ink: 160, rect: [1913, 1311, 293, 20], text: `编号:${account}` },
  name: { ink: 239, rect: [1937, 1139, 73, 21], text: '海River' },
  notice: { ink: 137, rect: [490, 410, 135, 21], text: '' },
};

function frame({ selected = true, pencil = true } = {}) {
  const bgra = new Uint8Array(width * height * 4);
  const pixels = new Uint32Array(bgra.buffer);
  pixels.fill(0xff202020);
  function paint(x, y, w, h, color) {
    for (let row = y; row < y + h; row++) pixels.fill(color, row * width + x, row * width + x + w);
  }
  paint(selected ? 169 : 343, 129, 174, 6, 0xff5cc793);
  paint(1910, 1144, 23, 4, 0xffeeeeee);
  paint(1910, 1152, 23, 7, 0xffeeeeee);
  for (const [id, { ink, rect: [x, y, w, h] }] of Object.entries(fields)) {
    const color = (0xff000000 | (ink << 16) | (ink << 8) | ink) >>> 0;
    if (id === 'name') {
      for (let column = x; column < x + w; column += 10) paint(column, y, Math.min(7, x + w - column), h, color);
    } else paint(x, y, w, h, color);
  }
  if (pencil) {
    paint(2024, 1158, 21, 3, 0xff929292);
    for (let dy = 0; dy < 17; dy++) paint(2040 - dy, 1138 + dy, dy === 0 || dy === 16 ? 2 : 4, 1, 0xffdddddd);
  }
  return { width, height, bgra };
}

const defaultFrame = frame();
// Only the OCR text is scripted. Each line is available when its marker is visible in the actual crop.
async function run(readings = {}, raster = defaultFrame, { deadline, truncated = false } = {}) {
  const calls = [], trace = [];
  const sourceColors = new Map(Object.entries(fields).map(([id, field]) => [field.ink, id]));
  const ocr = { async recognizeLayout(image) {
    const bounds = new Map();
    for (let y = 0, at = 0; y < image.height; y++) for (let x = 0; x < image.width; x++, at += 4) {
      const value = image.bgra[at];
      if (value !== image.bgra[at + 1] || value !== image.bgra[at + 2] || !sourceColors.has(value)) continue;
      const id = sourceColors.get(value);
      let b = bounds.get(id);
      if (!b) { b = { x, y, right: x, bottom: y, count: 0 }; bounds.set(id, b); }
      b.x = Math.min(b.x, x); b.y = Math.min(b.y, y); b.right = Math.max(b.right, x); b.bottom = Math.max(b.bottom, y);
      b.count++;
    }
    const overview = calls.length === 0;
    const lines = [], visible = [];
    for (const [id, b] of bounds) {
      if (b.count < (b.right - b.x + 1) * (b.bottom - b.y + 1) * .12 || b.count < 24) continue;
      const magnification = (b.right - b.x + 1) / fields[id].rect[2];
      const pass = overview ? 'whole' : magnification > 1.4 ? 'double' : 'native';
      visible.push({ id, pass });
      const setting = readings[id] ?? fields[id].text;
      const text = typeof setting === 'object' ? setting[pass] ?? '' : setting;
      if (!text) continue;
      // The resampler antialiases the edges of the synthetic name strokes.
      if (!overview && id === 'name') {
        for (let y = 0, at = 0; y < image.height; y++) for (let x = 0; x < image.width; x++, at += 4) {
          if (image.bgra[at] < 160) continue;
          b.x = Math.min(b.x, x); b.y = Math.min(b.y, y); b.right = Math.max(b.right, x); b.bottom = Math.max(b.bottom, y);
        }
      }
      const box = { x: b.x, y: b.y, width: b.right - b.x + 1, height: b.bottom - b.y + 1 };
      if (id === 'name' && text === 'River') { box.x += box.width * .28; box.width *= .72; }
      let words = [{ text, box }];
      if (id === 'name' && text.includes(' ')) {
        const [first, rest] = text.split(' ');
        const firstWidth = box.width * .28;
        const gap = (readings.gapInGlyphHeights ?? -.04) * box.height;
        words = [{ text: first, box: { ...box, width: firstWidth } },
          { text: rest, box: { ...box, x: box.x + firstWidth + gap, width: box.width - firstWidth - gap } }];
      }
      lines.push({ text, box, words });
    }
    calls.push(visible);
    return { width: image.width, height: image.height, lines, truncated: overview && truncated };
  } };
  const result = await recognizeProfile(raster, '16:9', ocr, deadline, event => trace.push(event));
  const namePasses = calls.slice(1).flat().filter(field => field.id === 'name').map(field => field.pass);
  return { result, namePasses, calls, trace };
}

test('reads a selected one-character OCR substitution with an exact adjacent history tab', async () => {
  const { result, namePasses } = await run({ tab: '个人信患' });
  assert.deepEqual(result, { status: 'candidate', nickname: fields.name.text });
  assert.deepEqual(namePasses, ['native']);
});

for (const [example, settings, raster] of [
  ['two incorrect heading characters', { tab: '个入信患' }],
  ['a one-character error on both the active and adjacent tabs', { tab: '个人信患', adjacent: '历史战缰' }],
  ['a one-character error without the adjacent tab', { tab: '个人信患', adjacent: '' }],
  ['an explicitly reported other player', { tab: '个人信患', notice: '举报玩家' }],
  ['matching text on an inactive tab', { tab: '个人信患' }, frame({ selected: false })],
]) {
  test(`declines ${example} before OCR of the nickname crop`, async () => {
    const { result, namePasses } = await run(settings, raster);
    assert.notEqual(result.status, 'candidate');
    assert.deepEqual(namePasses, []);
  });
}

test('uses the original name crop and permits only one double-size retry for unreadable text', async () => {
  const { result, namePasses } = await run({ name: { whole: '', native: '', double: '' } });
  assert.notEqual(result.status, 'candidate');
  assert.deepEqual(namePasses, ['native', 'double']);
});

test('rejects conflicting complete names from the overview and original crop', async () => {
  const { result } = await run({ name: { whole: '海River', native: '泉River', double: '泉River' } });
  assert.notEqual(result.status, 'candidate');
});

test('rejects conflicting complete readings at original and double size', async () => {
  const { result, namePasses, calls } = await run({ name: { native: '海River', double: '泉River' } });
  assert.notEqual(result.status, 'candidate', JSON.stringify({ result, calls }));
  assert.deepEqual(namePasses, ['native', 'double']);
});

test('rejects a surviving suffix when its box excludes the first glyph of the name', async () => {
  const { result } = await run({ name: 'River' });
  assert.notEqual(result.status, 'candidate');
});

test('rejects a different card account even with a pencil after the name', async () => {
  const { result } = await run({ bottom: '编号:1234567890123456788' });
  assert.notEqual(result.status, 'candidate');
});

test('declines an unlabelled name without matching numbers or an edit pencil', async () => {
  const { result } = await run({ bottom: '', top: '' }, frame({ pencil: false }));
  assert.notEqual(result.status, 'candidate');
});

test('joins a Chinese glyph and its touching Latin suffix when the double-size crop reports separate OCR words', async () => {
  const { result, namePasses } = await run({ name: { double: '海 River' } });
  assert.deepEqual(result, { status: 'candidate', nickname: '海River' });
  assert.deepEqual(namePasses, ['native', 'double']);
});

test('declines OCR words separated by a visible gap or two Latin words', async () => {
  assert.notEqual((await run({ name: { double: '海 River' }, gapInGlyphHeights: .65 })).result.status, 'candidate');
  assert.notEqual((await run({ name: { double: 'Sea River' } })).result.status, 'candidate');
});

const inactive = frame({ selected: false });
const noPencil = frame({ pencil: false });
for (const [reason, fieldsRead, raster, options, overviewOnly, evidence] of [
  ['excluded-page', { notice: '举报玩家' }, defaultFrame, {}, true],
  ['overview-truncated', {}, defaultFrame, { truncated: true }, true],
  ['legacy-label-unreadable', { notice: '昵称：匿名玩家' }, defaultFrame, {}, true],
  ['no-selected-tab', {}, inactive, {}, true, { stage: 'viewport', selectedGreenLine: false }],
  ['title-unconfirmed', { tab: '个入信患' }, defaultFrame, {}, false, { stage: 'title', evidence: 'no-match' }],
  ['title-unconfirmed', { tab: '个人信患', adjacent: '' }, defaultFrame, {}, false, { stage: 'title', evidence: 'history-unconfirmed' }],
  ['title-unconfirmed', {}, defaultFrame, { deadline: 0 }, true, { stage: 'ocr-skip', field: 'profile-tab', reason: 'deadline' }],
  ['account-mismatch', { bottom: '编号:1234567890123456788' }, defaultFrame, {}, false, { stage: 'accounts', match: false }],
  ['name-region-missing', { bottom: '', top: '' }, noPencil, {}, false, { stage: 'name-region', source: 'missing' }],
  ['nickname-unreadable', { name: 'River' }, defaultFrame, {}, false, { stage: 'name-reading', result: 'ink-edges-mismatch' }],
  ['nickname-unreadable', { name: { whole: '海River', native: '泉River' } }, defaultFrame, {}, false, { stage: 'name-reading', result: 'conflict' }],
  ['nickname-unreadable', { name: { double: '海 River' }, gapInGlyphHeights: .65 }, defaultFrame, {}, false, { stage: 'name-reading', result: 'word-spacing' }],
  ['nickname-unreadable', { name: '' }, defaultFrame, {}, false, { stage: 'name-reading', result: 'no-single-line' }],
  ['legacy-name-conflict', { notice: '昵称：HiddenDraft' }, defaultFrame, {}, false],
  ['legacy-card-veto', { notice: '昵称：HiddenDraft' }, inactive, {}, true],
  ['legacy-candidate', { notice: '昵称：HiddenDraft', bottom: '', top: '' }, frame({ selected: false, pencil: false }), {}, true],
  ['card-candidate', { tab: '个人信患' }, defaultFrame, {}, false, { stage: 'title', evidence: 'history-confirmed' }],
]) {
  test('diagnoses ' + reason + (evidence ? ' with ' + JSON.stringify(evidence) : ''), async () => {
    const { result, calls, trace } = await run(fieldsRead, raster, options);
    const finish = trace.at(-1);
    assert.deepEqual(finish, { stage: 'finish', status: result.status, reason, ocrCalls: calls.length,
      localOcrStarted: !overviewOnly, deadlineSkipped: options.deadline === 0 });
    assert.equal(calls.length === 1, overviewOnly);
    assert.equal(trace.filter(event => event.stage === 'ocr-start').length, calls.length);
    assert.equal(trace.filter(event => event.stage === 'ocr-result').length, calls.length);
    if (evidence) assert.ok(trace.some(event => Object.entries(evidence).every(([key, value]) => event[key] === value)));
    const serialized = JSON.stringify(trace);
    for (const privateText of [account, 'HiddenDraft', fields.name.text, '举报玩家', '个人信息', '历史战绩', '1234567890123456788']) {
      assert.equal(serialized.includes(privateText), false, 'OCR content should stay out of diagnostics');
    }
  });
}

test('records the failed OCR call without copying its exception into the trace', async () => {
  const trace = [];
  const ocr = { async recognizeLayout() { throw Error('private system path and input text'); } };
  await assert.rejects(recognizeProfile(defaultFrame, '16:9', ocr, undefined, event => trace.push(event)));
  assert.equal(trace.at(-1).reason, 'ocr-error');
  assert.equal(trace.at(-1).ocrCalls, 1);
  assert.equal(trace.at(-1).localOcrStarted, false);
  assert.equal(JSON.stringify(trace).includes('private system path'), false);
});
