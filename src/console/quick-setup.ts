import type { DeltaGameLanguage, DeltaState } from '../protocol.ts';
import { DEFAULT_GAME_ASPECT_RATIO, sameDeltaDisplay } from '../protocol.ts';
import type { CuaDisplay } from 'cortico-world-desktop-pet';
import type { ObserverViewContext } from './observer.ts';
import { captureText } from './strings-capture.ts';
import { dashboardText } from './strings-dashboard.ts';
import { detectionText } from './strings-detection.ts';
import { startupText } from './strings-startup.ts';
import { calibrationText } from './strings-calibration.ts';
import { setupText } from './strings-setup.ts';
import { observerText } from './strings.ts';

export type SetupField = 'channels' | 'language' | 'nickname' | 'combatRegions' | 'lootRegions' | 'display';
type Section = 'detection' | 'loot' | 'regions';
type SaveRequest = { combat: boolean; loot: boolean; language: Exclude<DeltaGameLanguage, ''> };

/** Checks the persisted settings for the channels the player has enabled. */
export function setupIssues(state: DeltaState, display?: CuaDisplay): SetupField[] {
  const displayId = display?.id || state.calibrationDisplayId || state.configuredDisplayId;
  const combat = state.detection.config, loot = state.loot.config;
  const issues: SetupField[] = [];
  if (!combat.enabled && !loot.enabled) issues.push('channels');
  if ((combat.enabled && !combat.language) || (loot.enabled && !loot.language)
    || (combat.enabled && loot.enabled && combat.language !== loot.language)) issues.push('language');
  if (combat.enabled && !combat.nickname.trim()) issues.push('nickname');
  const invalid = (key: 'detection' | 'loot') => {
    const channel = state[key], saved = channel.config.calibration;
    return !saved || state.startupCheck[key].status === 'invalid' || (!!displayId && saved.display.id !== displayId)
      || (!!display && !sameDeltaDisplay(saved.display, display))
      || (saved.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO) !== state.gameAspectRatio
      || channel.reason === 'roi-too-large' || channel.reason === 'feedback-language-unsupported';
  };
  if (combat.enabled && invalid('detection')) issues.push('combatRegions');
  if (loot.enabled && invalid('loot')) issues.push('lootRegions');
  return issues;
}

