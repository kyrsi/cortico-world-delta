import type { Language } from 'cortico/core/language.ts';
import type { WebUi } from 'cortico/web/shared/client-panel.ts';
import preparationImage from './assets/preparation-example.png';
import { PREPARATION_REFERENCE_REGIONS } from '../calibration-preset.ts';
import { detectionText } from './strings-detection.ts';
import { lootText } from './strings-loot.ts';
import { calibrationText } from './strings-calibration.ts';

/** The real game screenshot is bundled locally so the help works offline. */
export function calibrationGuide(ui: WebUi, language: Language): HTMLElement {
  const zh = language.startsWith('zh');
  const T = zh ? {
    summary: '查看校准示例：打开这样的出发准备页',
    alt: '三角洲行动端游出发准备页实图：左上角“开始游戏”，右下角“行前备战”，底栏可见 Esc 和 Tab 按键提示。',
    hint: '停留在图中的准备大厅，让“开始游戏”和右下角“配装 / 出发”（单人为“行前备战”）保持可见，不要进入匹配。',
    scope: '点击“一键校准”后，3 秒内切回游戏。识别成功会自动保存，截图和观察框会保留供查看。',
    clean: '① 打开这样的端游准备页',
    credit: '图片来源：17173 · 三角洲行动端游',
    regions: '观察区域预览',
    regionsHint: '彩色框为参考位置；实际校准后会显示本次截图和对应区域。',
  } : {
    summary: 'Calibration example: open this deployment screen',
    alt: 'Actual Delta Force PC deployment screen: Start at the top left, preparation at the bottom right, Esc and Tab prompts along the bottom.',
    hint: 'Stay in this lobby with the Start tab and Gear / Deploy controls visible (the preparation button in solo mode). Do not start matchmaking.',
    scope: 'Click One-click calibration and return to the game within 3 seconds. Successful calibration saves automatically and keeps the screenshot and areas visible.',
    clean: '1. Open this PC deployment screen',
    credit: 'Image source: 17173 · Delta Force PC',
    regions: 'Observation areas',
    regionsHint: 'The boxes show reference positions. Calibration displays your captured screen and its resulting areas.',
  };
  const details = ui.h('details', 'delta-calibration-guide');
  const summary = ui.h('summary', null, T.summary);
  const figure = ui.h('figure', 'delta-calibration-example');
  const image = ui.h('img', 'delta-calibration-example-image');
  image.src = preparationImage;
  image.alt = T.alt;
  image.width = 1080;
  image.height = 595;
  image.loading = 'lazy';
  image.decoding = 'async';
  const cleanFigure = ui.h('figure', 'delta-calibration-example');
  const cleanCaption = ui.h('figcaption');
  cleanCaption.append(ui.h('h5', 'delta-channel-title', T.clean), ui.h('p', 'delta-note', T.hint));
  cleanFigure.append(image.cloneNode(true), cleanCaption);
  const caption = ui.h('figcaption');
  const surface = ui.h('div', 'delta-quick-preview-surface');
  surface.append(image);
  const D = detectionText(language), L = lootText(language), C = calibrationText(language);
  const regions = [
    { key: 'feed', label: D.feed, area: PREPARATION_REFERENCE_REGIONS.combat.roi },
    { key: 'personal', label: C.personal, area: PREPARATION_REFERENCE_REGIONS.combat.personalFeedbackRoi! },
    { key: 'items', label: L.items, area: PREPARATION_REFERENCE_REGIONS.loot.itemsRoi },
    { key: 'context', label: L.context, area: PREPARATION_REFERENCE_REGIONS.loot.contextRoi },
  ];
  const legend = ui.h('ul', 'delta-quick-legend');
  for (const { key, label, area } of regions) {
    const box = ui.h('div', 'delta-quick-region');
    box.dataset.region = key;
    box.dataset.source = 'preset';
    box.setAttribute('aria-hidden', 'true');
    box.style.left = `${area.x * 100}%`;
    box.style.top = `${area.y * 100}%`;
    box.style.width = `${area.width * 100}%`;
    box.style.height = `${area.height * 100}%`;
    const marker = ui.h('span', 'delta-quick-marker', String(legend.childElementCount + 1));
    box.append(marker);
    const item = ui.h('li');
    item.dataset.region = key;
    item.append(marker.cloneNode(true), label);
    surface.append(box);
    legend.append(item);
  }
  const credit = ui.h('a', 'delta-calibration-credit', T.credit);
  credit.href = 'https://news.17173.com/content/06242024/102401986.shtml';
  credit.target = '_blank';
  credit.rel = 'noopener noreferrer';
  caption.append(ui.h('h5', 'delta-channel-title', T.regions), legend, ui.h('p', 'delta-note', T.regionsHint),
    ui.h('p', 'delta-note', T.scope));
  figure.append(surface, caption);
  const examples = ui.h('div', 'delta-calibration-examples');
  examples.append(cleanFigure, figure);
  details.append(summary, examples, credit);
  return details;
}
