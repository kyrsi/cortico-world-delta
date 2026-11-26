import assert from 'node:assert/strict';
import test from 'node:test';
import { measureSafeBox } from '../src/calibration-anchors-grid.ts';
import { detectLootItems, parseLootContext } from '../src/loot-detector.ts';

function raster(width, height) {
  return { width, height, bgra: new Uint8Array(width * height * 4).fill(24) };
}
function fill(frame, x, y, width, height, color) {
  for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) {
    frame.bgra.set([...color, 255], (row * frame.width + col) * 4);
  }
}

for (const [columns, rows] of [[1, 2], [2, 1], [2, 2], [2, 3], [3, 2], [3, 3]]) {
  test(`safe box ${columns}x${rows}: measure outer boundary, parse capacity, detect a red item in every slot`, () => {
    const cell = 50, width = columns * cell + 1, height = rows * cell + 1;
    const frame = raster(600, 400), heading = { x: 221, y: 39, width: 28, height: 10 };
    fill(frame, 213, 34, 310, 21, [65, 65, 65]);
    fill(frame, 221, 39, 28, 10, [180, 180, 180]);
    fill(frame, 213, 59, 79, 80, [65, 65, 65]);
    fill(frame, 298, 59, width, height, [65, 65, 65]);
    const measured = measureSafeBox(frame, heading);
    assert.ok(measured);
    assert.ok(Math.abs(measured.items.x - 298) <= 2);
    assert.ok(Math.abs(measured.items.width - width) <= 2);
    assert.ok(Math.abs(measured.items.height - height) <= 2);
    const capacity = columns * rows;
    assert.equal(parseLootContext({ truncated: false, lines: [{text: `安全箱: ${capacity}/${capacity}`}] }), 'inventory');
    for (let item = 0; item < capacity; item++) {
      const grid = raster(width + 8, height + 8);
      fill(grid, 4 + (item % columns) * cell, 4 + Math.floor(item / columns) * cell, cell, cell, [20, 25, 180]);
      for (let x = 4; x <= width + 3; x += cell) fill(grid, x, 4, 1, height, [100, 100, 100]);
      for (let y = 4; y <= height + 3; y += cell) fill(grid, 4, y, width, 1, [100, 100, 100]);
      const found = detectLootItems(grid, 'balanced');
      assert.equal(found.length, 1, `slot ${item}`);
      assert.ok(Math.abs(found[0].box.x - (5 + item % columns * cell)) <= 1);
      assert.ok(Math.abs(found[0].box.y - (5 + Math.floor(item / columns) * cell)) <= 1);
    }
  });
}
