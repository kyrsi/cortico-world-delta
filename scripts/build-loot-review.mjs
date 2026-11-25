import { readFile, writeFile } from 'node:fs/promises';

const dataURL = new URL('../knowledge/red-items.json', import.meta.url);
const pageURL = new URL('../documents/loot-catalog-review.html', import.meta.url);
const catalog = JSON.parse(await readFile(dataURL, 'utf8'));
const page = await readFile(pageURL, 'utf8');
// The standalone page also opens from file://, where fetching a sibling JSON file is restricted.
const marker = /(<script id="catalog" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!marker.test(page)) throw new Error('Missing catalog element in loot-catalog-review.html');
const safeJSON = JSON.stringify(catalog).replaceAll('<', '\\u003c');
const next = page.replace(marker, (_, start, end) => start + safeJSON + end);
if (page !== next) await writeFile(pageURL, next);
console.log('Loot review page:', catalog.items.length, 'items');
