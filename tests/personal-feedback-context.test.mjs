import assert from 'node:assert/strict';
import test from 'node:test';
import { attributePersonalFeedback, parsePersonalFeedback, parseDetection, detectionStatus } from '../src/detector.ts';

function layout(...rows) {
  return {
    width: 700, height: 81, truncated: false,
    lines: rows.map(({ text, y = 4, gap = 0 }) => {
      let x = 12;
      const words = text.split(' ').map(token => {
        const box = { x, y, width: token.length * 15, height: 16 };
        x += box.width + gap;
        return { text: token, box };
      });
      return { text, words, box: { x: 12, y, width: x - 12, height: 16 } };
    }),
  };
}

test('settings captions yield no personal action, including the two recorded OCR readings', () => {
  for (const text of ['杀 与 击 倒 i 刂', '杀 与 击 倒 识 别', '击杀与击倒识别',
    '监测击杀与击倒', '回应击倒事件', '击杀、击倒', '击倒识别']) {
    assert.deepEqual(parsePersonalFeedback(layout({ text }), 'Player'), [], text);
  }
});

test('a fuller reading of the settings caption vetoes only its own row across OCR passes', () => {
  const clipped = layout({ text: '击 倒' }, { text: '协助击败 Red', y: 45 });
  const complete = layout({ text: '杀 与 击 倒 识 别' });
  const candidates = parsePersonalFeedback(clipped, 'Player');
  assert.equal(candidates.length, 2);
  for (const passes of [[complete, clipped], [clipped, complete]]) {
    const retained = attributePersonalFeedback(candidates, passes);
    assert.deepEqual(retained.map(m => [m.kind, m.recognition.target, m.attribution.relation]),
      [['kill', 'RED', 'teammate']]);
  }
});

test('HUD actions keep unknown names, headshot modifiers and a separately displayed nickname 识别', () => {
  for (const [text, gap, kind, target] of [
    ['击倒', 0, 'knockdown', ''], ['击 倒 识别', 12, 'knockdown', '识别'],
    ['西中头邵击倒 玩家', 0, 'knockdown', '玩家'], ['击败 配置达人', 0, 'kill', '配置达人'],
  ]) {
    const input = layout({ text, gap });
    const matches = attributePersonalFeedback(parsePersonalFeedback(input, 'Player'), [input]);
    assert.deepEqual(matches.map(m => [m.kind, m.recognition.target]), [[kind, target]]);
  }
});

test('personal ownership does not require a nickname; assists and spectator evidence retain their attribution', () => {
  const input = layout({ text: '击败 Target' }, { text: '协助击败 Other', y: 45 });
  const matches = parsePersonalFeedback(input, '');
  assert.deepEqual(attributePersonalFeedback(matches, [input]).map(m => m.attribution.relation), ['self', 'teammate']);
  assert.deepEqual(attributePersonalFeedback(matches, [input], 'other').map(m => m.attribution.relation), ['teammate', 'teammate']);
  const feed = parseDetection(['Other killed Target'], '', 'en-US');
  assert.equal(feed.attribution.relation, 'unknown');
  assert.equal(parseDetection(['Other killed Target'], 'Player', 'en-US'), null);
  assert.equal(detectionStatus({enabled:true, nickname:'', language:'zh-CN', calibration:null}).reason, 'calibration-required');
});
