import type { WebUi } from 'cortico/web/shared/client-panel.ts';

let nextId = 0;

export function describeControl(control: HTMLElement, description: HTMLElement): void {
  let id: string;
  do { id = `delta-help-${++nextId}`; } while (control.ownerDocument.getElementById(id));
  description.id = id;
  control.setAttribute('aria-describedby', id);
}

export function calibrationHint(ui: WebUi, button: HTMLButtonElement, parts: { before: string; focus: string; after: string }, textClass: string) {
  const hint = ui.h('p', 'delta-calibration-hint');
  const mark = ui.h('span', 'delta-hint-mark', '※');
  mark.setAttribute('aria-hidden', 'true');
  const text = ui.h('span', textClass);
  text.append(parts.before, ui.h('strong', null, parts.focus), parts.after);
  hint.append(mark, text);
  describeControl(button, hint);
  return hint;
}