export function quickSetup(ctx: ObserverViewContext, calibration: HTMLElement, handlers: {
  play(): void; close(): void; save(request: SaveRequest): Promise<void>; jump(field: SetupField): void; manual(section: Section): void;
}) {
  const { ui, language } = ctx;
  const T = setupText(language), D = detectionText(language), V = dashboardText(language), C = startupText(language);
  const element = ui.h('section', 'delta-setup'), heading = ui.h('h4', 'delta-section-title', T.title);
  element.dataset.quickSetup = '';
  element.hidden = true;
  heading.tabIndex = -1;
  const close = ui.button(calibrationText(language).cancel, { size: 'sm', onClick: handlers.close });
  close.dataset.setupAction = 'close';
  const header = ui.h('header', 'delta-setup-header');
  header.append(heading, close);
  const checklist = ui.h('ul', 'delta-setup-checklist');
  const missingHeading = ui.h('h5', 'delta-channel-title', V.incomplete);
  const labels = { channels: T.channels, language: D.reasons['language-required'], nickname: D.reasons['nickname-required'],
    combatRegions: C.calibrateCombat, lootRegions: C.calibrateLoot, display: captureText(language).choose };
  const rows = (Object.keys(labels) as SetupField[]).map(field => {
    const row = ui.h('li'), button = ui.button(T.fix, { size: 'sm', onClick: () => focusField(field) });
    button.dataset.setupJump = field;
    button.setAttribute('aria-label', T.fix + ' · ' + labels[field]);
    row.append(ui.h('span', null, labels[field]), button);
    checklist.append(row);
    return { field, row, button };
  });
  const combat = ui.checkbox(V.combat, { onChange: changed }), loot = ui.checkbox(V.loot, { onChange: changed });
  combat.input.dataset.setupField = 'combat';
  loot.input.dataset.setupField = 'loot';
  const gameLanguage = ui.select({ options: [{ value: '', label: D.chooseLanguage },
    { value: 'zh-CN', label: D.chinese }, { value: 'en-US', label: D.english }], onChange: changed });
  gameLanguage.dataset.setupField = 'language';
  gameLanguage.setAttribute('aria-label', D.language);
  const save = ui.button(D.save, { size: 'sm', onClick: () => void persist() });
  save.dataset.setupAction = 'save';
  const basics = ui.h('div', 'delta-setup-basics');
  basics.append(combat.el, loot.el, ui.field(D.language, gameLanguage), save);
  const err = ui.h('p', 'delta-note bad'); err.setAttribute('role', 'alert');
  const ready = ui.h('p', 'delta-setup-ready', T.ready); ready.setAttribute('role', 'status');
  const blocked = ui.h('p', 'delta-note'); blocked.setAttribute('role', 'status');
  const play = ui.button(observerText(language).start, { variant: 'primary', onClick: handlers.play });
  play.dataset.setupAction = 'play';
  const details = ui.h('details', 'delta-setup-details');
  details.append(ui.h('summary', null, T.details));
  for (const [section, label] of [['detection', V.combat], ['loot', V.loot], ['regions', V.calibration]] as const) {
    const button = ui.button(label, { size: 'sm', onClick: () => handlers.manual(section) });
    button.dataset.setupManual = section;
    details.append(button);
  }
  element.append(header, missingHeading, checklist, basics, err, calibration, details, ready, blocked, play);
  const identity = calibration.querySelector<HTMLElement>('.delta-identity');
  let dirty = false, locked = false, saving = false, canPlay = false;
  let lastState: DeltaState | null = null, needsGrant = false, selectedDisplay: CuaDisplay | undefined;
  function changed() { dirty = true; err.textContent = ''; refreshChecklist(); sync(); }
  function refreshChecklist() {
    if (!lastState) return;
    const { detection, loot: items } = lastState;
    const lang = gameLanguage.value as DeltaGameLanguage;
    const draft = dirty ? { ...lastState,
      detection: { ...detection, config: { ...detection.config, enabled: combat.checked, language: lang } },
      loot: { ...items, config: { ...items.config, enabled: loot.checked, language: lang } },
    } : lastState;
    const issues = setupIssues(draft, selectedDisplay);
    if (needsGrant && issues.some(field => field.endsWith('Regions'))) issues.unshift('display');
    const reason = lastState.startBlockedReason;
    const blockedReason = lastState.captureMode === 'standalone' && reason === 'view-permission' ? null : reason;
    blocked.textContent = blockedReason ? observerText(language).reasons[blockedReason] : '';
    canPlay = !issues.length && !dirty && !blockedReason && lastState.captureMode !== 'unsupported';
    ready.hidden = !!issues.length || dirty;
    missingHeading.hidden = checklist.hidden = issues.length === 0;
    calibration.hidden = !draft.detection.config.enabled && !draft.loot.config.enabled;
    if (identity) identity.hidden = !draft.detection.config.enabled;
    for (const { field, row, button } of rows) { row.hidden = !issues.includes(field); button.disabled = locked; }
  }
  function sync() {
    combat.input.disabled = loot.input.disabled = gameLanguage.disabled = locked || saving;
    save.disabled = locked || saving || !dirty || !(combat.checked || loot.checked) || !gameLanguage.value;
    play.disabled = locked || saving || dirty || !canPlay;
    close.disabled = locked || saving;
  }
  async function persist() {
    if (save.disabled) return;
    saving = true; sync();
    try {
      await handlers.save({ combat: combat.checked, loot: loot.checked, language: gameLanguage.value as SaveRequest['language'] });
      dirty = false;
    } catch (error) { err.textContent = error instanceof Error ? error.message : D.failed; }
    finally { saving = false; refreshChecklist(); sync(); }
  }
  function focusField(field: SetupField) {
    if (field === 'channels') combat.input.focus();
    else if (field === 'language') gameLanguage.focus();
    else handlers.jump(field);
  }
  return { element, heading, focusField, pending: () => dirty || saving, reset() { dirty = false; err.textContent = ''; details.open = false; },
    update(state: DeltaState | null, busy: boolean, needsCalibrationGrant: boolean, display?: CuaDisplay) {
      locked = busy || !state;
      lastState = state; needsGrant = needsCalibrationGrant; selectedDisplay = display;
      if (!state) { sync(); return; }
      const detection = state.detection.config, items = state.loot.config;
      play.hidden = !!state.actions.pause && !state.actions.start;
      if (!dirty) {
        combat.setChecked(detection.enabled); loot.setChecked(items.enabled);
        const shared = detection.enabled ? detection.language : items.enabled ? items.language : detection.language || items.language;
        gameLanguage.value = detection.language !== items.language && detection.enabled && items.enabled
          ? '' : shared;
      }
      refreshChecklist(); sync();
    } };
}
