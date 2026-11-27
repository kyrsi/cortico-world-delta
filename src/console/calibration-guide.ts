import type { Language } from 'cortico/core/language.ts';
import type { WebUi } from 'cortico/web/shared/client-panel.ts';
import { PREPARATION_REFERENCE_REGIONS } from '../calibration-preset.ts';
import { detectionText } from './strings-detection.ts';
import { lootText } from './strings-loot.ts';
import { calibrationText } from './strings-calibration.ts';
import { calibrationGuideText } from './strings-calibration-guide.ts';

/** Layout diagrams share the preparation preset; they contain no game artwork. */
export function calibrationGuide(ui: WebUi, language: Language): HTMLElement {
  const T = calibrationGuideText(language), C = calibrationText(language);
  const D = detectionText(language), L = lootText(language);
  const details = ui.h('details', 'delta-calibration-guide');
  const summary = ui.h('summary', null, T.summary);
  const examples = ui.h('div', 'delta-calibration-examples');
  function example(title: string, hint: string) {
    const figure = ui.h('figure', 'delta-calibration-example');
    const surface = ui.h('div', 'delta-guide-screen');
    surface.setAttribute('role', 'img');
    surface.setAttribute('aria-label', `${title}: ${T.schematic}`);
    const caption = ui.h('figcaption');
    const legend = ui.h('ul', 'delta-quick-legend');
    caption.append(ui.h('h5', 'delta-channel-title', title), legend, ui.h('p', 'delta-note', hint));
    figure.append(surface, caption);
    examples.append(figure);
    return { surface, legend };
  }
  const preparation = example(T.preparation, T.hint);
  const silhouettes = ui.h('div', 'delta-guide-squad');
  silhouettes.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) silhouettes.append(ui.h('span', 'delta-guide-player'));
  preparation.surface.append(silhouettes);
  for (const [key, label] of [['start', C.startTab], ['actions', C.deploymentActions]] as const) {
    const block = ui.h('span', 'delta-guide-anchor', String(preparation.legend.childElementCount + 1));
    block.dataset.anchor = key;
    block.setAttribute('aria-hidden', 'true');
    preparation.surface.append(block);
    const item = ui.h('li');
    item.append(`${block.textContent}. ${label}`);
    preparation.legend.append(item);
  }
  const regions = example(T.regions, T.regionsHint);
  for (const { key, label, area } of [
    { key: 'feed', label: D.feed, area: PREPARATION_REFERENCE_REGIONS.combat.roi },
    { key: 'personal', label: C.personal, area: PREPARATION_REFERENCE_REGIONS.combat.personalFeedbackRoi! },
    { key: 'items', label: L.items, area: PREPARATION_REFERENCE_REGIONS.loot.itemsRoi },
    { key: 'context', label: L.context, area: PREPARATION_REFERENCE_REGIONS.loot.contextRoi },
  ]) {
    const box = ui.h('div', 'delta-quick-region');
    box.dataset.region = key;
    box.dataset.source = 'preset';
    box.setAttribute('aria-hidden', 'true');
    box.style.left = `${area.x * 100}%`;
    box.style.top = `${area.y * 100}%`;
    box.style.width = `${area.width * 100}%`;
    box.style.height = `${area.height * 100}%`;
    const marker = ui.h('span', 'delta-quick-marker', String(regions.legend.childElementCount + 1));
    box.append(marker);
    const item = ui.h('li');
    item.dataset.region = key;
    item.append(marker.cloneNode(true), label);
    regions.surface.append(box);
    regions.legend.append(item);
  }
  details.append(summary, ui.h('p', 'delta-note', T.schematic), examples, ui.h('p', 'delta-note', C.prepare));
  return details;
}
