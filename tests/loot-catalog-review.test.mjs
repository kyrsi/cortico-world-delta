import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const page = new URL('../documents/loot-catalog-review.html', import.meta.url);
const dataFile = new URL('../knowledge/red-items.json', import.meta.url);

test('the shipped review page and lookup catalog have the same names and reference pictures', async () => {
  const [html, data] = await Promise.all([readFile(page, 'utf8'), readFile(dataFile, 'utf8')]);
  const dom = new JSDOM(html);
  try {
    const embedded = JSON.parse(dom.window.document.querySelector('#catalog').textContent);
    assert.deepEqual(embedded.items, JSON.parse(data).items);
    assert.ok(embedded.items.length > 0);
    assert.equal(new Set(embedded.items.map(item => item.id)).size, embedded.items.length);
  } finally { dom.window.close(); }
});

test('search, review and export retain each picture and include entries awaiting review', async t => {
  const html = await readFile(page, 'utf8');
  const items = ['红盒', '红球', '红花'].map((name, index) => ({
    id: String(index + 1), name, category: '藏品', image: 'https://example.test/' + index + '.png',
  }));
  items[0].recognitionNote = '占四格';
  items[0].lookalikeIds = ['2'];
  items[1].recognitionNote = '活动限定，占两格';
  items[1].lookalikeIds = ['1'];
  const fixture = html.replace(/(<script id="catalog" type="application\/json">)[\s\S]*?(<\/script>)/,
    (_markup, open, close) => open + JSON.stringify({ items }) + close);
  const preview = new JSDOM(fixture, { url: 'https://review.test/', runScripts: 'dangerously' });
  t.after(() => preview.window.close());
  const { document, Event } = preview.window;
  const select = selector => document.querySelector(selector);
  const setFilter = (selector, value, event) => {
    select(selector).value = value;
    select(selector).dispatchEvent(new Event(event, { bubbles: true }));
  };
  const visibleIds = () => [...document.querySelectorAll('#items [data-id]')].map(row => row.dataset.id);
  setFilter('#search', '红球', 'input');
  assert.deepEqual(visibleIds(), ['1','2']);
  assert.ok(select('[data-id="1"]').textContent.includes('易混物品　红球'));
  setFilter('#search', '活动限定', 'input');
  assert.deepEqual(visibleIds(), ['2']);
  assert.equal(select('#items img').src, items[1].image);
  assert.ok(select('[data-id="2"]').textContent.includes(items[1].recognitionNote));
  select('[data-action=edit]').click();
  select('input[name=name]').value = '红色球体';
  select('[data-action=save]').click();
  setFilter('#search', '红色球体', 'input');
  assert.deepEqual(visibleIds(), ['1','2']);
  assert.ok(select('[data-id="1"]').textContent.includes('易混物品　红色球体'));
  setFilter('#search', '', 'input');
  select('[data-id="1"] [data-action=confirm]').click();
  setFilter('#status-filter', 'pending', 'change');
  assert.deepEqual([...document.querySelectorAll('#items [data-id]')].map(row => row.dataset.id), ['3']);

  let saved;
  preview.window.Blob = Blob;
  preview.window.URL.createObjectURL = blob => { saved = blob; return 'blob:https://review.test/result'; };
  preview.window.HTMLAnchorElement.prototype.click = function () { assert.equal(this.download, 'red-items.json'); };
  select('#export').click();
  const exported = JSON.parse(await saved.text());
  assert.deepEqual(exported.items.map(item => [item.name, item.image, Boolean(item.reviewed)]), [
    ['红盒', items[0].image, true], ['红色球体', items[1].image, true], ['红花', items[2].image, false],
  ]);
  assert.equal(exported.items[1].recognitionNote, items[1].recognitionNote);
  assert.deepEqual(exported.items[1].lookalikeIds, items[1].lookalikeIds);
});
