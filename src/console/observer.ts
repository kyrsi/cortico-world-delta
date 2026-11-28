/** Observer panel controls, calibration and event evidence share the panel lifecycle. */
import type { CuaDisplay, CuaFrame } from 'cortico-world-desktop-pet';
import type { Language } from 'cortico/core/language.ts';
import type { WebUi } from 'cortico/web/shared/client-panel.ts';
import type { DeltaEvent, DeltaGameLanguage, DeltaKind, DeltaLootSensitivity, DeltaPanelMethods, DeltaRoi, DeltaSpeechConfig, DeltaState } from '../protocol.ts';
import { DEFAULT_GAME_ASPECT_RATIO, sameDeltaDisplay } from '../protocol.ts';
import { observerText } from './strings.ts';
import { detectionText } from './strings-detection.ts';
import { lootText } from './strings-loot.ts';
import { startupText } from './strings-startup.ts';
import { companionText } from './strings-companion.ts';
import { dashboardText } from './strings-dashboard.ts';
import { captureText } from './strings-capture.ts';
import { captureSourcePicker } from './capture-source.ts';
import { quickCalibrationView } from './quick-calibration.ts';
import { quickSetup, setupIssues, type SetupField } from './quick-setup.ts';
import { setupText } from './strings-setup.ts';
import { identityCalibration } from './identity-calibration.ts';
import { screenshotMenu } from './screenshot-menu.ts';
import { deltaText } from '../i18n/index.ts';
import { combatSelectionTooLarge, lootSelectionTooLarge } from '../budget.ts';
import { DELTA_KNOWLEDGE_MAX_BYTES } from '../limits.ts';
import './style.css';

export type ObserverAvailability = { kind: 'active' } | { kind: 'inactive' | 'missing' | 'absent'; reason?: string };
export interface ObserverViewContext {
  readonly ui: WebUi;
  readonly signal: AbortSignal;
  readonly language: Language;
  interval(fn: () => void, ms: number): void;
  invoke<M extends keyof DeltaPanelMethods>(method: M, args: DeltaPanelMethods[M]['args'], signal?: AbortSignal): Promise<DeltaPanelMethods[M]['result']>;
  invokeBinary(eventId: string, part: 'full' | 'crop', signal: AbortSignal): Promise<Blob>;
  invokePreviewBinary(frameId: string, signal: AbortSignal): Promise<Blob>;
  availability(): Promise<ObserverAvailability>;
}

const INTERVAL_MS = 2000;
const KINDS: readonly DeltaKind[] = ['kill', 'knockdown', 'loot'];
type Row = (label: string, control: HTMLElement) => HTMLElement;
type ImageKind = 'full' | 'crop';
type Action = 'start' | 'pause' | 'stop';
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
function decimalShift(value: number, places: number): number {
  const [mantissa, exponent = '0'] = String(value).split('e');
  return Number(`${mantissa}e${Number(exponent) + places}`);
}

export function observerView(ctx: ObserverViewContext, row?: Row): HTMLElement {
  const { ui, signal } = ctx;
  const S = observerText(ctx.language);
  const D = detectionText(ctx.language);
  const L = lootText(ctx.language);
  const C = startupText(ctx.language);
  const P = companionText(ctx.language);
  const V = dashboardText(ctx.language);
  const Q = setupText(ctx.language);
  const captureLabels = captureText(ctx.language);
  const errors = deltaText(ctx.language).errors;
  const makeRow: Row = row ?? ((label, control) => {
    const element = ui.h('div', 'delta-row');
    const body = ui.h('div', 'delta-control');
    body.append(control);
    element.append(ui.h('div', 'delta-label', label), body);
    return element;
  });
  let state: DeltaState | null = null;
  let availability: 'loading' | 'active' | 'inactive' | 'unavailable' = 'loading';
  let polling = false, busy = false, generation = 0, stateRead = 0, appliedRead = 0;
  let pendingGrant = false;
  let choosingObservationScreen = false, preparingScreen = false;
  let configDirty = false, lootConfigDirty = false, speechConfigDirty = false;
  let calibrationFrame: CuaFrame | null = null, calibrationRoi: DeltaRoi | null = null;
  let personalFeedbackRoi: DeltaRoi | null = null;
  let itemsRoi: DeltaRoi | null = null, contextRoi: DeltaRoi | null = null;
  let calibrationUrl: string | null = null, calibrationController: AbortController | null = null;
  let calibrationVersion = 0, calibrationBusy = false;
  let drag: { id: number; x: number; y: number } | null = null;
  function invoke<M extends keyof DeltaPanelMethods>(method: M, ...args: DeltaPanelMethods[M]['args']): Promise<DeltaPanelMethods[M]['result']> {
    return ctx.invoke(method, args, signal);
  }

  const sheet = ui.sheet({ title: '' });
  sheet.el.classList.add('delta-settings');
  sheet.el.setAttribute('role', 'group');
  sheet.el.setAttribute('aria-label', S.title);
  sheet.el.tabIndex = -1;
  const screenshots = screenshotMenu(sheet.el, ui, ctx.language, signal, (request) => invoke('revealScreenshot', request));
  const overview = ui.h('section', 'delta-overview');
  overview.dataset.observerSection = 'overview';
  overview.setAttribute('aria-label', S.status);
  const status = ui.h('p', 'delta-status', S.loading);
  status.setAttribute('role', 'status');
  status.dataset.observerOverall = 'loading';
  const reason = ui.h('p', 'delta-note');
  const captures = ui.h('p', 'delta-note');
  const statusJump = ui.button(Q.fix, { size: 'sm', onClick: jumpToStatusFix });
  statusJump.dataset.statusJump = '';
  statusJump.replaceChildren(ui.h('span', 'delta-jump-arrow'));
  statusJump.hidden = true;
  const statusTitle = ui.h('div', 'delta-status-line');
  statusTitle.append(status, statusJump);
  const statusBox = ui.h('div');
  statusBox.append(statusTitle, reason);
  const source = ui.h('p', 'delta-source', '—');
  const sourceBox = ui.h('div', 'delta-source-box');
  const startupGeometry = ui.h('p', 'delta-note');
  const sourceHeading = ui.h('h4', 'delta-source-label', S.source);
  const picker = captureSourcePicker(ctx, sourceLabel, (id, trigger, calibration) => {
    if (calibration) void authorizeCalibration(id);
    else if (state && (setupIssues(state, picker.displayInfo()).length || (!setup.element.hidden && setup.pending()))) {
      openSetup();
      if (!setup.pending()) picker.focus();
    } else void perform('start', { id, trigger });
  }, updateControls, () => { choosingObservationScreen = false; updateControls(); play.focus(); });
  sourceBox.append(sourceHeading, source, startupGeometry, picker.element);
  const refresh = ui.button('↻', { size: 'sm', onClick: () => void refreshState() });
  refresh.setAttribute('aria-label', S.refresh);
  refresh.title = S.refresh;
  refresh.classList.add('delta-refresh-action');
  const play = ui.button(S.start, { variant: 'primary', onClick: playback });
  play.dataset.observerPlay = '';
  const playLabel = ui.h('span', 'delta-control-label', S.start);
  play.replaceChildren(playLabel);
  const playCaption = ui.h('span', 'delta-play-caption', S.start);
  playCaption.setAttribute('aria-hidden', 'true');
  const playControl = ui.h('div', 'delta-play-control');
  playControl.append(play, playCaption);
  const stop = ui.button(S.stop, { size: 'sm', onClick: () => void perform('stop') });
  stop.setAttribute('aria-label', S.stop);
  const configureSetup = ui.button(Q.title, { size: 'sm', onClick: () => openSetup() });
  configureSetup.dataset.openSetup = '';
  const controls = ui.rowbar();
  controls.classList.add('delta-observation-actions');
  controls.append(configureSetup, stop, refresh);
  const identity = identityCalibration(ctx, async (id) => {
    const expected = ++generation;
    const value = await invoke('identitySave', id);
    if (!signal.aborted && expected === generation) {
      appliedRead = ++stateRead;
      nickname.value = value.detection.config.nickname;
      render(value);
    }
    return value.detection.config.nickname;
  }, updateControls, refreshState);
  const quickCalibration = quickCalibrationView({
    ui, signal, language: ctx.language, panel: sheet.el, identity: identity.element, screenshots,
    suggest: async (previewSignal) => {
      generation++;
      const result = await ctx.invoke('calibrationSuggest', [], previewSignal);
      const value = await ctx.invoke('state', [], previewSignal);
      if (!previewSignal.aborted) render(value);
      return result;
    },
    image: (frameId, previewSignal) => ctx.invokePreviewBinary(frameId, previewSignal),
    dismiss: async (attemptId) => { await invoke('calibrationDismiss', attemptId); },
    setAspectRatio: async (ratio) => {
      generation++;
      const value = await invoke('calibrationAspectRatioConfigure', ratio);
      if (!signal.aborted) render(value);
    },
    openManual: () => visitManual('regions'),
    onChange: updateControls,
  });
  const playbackBar = ui.h('header', 'delta-playback-bar');
  playbackBar.dataset.observerBar = '';
  playbackBar.setAttribute('aria-label', S.status);
  playbackBar.append(statusBox, playControl);
  const setup = quickSetup(ctx, quickCalibration.element, {
    close: () => void closeSetup(), jump: jumpToQuickField, manual: visitManual,
    save: async (request) => {
      if (busy) return;
      const expected = ++generation;
      busy = true; updateControls();
      try {
        const value = await invoke('quickSetupConfigure', request);
        if (!signal.aborted && expected === generation) { configDirty = lootConfigDirty = false; render(value); }
      } finally { busy = false; if (!signal.aborted) updateControls(); }
    },
  });
  overview.append(controls, sourceBox, setup.element);
  const startupStatus = ui.h('p', 'delta-status', C.pending);
  startupStatus.setAttribute('role', 'status');
  const readiness = ui.h('section', 'delta-readiness');
  readiness.dataset.observerSection = 'readiness';
  readiness.setAttribute('aria-label', V.readiness);
  readiness.hidden = true;
  const startupChecks = (['detection', 'loot'] as const).map((key) => {
    const combat = key === 'detection';
    const value = ui.h('p', 'delta-channel-status', '—');
    const detail = ui.h('p', 'delta-note');
    const missingLabels = {
      nickname: D.nickname, language: combat ? D.language : L.language, regions: combat ? C.combat : C.loot,
    };
    const missing = (['nickname', 'language', 'regions'] as const).map((field) => {
      const item = ui.h('span', null, missingLabels[field]);
      item.dataset.observerMissing = field;
      return { field, item };
    });
    const configureLabel = combat ? V.configureCombat : V.configureLoot;
    const configure = ui.button(configureLabel, { size: 'sm', onClick: () => {
      const first = configure.dataset.firstMissing;
      openSetup(first === 'regions' ? combat ? 'combatRegions' : 'lootRegions' : first === 'nickname' || first === 'language' ? first : undefined);
    } });
    configure.dataset.observerTarget = key;
    const actions = ui.rowbar();
    actions.classList.add('delta-startup-actions');
    actions.append(configure);
    const element = ui.h('div', 'delta-startup-item');
    element.dataset.startupCalibration = key;
    element.append(ui.h('h5', 'delta-channel-title', combat ? V.combat : V.loot), value, detail, actions);
    return { key, value, detail, missing, configure, element };
  });
  const startupItems = ui.h('div', 'delta-startup-checks');
  startupItems.append(...startupChecks.map(({ element }) => element));
  readiness.append(ui.h('h4', 'delta-section-title', V.readiness), startupItems);
  const knowledgeFields = (['source', 'version', 'bytes'] as const).map((key) => {
    const value = ui.h('span', null, '—');
    value.dataset.knowledgeField = key;
    return { key, value };
  });
  const knowledgeFile = ui.h('input');
  knowledgeFile.type = 'file';
  knowledgeFile.accept = '.md';
  knowledgeFile.hidden = true;
  knowledgeFile.dataset.knowledgeFile = '';
  knowledgeFile.setAttribute('aria-label', P.import);
  knowledgeFile.addEventListener('change', () => void importKnowledge(), { signal });
  const knowledgeButtons = (['import', 'view', 'reload', 'restore'] as const).map((action) => {
    const button = ui.button(P[action], { size: 'sm', onClick: () => {
      if (action === 'import') knowledgeFile.click();
      else void performKnowledge(action);
    } });
    button.dataset.knowledgeAction = action;
    button.setAttribute('aria-label', P[action]);
    if (action === 'view') button.setAttribute('aria-expanded', 'false');
    return { action, button };
  });
  const knowledgeActions = ui.rowbar();
  knowledgeActions.append(...knowledgeButtons.map(({ button }) => button));
  const knowledgeError = ui.h('p', 'delta-note bad');
  knowledgeError.setAttribute('role', 'status');
  const knowledgeMessage = ui.msgline();
  knowledgeMessage.setAttribute('role', 'status');
  const knowledgeContent = ui.h('pre', 'delta-knowledge-content');
  knowledgeContent.dataset.knowledgeContent = '';
  knowledgeContent.tabIndex = 0;
  knowledgeContent.setAttribute('aria-label', P.content);
  knowledgeContent.hidden = true;
  const knowledgeBox = ui.h('div');
  const knowledgeFormat = ui.h('p', 'delta-note', P.formatHint);
  const knowledgeMarkers = ui.h('p', 'delta-note');
  knowledgeMarkers.append(ui.h('code', null, 'general · kill · knockdown · loot · self · teammate · unknown'));
  knowledgeBox.append(ui.kv(knowledgeFields.map(({ key, value }) => ({ k: P[key], v: value }))),
    knowledgeActions, knowledgeFile, ui.h('p', 'delta-note', P.importHint), knowledgeFormat, knowledgeMarkers, knowledgeError, knowledgeContent, knowledgeMessage);
  const markSpeechConfigDirty = () => { speechConfigDirty = true; updateControls(); };
  const speechEnabled = ui.checkbox(P.enabled, { onChange: markSpeechConfigDirty });
  speechEnabled.input.dataset.speechField = 'enabled';
  speechEnabled.input.setAttribute('aria-label', P.enabled);
  const speechProbability = ui.input({ type: 'number', onInput: markSpeechConfigDirty });
  speechProbability.min = '0'; speechProbability.max = '100'; speechProbability.step = 'any'; speechProbability.required = true;
  speechProbability.dataset.speechField = 'probability';
  speechProbability.setAttribute('aria-label', P.probability);
  const speechCooldown = ui.input({ type: 'number', onInput: markSpeechConfigDirty });
  speechCooldown.min = '0'; speechCooldown.max = '600'; speechCooldown.step = '0.001'; speechCooldown.required = true;
  speechCooldown.dataset.speechField = 'cooldown';
  speechCooldown.setAttribute('aria-label', P.cooldown);
  const speechStyle = ui.select({ options: (['natural', 'playful', 'sassy'] as const).map((value) => ({ value, label: P.styles[value] })), onChange: markSpeechConfigDirty });
  speechStyle.dataset.speechField = 'style';
  speechStyle.setAttribute('aria-label', P.style);
  const speechKinds = KINDS.map((kind) => {
    const label = kind === 'loot' ? L.candidate : S.kinds[kind];
    const checkbox = ui.checkbox(label, { onChange: markSpeechConfigDirty });
    checkbox.input.dataset.speechKind = kind;
    checkbox.input.setAttribute('aria-label', label);
    return { kind, checkbox };
  });
  const speechRelations = (['self', 'teammate', 'unknown'] as const).map((relation) => {
    const checkbox = ui.checkbox(P.relationLabels[relation], { onChange: markSpeechConfigDirty });
    checkbox.input.dataset.speechRelation = relation;
    checkbox.input.setAttribute('aria-label', P.relationLabels[relation]);
    return { relation, checkbox };
  });
  const speechKindsBox = ui.rowbar();
  speechKindsBox.append(...speechKinds.map(({ checkbox }) => checkbox.el));
  const speechRelationsBox = ui.rowbar();
  speechRelationsBox.append(...speechRelations.map(({ checkbox }) => checkbox.el));
  const speechFields = ui.h('div', 'delta-detection-fields');
  speechFields.append(ui.field(P.probability, speechProbability), ui.field(P.cooldown, speechCooldown), ui.field(P.style, speechStyle));
  const saveSpeech = ui.button(P.save, { size: 'sm', onClick: () => void configureSpeech() });
  saveSpeech.dataset.speechAction = 'save';
  saveSpeech.setAttribute('aria-label', P.save);
  const speechActions = ui.rowbar();
  speechActions.append(speechEnabled.el, saveSpeech);
  const speechMessage = ui.msgline();
  speechMessage.setAttribute('role', 'status');
  const speechActivity = ui.h('p', 'delta-note');
  const speechConfig = ui.h('div');
  speechConfig.append(speechFields, ui.field(P.eventKinds, speechKindsBox), ui.field(P.relations, speechRelationsBox),
    speechActions, ui.h('p', 'delta-note', P.speechHint), speechActivity, speechMessage);
  const markConfigDirty = () => { configDirty = true; updateControls(); };
  const nickname = ui.input({ onInput: markConfigDirty });
  nickname.maxLength = 64;
  nickname.setAttribute('aria-label', D.nickname);
  const language = ui.select({ options: [{ value: '', label: D.chooseLanguage }, { value: 'zh-CN', label: D.chinese }, { value: 'en-US', label: D.english }], onChange: markConfigDirty });
  language.setAttribute('aria-label', D.language);
  const detectionEnabled = ui.checkbox(D.enabled, { onChange: markConfigDirty });
  detectionEnabled.input.setAttribute('aria-label', D.enabled);
  const saveDetection = ui.button(D.save, { size: 'sm', onClick: () => void configureDetection() });
  saveDetection.setAttribute('aria-label', D.save);
  const detectionFields = ui.h('div', 'delta-detection-fields');
  detectionFields.append(ui.field(D.nickname, nickname), ui.field(D.language, language));
  const detectionActions = ui.rowbar();
  detectionActions.append(detectionEnabled.el, saveDetection);
  const detectionConfig = ui.h('div');
  detectionConfig.append(ui.h('p', 'delta-field-hint', V.combatHint), detectionFields, detectionActions);
  const detectionStatus = ui.h('p', 'delta-status', S.loading);
  detectionStatus.setAttribute('role', 'status');
  const detectionReason = ui.h('p', 'delta-note');
  const detectionBox = ui.h('div');
  detectionBox.append(detectionStatus, detectionReason);
  const diagnostic = ui.h('details', 'delta-diagnostics');
  diagnostic.append(ui.h('summary', null, D.diagnostics));
  const diagnosticValues = (['engine', 'languages', 'scans', 'candidates', 'confirmed'] as const).map((key) => ({ key, value: ui.h('span') }));
  diagnostic.append(ui.kv(diagnosticValues.map(({ key, value }) => ({ k: D[key], v: value }))));
  const detectionError = ui.h('p', 'delta-note');
  diagnostic.append(detectionError);
  detectionBox.append(diagnostic);
  const markLootConfigDirty = () => { lootConfigDirty = true; updateControls(); };
  const lootEnabled = ui.checkbox(L.enabled, { onChange: markLootConfigDirty });
  lootEnabled.input.setAttribute('aria-label', L.enabled);
  const lootLanguage = ui.select({ options: [{ value: '', label: D.chooseLanguage }, { value: 'zh-CN', label: D.chinese }, { value: 'en-US', label: D.english }], onChange: markLootConfigDirty });
  lootLanguage.setAttribute('aria-label', L.language);
  const lootSensitivity = ui.select({ options: (['conservative', 'balanced', 'sensitive'] as const).map((value) => ({ value, label: L[value] })), onChange: markLootConfigDirty });
  lootSensitivity.setAttribute('aria-label', L.sensitivity);
  const saveLoot = ui.button(L.save, { size: 'sm', onClick: () => void configureLoot() });
  saveLoot.setAttribute('aria-label', L.save);
  const lootFields = ui.h('div', 'delta-detection-fields');
  lootFields.append(ui.field(L.language, lootLanguage), ui.field(L.sensitivity, lootSensitivity));
  const lootActions = ui.rowbar();
  lootActions.append(lootEnabled.el, saveLoot);
  const lootConfig = ui.h('div');
  lootConfig.append(ui.h('p', 'delta-field-hint', V.lootHint), lootFields, lootActions);
  const lootStatus = ui.h('p', 'delta-status', S.loading);
  lootStatus.setAttribute('role', 'status');
  const lootReason = ui.h('p', 'delta-note');
  const lootScene = ui.h('p', 'delta-note');
  const lootDiagnostic = ui.h('details', 'delta-diagnostics');
  lootDiagnostic.append(ui.h('summary', null, D.diagnostics));
  const lootDiagnosticValues = (['engine', 'languages', 'scans', 'candidates'] as const).map((key) => ({ key, value: ui.h('span') }));
  lootDiagnostic.append(ui.kv(lootDiagnosticValues.map(({ key, value }) => ({ k: D[key], v: value }))));
  const lootError = ui.h('p', 'delta-note');
  lootDiagnostic.append(lootError);
  const lootBox = ui.h('div');
  lootBox.append(lootStatus, lootReason, lootScene, lootDiagnostic);
  const calibrationStatus = ui.h('p', 'delta-note', D.uncalibrated);
  const lootCalibrationStatus = ui.h('p', 'delta-note', L.uncalibrated);
  const previewCalibration = ui.button(D.preview, { size: 'sm', onClick: () => void showCalibration() });
  previewCalibration.setAttribute('aria-label', D.preview);
  const saveCalibration = ui.button(D.saveRegion, { size: 'sm', onClick: () => void calibrateDetection() });
  saveCalibration.setAttribute('aria-label', D.saveRegion);
  const saveLootCalibration = ui.button(L.saveRegion, { size: 'sm', onClick: () => void calibrateLoot() });
  saveLootCalibration.setAttribute('aria-label', L.saveRegion);
  const clearPersonal = ui.button(D.clearPersonal, { size: 'sm', onClick: () => void calibrateDetection(true) });
  clearPersonal.setAttribute('aria-label', D.clearPersonal);
  const calibrationActions = ui.rowbar();
  calibrationActions.append(previewCalibration, saveCalibration, clearPersonal, saveLootCalibration);
  const regionPurpose = ui.select({ options: [{ value: 'feed', label: D.feed }, { value: 'personal', label: D.personal }, { value: 'items', label: L.items }, { value: 'context', label: L.context }], onChange: () => {
    drag = null;
    syncRegionFields();
    drawRegion();
  } });
  regionPurpose.setAttribute('aria-label', D.purpose);
  const regionHint = ui.h('p', 'delta-note', D.hint);
  const calibrationImage = ui.h('img', 'delta-calibration-image');
  calibrationImage.alt = D.previewAlt;
  calibrationImage.draggable = false;
  const selection = ui.h('div', 'delta-selection');
  selection.hidden = true;
  selection.append(ui.h('span', 'delta-selection-label', D.feed));
  const personalSelection = ui.h('div', 'delta-selection');
  personalSelection.hidden = true;
  personalSelection.append(ui.h('span', 'delta-selection-label', D.personal));
  const itemsSelection = ui.h('div', 'delta-selection');
  itemsSelection.hidden = true;
  itemsSelection.append(ui.h('span', 'delta-selection-label', L.items));
  const contextSelection = ui.h('div', 'delta-selection');
  contextSelection.hidden = true;
  contextSelection.append(ui.h('span', 'delta-selection-label', L.context));
  const calibrationSurface = ui.h('div', 'delta-calibration-surface');
  calibrationSurface.append(calibrationImage, selection, personalSelection, itemsSelection, contextSelection);
  screenshots.bind(calibrationImage, () => {
    const frameId = calibrationImage.dataset.frameId;
    return frameId && calibrationFrame?.frameId === frameId && !drag ? { kind: 'preview', frameId } : null;
  }, calibrationSurface);
  const calibrationCaption = ui.h('figcaption', 'delta-note');
  const regionError = ui.h('p', 'delta-note bad');
  regionError.setAttribute('role', 'status');
  const calibrationFigure = ui.h('figure', 'delta-calibration');
  calibrationFigure.hidden = true;
  const regionFields = (['x', 'y', 'width', 'height'] as const).map((key) => {
    const label = D[key === 'x' ? 'left' : key === 'y' ? 'top' : key];
    const input = ui.input({ type: 'number', onInput: () => readRegion() });
    input.min = '0'; input.max = '100'; input.step = '0.1';
    input.setAttribute('aria-label', label);
    return { key, input, field: ui.field(label, input) };
  });
  const regionAdjust = ui.h('details', 'delta-region-adjust');
  const regionGrid = ui.h('div', 'delta-region-fields');
  regionGrid.append(...regionFields.map(({ field }) => field));
  regionAdjust.append(ui.h('summary', null, D.adjust), regionGrid);
  calibrationFigure.append(ui.field(D.purpose, regionPurpose), regionHint, calibrationSurface, calibrationCaption, regionError, regionAdjust);
  const calibrationBox = ui.h('div');
  calibrationBox.append(startupStatus, calibrationStatus, lootCalibrationStatus, ui.h('p', 'delta-note', C.hint), calibrationActions, calibrationFigure);
  const kind = ui.select({ options: KINDS.map((value) => ({ value, label: value === 'loot' ? L.candidate : S.kinds[value] })) });
  kind.setAttribute('aria-label', S.kind);
  const simulate = ui.button(S.simulate, { size: 'sm', onClick: () => void simulateEvent() });
  simulate.setAttribute('aria-label', S.simulate);
  const simulation = ui.h('div', 'delta-test');
  simulation.append(kind, simulate);
  const simulationBox = ui.h('div');
  simulationBox.append(simulation, ui.h('p', 'delta-note', S.testHint));
  const eventTitle = ui.h('p', 'delta-event-title', S.noEvents);
  const eventTime = ui.h('p', 'delta-note');
  const eventStatus = ui.h('p', 'delta-event-status');
  const eventReason = ui.h('p', 'delta-note');
  const eventSummary = ui.h('div');
  eventSummary.setAttribute('role', 'status');
  eventSummary.append(eventTitle, eventTime, eventStatus, eventReason);
  const eventBox = ui.h('section', 'delta-event');
  eventBox.dataset.observerSection = 'event';
  eventBox.setAttribute('aria-label', S.latestEvent);
  eventBox.hidden = true;
  eventBox.append(ui.h('h4', 'delta-section-title', S.latestEvent), eventSummary);
  const imageSlots = (['full', 'crop'] as const).map((part) => {
    const button = ui.button(part === 'full' ? S.previewFull : S.previewCrop, { size: 'sm', onClick: () => void showImage(part) });
    button.setAttribute('aria-label', part === 'full' ? S.previewFull : S.previewCrop);
    const image = ui.h('img', 'delta-evidence-image');
    image.alt = part === 'full' ? S.fullAlt : S.cropAlt;
    screenshots.bind(image, () => {
      const { eventId, frameId } = image.dataset;
      const event = latest();
      return frameId && eventId && event?.id === eventId && event.frame.frameId === frameId
        && event.status !== 'dropped' && Date.parse(event.validUntil) > Date.now()
        ? { kind: 'event', eventId, frameId, part } : null;
    });
    const caption = ui.h('figcaption', 'delta-note');
    const figure = ui.h('figure');
    figure.hidden = true;
    figure.append(image, caption);
    return { part, button, image, caption, figure, url: null as string | null, controller: null as AbortController | null, version: 0, busy: false };
  });
  const imageActions = ui.rowbar();
  imageActions.classList.add('delta-evidence-actions');
  imageActions.append(...imageSlots.map(({ button }) => button));
  const imageGrid = ui.h('div', 'delta-evidence-grid');
  imageGrid.append(...imageSlots.map(({ figure }) => figure));
  const deliveryHint = ui.h('p', 'delta-note', S.deliveryHint);
  const eventMessage = statusLine();
  eventBox.append(imageActions, imageGrid, deliveryHint, eventMessage);
  const dashboard = ui.h('div', 'delta-dashboard');
  dashboard.append(readiness, eventBox);

  const detectionMessage = statusLine(), lootMessage = statusLine(), calibrationMessage = statusLine(), simulationMessage = statusLine();
  const detectionSettings = disclosure('detection', D.title, detectionConfig, detectionMessage, makeRow(D.status, detectionBox));
  const lootSettings = disclosure('loot', L.title, lootConfig, lootMessage, makeRow(L.status, lootBox));
  const calibrationSettings = disclosure('calibration', V.calibration, calibrationBox, calibrationMessage);
  const settings = ui.h('section', 'delta-configuration');
  const setupBack = ui.button(Q.back, { size: 'sm', onClick: () => openSetup() });
  setupBack.dataset.setupBack = '';
  setupBack.hidden = true;
  settings.dataset.observerSection = 'settings';
  settings.setAttribute('aria-label', V.settings);
  settings.append(ui.h('h4', 'delta-section-title', V.settings), setupBack, detectionSettings.element, lootSettings.element, calibrationSettings.element,
    disclosure('knowledge', P.knowledge, knowledgeBox).element, disclosure('speech', P.speech, speechConfig).element,
    disclosure('diagnostics', S.kind, captures, simulationBox, simulationMessage).element);
  sheet.body.append(playbackBar, overview, dashboard, settings);
  const SizeObserver = sheet.el.ownerDocument.defaultView?.ResizeObserver;
  if (SizeObserver) {
    const barHeight = new SizeObserver(() => {
      sheet.el.style.setProperty('--delta-bar-height', playbackBar.getBoundingClientRect().height + 'px');
    });
    barHeight.observe(playbackBar);
    signal.addEventListener('abort', () => barHeight.disconnect(), { once: true });
  }

  function statusLine(): HTMLElement {
    const element = ui.msgline();
    element.setAttribute('role', 'status');
    return element;
  }
  function disclosure(key: string, label: string, ...content: HTMLElement[]) {
    const element = ui.h('details', 'delta-config');
    element.dataset.observerSection = key;
    const summary = ui.h('summary', null, label);
    const body = ui.h('div', 'delta-config-body');
    body.append(...content);
    element.append(summary, body);
    return { element, summary };
  }
  function openSettings({ element, summary }: ReturnType<typeof disclosure>, field?: HTMLElement): void {
    element.open = true;
    (field ?? summary).focus();
  }
  function openSetup(field?: SetupField) {
    if (!state) return;
    if (!setupBack.hidden) {
      for (const group of [detectionSettings, lootSettings, calibrationSettings]) group.element.open = false;
    }
    choosingObservationScreen = false;
    setup.element.hidden = false;
    setupBack.hidden = true;
    updateControls();
    if (field) setup.focusField(field);
    else setup.heading.focus();
  }
  function visitManual(section: 'detection' | 'loot' | 'regions') {
    setupBack.hidden = false;
    if (section === 'regions') openSettings(calibrationSettings, previewCalibration.disabled ? undefined : previewCalibration);
    else if (section === 'loot') openSettings(lootSettings, lootLanguage);
    else openSettings(detectionSettings, state?.detection.config.nickname ? language : nickname);
  }
  function jumpToQuickField(field: SetupField) {
    if (field === 'display') picker.focus();
    else if (field === 'nickname') identity.focus();
    else if (!quickCalibration.focusStart()) {
      if (!picker.element.hidden) picker.focus();
      else { reason.tabIndex = -1; reason.focus(); }
    }
  }
  async function closeSetup() {
    if (busy || setup.element.hidden) return;
    if (state?.calibrationDisplayId || preparingScreen) {
      busy = true; updateControls();
      try { render(await invoke('cancelCalibration')); }
      catch (error) { ui.toast(errorText(error), 'bad'); return; }
      finally { busy = false; if (!signal.aborted) updateControls(); }
    }
    setup.element.hidden = true; setupBack.hidden = true;
    setup.reset(); identity.resetDraft();
    choosingObservationScreen = false;
    updateControls();
    configureSetup.focus();
  }
  async function authorizeCalibration(id: string) {
    if (busy || preparingScreen || setup.element.hidden || !state) return;
    const expected = ++generation;
    busy = preparingScreen = true; updateControls();
    try {
      const value = await invoke('prepareCalibration', id);
      if (!signal.aborted && expected === generation) render(value);
    } catch (error) { if (!signal.aborted) ui.toast(errorText(error), 'bad'); }
    finally { busy = preparingScreen = false; if (!signal.aborted) updateControls(); }
  }
  function playback() {
    if (!state || play.disabled) return;
    if (state.actions.pause && !state.actions.start) { void perform('pause'); return; }
    if (setupIssues(state, picker.displayInfo()).length || (!setup.element.hidden && setup.pending())) { openSetup(); return; }
    if (state.captureMode === 'standalone') {
      choosingObservationScreen = true;
      updateControls();
      picker.focus();
    } else if (state.actions.start) void perform('start');
  }
  function jumpToStatusFix() {
    if (!state || statusJump.disabled) return;
    const [first] = setupIssues(state, picker.displayInfo());
    if (first) { openSetup(first); return; }
    choosingObservationScreen = true;
    updateControls();
    picker.focus();
  }

  function setText(element: HTMLElement, text: string): void {
    if (element.textContent !== text) element.textContent = text;
  }
  function sourceLabel(display: CuaDisplay): string {
    return [display.systemNumber === null ? '' : S.outputNumber(display.systemNumber), display.name,
      `${display.bounds.width} × ${display.bounds.height}`, display.primary ? S.primary : ''].filter(Boolean).join(' · ');
  }
  function aspectLabel(width: number, height: number): string {
    let divisor = width, remainder = height;
    while (remainder) [divisor, remainder] = [remainder, divisor % remainder];
    return `${width / divisor}:${height / divisor}`;
  }
  function eventLabel(event: DeltaEvent): string {
    if (event.kind === 'loot') return L.candidate;
    return [S.combatKinds[event.attribution?.relation ?? 'unknown'][event.kind],
      event.attribution?.assisted ? S.attributionLabels.assisted : '',
      event.attribution?.spectating ? S.attributionLabels.spectating : ''].filter(Boolean).join(' · ');
  }
  const latest = (): DeltaEvent | undefined => state?.events.at(-1);
  function sameObservation(a: DeltaState, b: DeltaState): boolean {
    return a.generation === b.generation && a.intent === b.intent && a.phase === b.phase && a.reason === b.reason
      && a.bound === b.bound && a.configuredDisplayId === b.configuredDisplayId
      && (a.source && b.source ? sameDeltaDisplay(a.source, b.source) : a.source === b.source);
  }
  function sameCalibrationState(a: DeltaState, b: DeltaState): boolean {
    return sameObservation(a, b) && a.gameAspectRatio === b.gameAspectRatio && a.calibrationDisplayId === b.calibrationDisplayId;
  }
  function validRegion(roi: DeltaRoi | null): roi is DeltaRoi {
    return !!roi && Object.values(roi).every(Number.isFinite) && roi.x >= 0 && roi.y >= 0 && roi.width > 0 && roi.height > 0
      && roi.x + roi.width <= 1 && roi.y + roi.height <= 1;
  }
  function regionTooLarge(includePersonal = true): boolean {
    if (!calibrationFrame) return false;
    const regions = [calibrationRoi, includePersonal ? personalFeedbackRoi : null].filter((roi): roi is DeltaRoi => roi !== null);
    const { width, height } = calibrationFrame.display.bounds;
    return combatSelectionTooLarge(regions, width, height);
  }
  function activeRegion(): DeltaRoi | null {
    if (regionPurpose.value === 'items') return itemsRoi;
    if (regionPurpose.value === 'context') return contextRoi;
    return regionPurpose.value === 'personal' ? personalFeedbackRoi : calibrationRoi;
  }
  function itemRegionSelected(): boolean {
    return regionPurpose.value === 'items' || regionPurpose.value === 'context';
  }
  function lootRegionsTooLarge(): boolean {
    if (!calibrationFrame) return false;
    const { width, height } = calibrationFrame.display.bounds;
    return lootSelectionTooLarge(itemsRoi, contextRoi, width, height, validRegion);
  }
  function syncRegionFields(): void {
    const roi = activeRegion();
    for (const { key, input } of regionFields) input.value = roi && Number.isFinite(roi[key]) ? String(Number((roi[key] * 100).toFixed(6))) : '';
  }
  function drawRegion(): void {
    for (const { roi, element, purpose } of [
      { roi: calibrationRoi, element: selection, purpose: 'feed' },
      { roi: personalFeedbackRoi, element: personalSelection, purpose: 'personal' },
      { roi: itemsRoi, element: itemsSelection, purpose: 'items' },
      { roi: contextRoi, element: contextSelection, purpose: 'context' },
    ]) {
      element.hidden = !validRegion(roi);
      element.classList.toggle('delta-selection-inactive', regionPurpose.value !== purpose);
      if (roi) {
        element.style.left = `${roi.x * 100}%`;
        element.style.top = `${roi.y * 100}%`;
        element.style.width = `${roi.width * 100}%`;
        element.style.height = `${roi.height * 100}%`;
      }
    }
    setText(regionHint, regionPurpose.value === 'items' ? L.itemsHint : regionPurpose.value === 'context' ? L.contextHint
      : regionPurpose.value === 'personal' ? D.personalHint : D.hint);
    regionError.textContent = itemRegionSelected() ? lootRegionsTooLarge() ? L.limits : '' : regionTooLarge() ? D.reasons['roi-too-large'] : '';
    updateControls();
  }
  function selectRegion(roi: DeltaRoi): void {
    if (regionPurpose.value === 'items') itemsRoi = roi;
    else if (regionPurpose.value === 'context') contextRoi = roi;
    else if (regionPurpose.value === 'personal') personalFeedbackRoi = roi;
    else calibrationRoi = roi;
    syncRegionFields();
    drawRegion();
  }
  function readRegion(): void {
    const roi = Object.fromEntries(regionFields.map(({ key, input }) => [key, input.value === '' ? NaN : Number(input.value) / 100])) as unknown as DeltaRoi;
    if (regionPurpose.value === 'items') itemsRoi = roi;
    else if (regionPurpose.value === 'context') contextRoi = roi;
    else if (regionPurpose.value === 'personal') personalFeedbackRoi = roi;
    else calibrationRoi = roi;
    drawRegion();
  }
  function clearCalibration(): void {
    screenshots.dismissFor(calibrationImage);
    calibrationVersion++;
    calibrationController?.abort();
    calibrationController = null;
    calibrationBusy = false;
    calibrationFrame = null;
    calibrationRoi = null;
    personalFeedbackRoi = null;
    itemsRoi = null;
    contextRoi = null;
    regionPurpose.value = 'feed';
    drag = null;
    calibrationImage.removeAttribute('src');
    delete calibrationImage.dataset.displayId;
    delete calibrationImage.dataset.frameId;
    calibrationCaption.textContent = '';
    regionError.textContent = '';
    calibrationFigure.hidden = true;
    selection.hidden = true;
    personalSelection.hidden = true;
    itemsSelection.hidden = true;
    contextSelection.hidden = true;
    for (const { input } of regionFields) input.value = '';
    if (calibrationUrl) URL.revokeObjectURL(calibrationUrl);
    calibrationUrl = null;
  }
  function sameEvidenceState(a: DeltaState, b: DeltaState): boolean {
    const first = a.events.at(-1), second = b.events.at(-1);
    return sameObservation(a, b) && first?.id === second?.id && first?.generation === second?.generation
      && (first?.status === 'dropped') === (second?.status === 'dropped');
  }
  function clearSlot(slot: typeof imageSlots[number]): void {
    screenshots.dismissFor(slot.image);
    slot.version++;
    slot.controller?.abort();
    slot.controller = null;
    slot.busy = false;
    slot.image.removeAttribute('src');
    delete slot.image.dataset.displayId;
    delete slot.image.dataset.frameId;
    delete slot.image.dataset.eventId;
    slot.caption.textContent = '';
    slot.figure.hidden = true;
    if (slot.url) URL.revokeObjectURL(slot.url);
    slot.url = null;
  }
  function clearImages(): void { for (const slot of imageSlots) clearSlot(slot); }
  function clearKnowledgeContent(): void {
    knowledgeContent.textContent = '';
    knowledgeContent.hidden = true;
    const button = knowledgeButtons.find(({ action }) => action === 'view')!.button;
    setText(button, P.view);
    button.setAttribute('aria-label', P.view);
    button.setAttribute('aria-expanded', 'false');
  }
  function updateControls(): void {
    const active = availability === 'active' && state !== null;
    const captureIssue = state?.startBlockedReason ?? state?.reason;
    const standalone = state?.captureMode === 'standalone';
    const selected = picker.display();
    const captureAllowed = active && !!state?.bound && (standalone ? !!(state.standaloneGranted ||
      (state.calibrationDisplayId && (!selected || selected === state.calibrationDisplayId)))
      : captureIssue !== 'view-disabled' && captureIssue !== 'observation-disabled' && captureIssue !== 'view-permission');
    const calibrationDisplay = state?.calibrationDisplayId || state?.configuredDisplayId || '';
    const identitySource = captureAllowed && state ? JSON.stringify([state.captureMode, calibrationDisplay, state.startupCheck.source?.topologyRevision]) : null;
    identity.update(active ? state?.detection.config.nickname : undefined, identitySource, busy || calibrationBusy || quickCalibration.locked(),
      state?.identityDebug);
    quickCalibration.update(captureAllowed, busy || calibrationBusy || identity.pending(), state?.calibrationHotkey, state ? {
      displayId: calibrationDisplay, topologyRevision: state.startupCheck.source?.topologyRevision,
      gameAspectRatio: state.gameAspectRatio, combat: state.detection.config.calibration, loot: state.loot.config.calibration,
    } : undefined, (standalone && (!state?.calibrationHotkey || !!state.calibrationDisplayId)) || state?.captureMode === 'unsupported');
    const locked = busy || quickCalibration.locked() || identity.pending();
    picker.update(state, locked, choosingObservationScreen ? 'observe' : !setup.element.hidden ? 'calibration' : 'closed');
    setup.update(state, locked, standalone && !captureAllowed, picker.displayInfo());
    speechEnabled.input.disabled = speechProbability.disabled = speechCooldown.disabled = speechStyle.disabled = locked || !active;
    for (const { checkbox } of [...speechKinds, ...speechRelations]) checkbox.input.disabled = locked || !active;
    saveSpeech.disabled = locked || !active || !speechConfigDirty || !speechProbability.validity.valid || !speechCooldown.validity.valid;
    knowledgeFile.disabled = locked || !active || !state?.knowledge.canImport;
    for (const { action, button } of knowledgeButtons) {
      button.disabled = locked || !active || ((action === 'import' || action === 'restore') && !state?.knowledge.canImport)
        || (action === 'restore' && state?.knowledge.source === 'builtin' && !state.knowledge.lastError);
    }
    nickname.disabled = language.disabled = detectionEnabled.input.disabled = locked || !active;
    lootLanguage.disabled = lootSensitivity.disabled = lootEnabled.input.disabled = locked || !active;
    saveLoot.disabled = locked || !active || !lootConfigDirty;
    saveDetection.disabled = locked || !active || !configDirty;
    previewCalibration.disabled = locked || calibrationBusy || !captureAllowed;
    for (const { configure } of startupChecks) {
      configure.disabled = !active || locked;
    }
    saveCalibration.disabled = locked || calibrationBusy || !active || !calibrationFrame || !validRegion(calibrationRoi)
      || (personalFeedbackRoi !== null && !validRegion(personalFeedbackRoi)) || regionTooLarge();
    saveCalibration.hidden = itemRegionSelected();
    saveLootCalibration.hidden = !itemRegionSelected();
    saveLootCalibration.disabled = locked || calibrationBusy || !active || !calibrationFrame
      || !validRegion(itemsRoi) || !validRegion(contextRoi) || lootRegionsTooLarge();
    clearPersonal.hidden = !calibrationFrame || regionPurpose.value !== 'personal';
    clearPersonal.disabled = locked || calibrationBusy || !active || !calibrationFrame || !personalFeedbackRoi || !validRegion(calibrationRoi) || regionTooLarge(false);
    regionPurpose.disabled = locked || calibrationBusy || !calibrationFrame;
    for (const { input } of regionFields) input.disabled = locked || calibrationBusy || !calibrationFrame;
    const pausing = !!state?.actions.pause && !state.actions.start;
    const incomplete = !!state && (setupIssues(state, picker.displayInfo()).length > 0 || (!setup.element.hidden && setup.pending()));
    const mayConfigure = !!state && setupIssues(state).length > 0;
    if (state) updatePlaybackStatus(state, setupIssues(state, picker.displayInfo()).length > 0);
    const needsScreen = status.dataset.observerOverall === 'permission';
    const mode = pausing ? 'pause' : incomplete || needsScreen ? 'setup' : 'start';
    if (play.dataset.mode !== mode) {
      play.dataset.mode = mode;
      playLabel.textContent = playCaption.textContent = pausing ? S.pause : S.start;
      const attention = incomplete ? V.incomplete : needsScreen ? V.needsScreen : '';
      play.setAttribute('aria-label', pausing ? S.pause : attention ? `${S.start} · ${attention}` : S.start);
      play.title = play.getAttribute('aria-label')!;
    }
    play.disabled = (pausing ? busy : locked) || !active || state?.captureMode === 'unsupported'
      || (!pausing && !standalone && !state?.actions.start && !mayConfigure);
    configureSetup.disabled = statusJump.disabled = !active || locked;
    stop.hidden = !pendingGrant && !state?.actions.stop;
    stop.disabled = !pendingGrant && (busy || !active || !state?.actions.stop);
    simulate.disabled = locked || !active || !state?.actions.simulate;
    kind.disabled = simulate.disabled;
    refresh.disabled = busy || quickCalibration.pending() || polling;
    const event = latest();
    for (const slot of imageSlots) slot.button.disabled = locked || slot.busy || !active || state?.phase !== 'running' || !event
      || event.status === 'dropped' || event.generation !== state.generation || Date.parse(event.validUntil) <= Date.now();
  }
  function updatePlaybackStatus(value: DeltaState, incomplete: boolean) {
    const cause = value.reason && !['stopped', 'paused'].includes(value.reason) ? value.reason : value.startBlockedReason;
    const permission = cause === 'view-permission';
    const detail = cause && cause !== 'unbound' ? S.reasons[cause] : '';
    let code: string, title: string, hint = detail;
    if (value.phase === 'error') { code = 'error'; title = S.phases.error; }
    else if (value.phase === 'unbound' || value.captureMode === 'unsupported') {
      code = 'unavailable'; title = value.captureMode === 'unsupported' ? captureLabels.unsupported : S.phases.unbound;
    } else if ((cause && !permission) || (value.phase === 'blocked' && !permission)) {
      code = 'blocked'; title = S.phases.blocked;
    } else if (value.intent === 'paused' && value.phase === 'stopped') {
      code = 'paused'; title = S.reasons.paused;
    } else if (permission || (value.captureMode === 'standalone' && !value.standaloneGranted)) {
      code = 'permission'; title = V.needsScreen;
      if (incomplete) hint = V.incomplete;
      else if (value.captureMode === 'standalone') hint = '';
    } else if (value.phase === 'running' || value.phase === 'starting') {
      code = value.phase; title = S.phases[value.phase];
      if (incomplete) hint = V.incomplete;
    } else if (incomplete) { code = 'setup'; title = V.incomplete; }
    else if (value.actions.start) { code = 'ready'; title = V.canObserve; }
    else { code = 'blocked'; title = S.phases.blocked; }
    setText(status, title);
    status.dataset.observerOverall = code;
    status.dataset.phase = value.phase;
    setText(reason, hint);
    statusJump.hidden = !(code === 'setup' || (code === 'permission' && (incomplete || value.captureMode === 'standalone')));
    const jumpLabel = incomplete ? Q.fix : captureLabels.choose;
    if (statusJump.title !== jumpLabel) { statusJump.title = jumpLabel; statusJump.setAttribute('aria-label', jumpLabel); }
  }
  function render(value: DeltaState): void {
    if (state && !sameEvidenceState(state, value)) clearImages();
    if (state && !sameCalibrationState(state, value)) clearCalibration();
    if (state && JSON.stringify([state.knowledge.source, state.knowledge.version, state.knowledge.name])
      !== JSON.stringify([value.knowledge.source, value.knowledge.version, value.knowledge.name])) clearKnowledgeContent();
    state = value;
    if (value.calibrationHotkey?.attempt && value.phase === 'running') setup.element.hidden = false;
    availability = 'active';
    setText(captures, S.captures(value.worker.captures));
    const captureLabel = value.captureMode === 'host' ? captureLabels.host : value.captureMode === 'standalone' ? captureLabels.standalone : '';
    setText(sourceHeading, [S.source, captureLabel].filter(Boolean).join(' · '));
    source.hidden = value.captureMode === 'standalone' && !value.standaloneGranted;
    setText(source, value.captureMode === 'unsupported' ? captureLabels.unsupported
      : value.source ? sourceLabel(value.source) : value.bound ? value.configuredDisplayId ? V.sourcePending : S.primary : '—');
    for (const { key, value: element } of knowledgeFields) {
      setText(element, key === 'source' ? `${P[value.knowledge.source]} · ${value.knowledge.name}`
        : key === 'bytes' ? value.knowledge.bytes.toLocaleString() : value.knowledge.version);
    }
    const knowledgeErrors = { 'knowledge-invalid': errors.knowledgeInvalid, 'knowledge-too-large': errors.knowledgeTooLarge, 'knowledge-read-failed': errors.knowledgeReadFailed };
    setText(knowledgeError, value.knowledge.lastError ? knowledgeErrors[value.knowledge.lastError] : '');
    if (!speechConfigDirty) {
      const speech = value.speech.config;
      speechEnabled.setChecked(speech.enabled);
      speechProbability.value = String(decimalShift(speech.probability, 2));
      speechCooldown.value = String(speech.cooldownMs / 1000);
      speechStyle.value = speech.style;
      for (const { kind, checkbox } of speechKinds) checkbox.setChecked(speech.eventKinds.includes(kind));
      for (const { relation, checkbox } of speechRelations) checkbox.setChecked(speech.relations.includes(relation));
    }
    setText(speechActivity, `${P.lastSelected}: ${value.speech.lastSelectedAt ? new Date(value.speech.lastSelectedAt).toLocaleString() : P.none} · ${P.lastActivity}: ${value.speech.lastActivityAt ? new Date(value.speech.lastActivityAt).toLocaleString() : P.none}`);
    const check = value.startupCheck;
    setText(startupStatus, C[check.phase]);
    startupStatus.dataset.startupPhase = check.phase;
    const geometry = check.source;
    setText(startupGeometry, geometry ? `${C.resolution} ${geometry.width} × ${geometry.height} · ${C.aspectRatio} ${aspectLabel(geometry.width, geometry.height)} · ${C.scale} ${geometry.scaleFactor === null ? C.unknown : `${Number((geometry.scaleFactor * 100).toFixed(2))}%`}` : '');
    const blockedReason = value.phase === 'blocked' || value.phase === 'error' ? value.reason ?? value.startBlockedReason : value.startBlockedReason;
    readiness.hidden = false;
    for (const { key, value: element, detail, missing, configure } of startupChecks) {
      const channel = value[key];
      const calibration = check[key];
      const missingFields = {
        nickname: false,
        language: !channel.config.language,
        regions: !channel.config.calibration,
      };
      const fields = missing.filter(({ field }) => channel.config.enabled && missingFields[field]);
      const first = fields[0]?.field;
      if (first) configure.dataset.firstMissing = first;
      else delete configure.dataset.firstMissing;
      let heading = channel.phase === 'ready' ? key === 'detection' ? V.watchCombat : V.watchLoot : D.phases[channel.phase];
      if (first) heading = channel.phase === 'uncalibrated' ? V.incomplete : `${heading} · ${V.incomplete}`;
      const summary = [heading, ...fields.map(({ item }) => item.textContent)].join(' · ');
      if (element.textContent !== summary) {
        element.replaceChildren(heading);
        for (const { item } of fields) element.append(' · ', item);
      }
      element.dataset.startupCalibrationStatus = calibration.status;
      element.dataset.tone = !channel.config.enabled ? 'off' : first || calibration.status === 'invalid'
        || channel.phase === 'error' || channel.phase === 'unavailable' ? 'warn' : channel.phase === 'ready' ? 'on' : 'plain';
      const issue = channel.reason;
      const calibrationIssue = calibration.status === 'invalid' && calibration.reason ? C.reasons[calibration.reason] : '';
      const setupIssue = issue === 'nickname-required' || issue === 'language-required' || issue === 'calibration-required';
      const explainedByCalibration = calibrationIssue && (issue === 'roi-too-large' ? calibration.reason === issue
        : issue === 'source-changed' && calibration.reason !== 'roi-too-large');
      const channelIssue = !issue || (first && setupIssue) || explainedByCalibration ? ''
        : issue === 'language-conflict' ? L.languageConflict : issue === 'roi-too-large' && key === 'loot' ? L.limits : D.reasons[issue];
      setText(detail, channel.config.enabled ? [blockedReason ? S.reasons[blockedReason] : '', channelIssue, calibrationIssue].filter(Boolean).join(' ') : '');
    }
    if (!configDirty) {
      nickname.value = value.detection.config.nickname;
      language.value = value.detection.config.language;
      detectionEnabled.setChecked(value.detection.config.enabled);
    }
    if (!lootConfigDirty) {
      lootLanguage.value = value.loot.config.language;
      lootSensitivity.value = value.loot.config.sensitivity;
      lootEnabled.setChecked(value.loot.config.enabled);
    }
    setText(detectionStatus, value.detection.phase === 'ready' ? V.watchCombat : D.phases[value.detection.phase]);
    detectionStatus.dataset.detectionPhase = value.detection.phase;
    setText(detectionReason, value.detection.reason ? D.reasons[value.detection.reason] : '');
    const calibrated = value.detection.config.calibration && !['source-changed', 'calibration-required', 'roi-too-large'].includes(value.detection.reason ?? '');
    setText(calibrationStatus, calibrated ? `${D.calibrated} ${value.detection.config.calibration?.personalFeedbackRoi ? D.personalSaved : D.personalAbsent}` : D.uncalibrated);
    for (const { key, value: element } of diagnosticValues) {
      setText(element, key === 'engine' ? value.detection.engine ?? D.noEngine : key === 'languages'
        ? value.detection.availableLanguages.join(', ') || D.noEngine : String(value.detection[key]));
    }
    setText(detectionError, value.detection.lastError ?? '');
    setText(lootStatus, value.loot.phase === 'ready' ? V.watchLoot : D.phases[value.loot.phase]);
    lootStatus.dataset.lootPhase = value.loot.phase;
    const lootStateReason = value.loot.reason;
    setText(lootReason, lootStateReason === 'language-conflict' ? L.languageConflict : lootStateReason === 'roi-too-large' ? L.limits
      : lootStateReason === 'calibration-required' ? L.uncalibrated : lootStateReason ? D.reasons[lootStateReason] : '');
    setText(lootScene, `${L.scene} · ${L.scenes[value.loot.scene ?? 'unknown']}`);
    const lootCalibrated = value.loot.config.calibration && !['source-changed', 'calibration-required', 'roi-too-large'].includes(lootStateReason ?? '');
    setText(lootCalibrationStatus, lootCalibrated ? L.calibrated : L.uncalibrated);
    for (const { key, value: element } of lootDiagnosticValues) {
      setText(element, key === 'engine' ? value.loot.engine ?? D.noEngine : key === 'languages'
        ? value.loot.availableLanguages.join(', ') || D.noEngine : String(value.loot[key]));
    }
    setText(lootError, value.loot.lastError ?? '');
    const event = latest();
    eventBox.hidden = false;
    imageActions.hidden = !event || event.status === 'dropped';
    deliveryHint.hidden = event?.status !== 'delivered';
    setText(eventTitle, event ? [event.synthetic ? S.synthetic : '', eventLabel(event)].filter(Boolean).join(' · ') : S.noEvents);
    setText(eventTime, event ? S.capturedAt(new Date(event.capturedAt).toLocaleString()) : '');
    setText(eventStatus, event ? event.dropReason && event.dropReason in P.dropReasons ? P.notTriggered : S.eventStates[event.status] : '');
    setText(eventReason, event?.dropReason ? S.dropReasons[event.dropReason] : '');
    if (event?.dropReason && event.dropReason in P.dropReasons) eventReason.dataset.speechDecision = event.dropReason;
    else delete eventReason.dataset.speechDecision;
    updateControls();
  }
  function showUnavailable(text: string, detail = '', inactive = false): void {
    clearImages();
    clearCalibration();
    clearKnowledgeContent();
    state = null;
    setup.element.hidden = true; setupBack.hidden = true; choosingObservationScreen = false; setup.reset();
    availability = inactive ? 'inactive' : 'unavailable';
    setText(status, text);
    status.dataset.observerOverall = 'unavailable';
    delete status.dataset.phase;
    setText(reason, detail);
    statusJump.hidden = true;
    captures.textContent = '';
    source.textContent = '—';
    source.hidden = false;
    setText(sourceHeading, S.source);
    for (const { value } of knowledgeFields) value.textContent = '—';
    knowledgeError.textContent = '';
    speechActivity.textContent = '';
    startupStatus.textContent = '—';
    delete startupStatus.dataset.startupPhase;
    startupGeometry.textContent = '';
    readiness.hidden = true;
    for (const { value, detail } of startupChecks) {
      value.textContent = '—';
      delete value.dataset.startupCalibrationStatus;
      detail.textContent = '';
    }
    detectionStatus.textContent = '—';
    delete detectionStatus.dataset.detectionPhase;
    detectionReason.textContent = '';
    detectionError.textContent = '';
    for (const { value } of diagnosticValues) value.textContent = '—';
    calibrationStatus.textContent = D.uncalibrated;
    lootStatus.textContent = '—';
    delete lootStatus.dataset.lootPhase;
    lootReason.textContent = '';
    lootScene.textContent = '';
    lootError.textContent = '';
    for (const { value } of lootDiagnosticValues) value.textContent = '—';
    lootCalibrationStatus.textContent = L.uncalibrated;
    eventBox.hidden = true;
    updateControls();
  }
  async function load(expectedGeneration: number): Promise<void> {
    let read = ++stateRead;
    const page = await ctx.availability();
    if (signal.aborted || expectedGeneration !== generation || read < appliedRead) return;
    if (page.kind === 'absent') { appliedRead = read; showUnavailable(S.notLoaded); return; }
    if (page.kind !== 'active') { appliedRead = read; showUnavailable(page.kind === 'inactive' ? S.inactive : S.missing, page.reason, page.kind === 'inactive'); return; }
    read = ++stateRead;
    const value = await invoke('state');
    if (!signal.aborted && expectedGeneration === generation && read >= appliedRead) { appliedRead = read; render(value); }
  }
  async function refreshState(): Promise<void> {
    if (polling || busy || quickCalibration.pending() || signal.aborted) return;
    polling = true;
    const expected = generation;
    updateControls();
    try { await load(expected); }
    catch (error) { if (!signal.aborted && expected === generation) showUnavailable(S.stateFailed(errorText(error))); }
    finally { polling = false; if (!signal.aborted) updateControls(); }
  }
  async function perform(action: Action, selection?: { id: string; trigger: HTMLButtonElement }): Promise<void> {
    const cancelsGrant = pendingGrant && action === 'stop';
    if (!state || (busy && !cancelsGrant) || signal.aborted) return;
    const revokesAccess = state.captureMode === 'standalone' && state.standaloneGranted && action !== 'start';
    if (!cancelsGrant && ((!revokesAccess && quickCalibration.locked()) || (selection ? selection.trigger.disabled : !state.actions[action]))) return;
    const doc = sheet.el.ownerDocument;
    const trigger = selection?.trigger ?? (action === 'stop' ? stop : play);
    const hadFocus = doc.activeElement === trigger;
    const expected = ++generation;
    pendingGrant = !!selection;
    busy = true;
    clearImages();
    clearCalibration();
    eventMessage.textContent = '';
    updateControls();
    try {
      const value = selection ? await invoke('startStandalone', selection.id) : await invoke(action);
      if (!signal.aborted && expected === generation) {
        choosingObservationScreen = false;
        setup.element.hidden = true; setupBack.hidden = true; setup.reset();
        render(value);
      }
    } catch (error) { if (!signal.aborted && expected === generation) showUnavailable(S.stateFailed(errorText(error))); }
    finally {
      if (!signal.aborted && expected === generation) {
        busy = pendingGrant = false;
        updateControls();
        if (hadFocus && (doc.activeElement === doc.body || doc.activeElement === trigger)) {
          const next = !play.disabled ? play : refresh;
          (trigger.closest('[hidden]') || trigger.disabled ? next : trigger).focus();
        }
      }
    }
  }
  async function simulateEvent(): Promise<void> {
    if (simulate.disabled || signal.aborted) return;
    generation++;
    busy = true;
    updateControls();
    try {
      const receipt = await invoke('simulate', { kind: kind.value as DeltaKind });
      if (signal.aborted) return;
      render(receipt.state);
      simulationMessage.textContent = receipt.accepted ? S.accepted : [S.rejected, receipt.reason ? S.dropReasons[receipt.reason] : ''].filter(Boolean).join(' ');
      simulationMessage.classList.toggle('bad', !receipt.accepted);
    } catch (error) { if (!signal.aborted) showUnavailable(S.stateFailed(errorText(error))); }
    finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function configureDetection(): Promise<void> {
    if (saveDetection.disabled || signal.aborted) return;
    generation++;
    busy = true;
    clearCalibration();
    detectionMessage.textContent = '';
    updateControls();
    try {
      const value = await invoke('detectionConfigure', { enabled: detectionEnabled.checked, nickname: nickname.value.trim(), language: language.value as DeltaGameLanguage });
      if (!signal.aborted) { configDirty = false; render(value); detectionMessage.textContent = D.saved; detectionMessage.classList.remove('bad'); }
    } catch (error) {
      if (!signal.aborted) { detectionMessage.textContent = `${D.failed}: ${errorText(error)}`; detectionMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function configureLoot(): Promise<void> {
    if (saveLoot.disabled || signal.aborted) return;
    generation++;
    busy = true;
    clearCalibration();
    lootMessage.textContent = '';
    updateControls();
    try {
      const value = await invoke('lootConfigure', { enabled: lootEnabled.checked, language: lootLanguage.value as DeltaGameLanguage,
        sensitivity: lootSensitivity.value as DeltaLootSensitivity });
      if (!signal.aborted) { lootConfigDirty = false; render(value); lootMessage.textContent = L.saved; lootMessage.classList.remove('bad'); }
    } catch (error) {
      if (!signal.aborted) { lootMessage.textContent = `${D.failed}: ${errorText(error)}`; lootMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function configureSpeech(): Promise<void> {
    if (saveSpeech.disabled || signal.aborted) return;
    generation++;
    busy = true;
    speechMessage.textContent = '';
    updateControls();
    try {
      const value = await invoke('speechConfigure', {
        enabled: speechEnabled.checked, probability: decimalShift(Number(speechProbability.value), -2),
        cooldownMs: Math.round(Number(speechCooldown.value) * 1000), style: speechStyle.value as DeltaSpeechConfig['style'],
        eventKinds: speechKinds.filter(({ checkbox }) => checkbox.checked).map(({ kind }) => kind),
        relations: speechRelations.filter(({ checkbox }) => checkbox.checked).map(({ relation }) => relation),
      });
      if (!signal.aborted) { speechConfigDirty = false; render(value); speechMessage.textContent = P.saved; speechMessage.classList.remove('bad'); }
    } catch (error) {
      if (!signal.aborted) { speechMessage.textContent = errorText(error); speechMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function importKnowledge(): Promise<void> {
    const file = knowledgeFile.files?.[0];
    knowledgeFile.value = '';
    if (!file || knowledgeFile.disabled || signal.aborted) return;
    if (!/\.md$/i.test(file.name) || file.size > DELTA_KNOWLEDGE_MAX_BYTES) {
      knowledgeMessage.textContent = file.size > DELTA_KNOWLEDGE_MAX_BYTES ? errors.knowledgeTooLarge : errors.knowledgeInvalid;
      knowledgeMessage.classList.add('bad');
      return;
    }
    generation++;
    busy = true;
    knowledgeMessage.textContent = '';
    updateControls();
    try {
      const content = await file.text();
      if (signal.aborted) return;
      const value = await invoke('knowledgeImport', { name: file.name, content });
      if (!signal.aborted) { clearKnowledgeContent(); render(value); knowledgeMessage.textContent = P.knowledgeSaved; knowledgeMessage.classList.remove('bad'); }
    } catch (error) {
      if (!signal.aborted) { knowledgeMessage.textContent = errorText(error); knowledgeMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function performKnowledge(action: 'view' | 'reload' | 'restore'): Promise<void> {
    const button = knowledgeButtons.find((item) => item.action === action)!.button;
    if (button.disabled || signal.aborted) return;
    if (action === 'view' && !knowledgeContent.hidden) { clearKnowledgeContent(); return; }
    generation++;
    busy = true;
    knowledgeMessage.textContent = '';
    updateControls();
    try {
      if (action === 'view') {
        const knowledge = await invoke('knowledgeRead');
        if (signal.aborted) return;
        const value = await invoke('state');
        if (signal.aborted) return;
        render(value);
        if (knowledge.state.version === value.knowledge.version && knowledge.state.source === value.knowledge.source) {
          knowledgeContent.textContent = knowledge.content;
          knowledgeContent.hidden = false;
          setText(button, P.hide);
          button.setAttribute('aria-label', P.hide);
          button.setAttribute('aria-expanded', 'true');
        }
      } else {
        const value = await invoke(action === 'reload' ? 'knowledgeReload' : 'knowledgeRestore');
        if (!signal.aborted) {
          clearKnowledgeContent(); render(value);
          knowledgeMessage.textContent = value.knowledge.lastError ? '' : action === 'reload' ? P.knowledgeReloaded : P.knowledgeRestored;
          knowledgeMessage.classList.remove('bad');
        }
      }
    } catch (error) {
      if (!signal.aborted) { knowledgeMessage.textContent = errorText(error); knowledgeMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function showCalibration(purpose: 'feed' | 'items' = 'feed'): Promise<void> {
    if (previewCalibration.disabled || !state || signal.aborted) return;
    const doc = sheet.el.ownerDocument;
    const hadFocus = doc.activeElement === previewCalibration;
    calibrationMessage.textContent = '';
    clearCalibration();
    const version = calibrationVersion, expected = generation, initial = state;
    const controller = new AbortController();
    calibrationController = controller;
    calibrationBusy = true;
    const previewSignal = AbortSignal.any([signal, controller.signal]);
    const current = () => !previewSignal.aborted && version === calibrationVersion && expected === generation;
    updateControls();
    try {
      const frame = await ctx.invoke('detectionPreview', [], previewSignal);
      if (!current()) return;
      const blob = await ctx.invokePreviewBinary(frame.frameId, previewSignal);
      if (!current()) return;
      const read = ++stateRead;
      const value = await ctx.invoke('state', [], previewSignal);
      if (!current()) return;
      if (read >= appliedRead) { appliedRead = read; render(value); }
      if (!current() || !state || !sameCalibrationState(state, initial) || !sameCalibrationState(value, initial)) return;
      if (value.phase === 'running' && value.source ? !sameDeltaDisplay(value.source, frame.display)
        : (value.calibrationDisplayId || value.configuredDisplayId) && (value.calibrationDisplayId || value.configuredDisplayId) !== frame.display.id) return;
      calibrationFrame = frame;
      calibrationUrl = URL.createObjectURL(blob);
      calibrationImage.src = calibrationUrl;
      calibrationImage.dataset.displayId = frame.display.id;
      calibrationImage.dataset.frameId = frame.frameId;
      calibrationCaption.textContent = `${sourceLabel(frame.display)} · ${S.capturedAt(new Date(frame.capturedAt).toLocaleString())}`;
      calibrationFigure.hidden = false;
      regionPurpose.value = purpose;
      const saved = value.detection.config.calibration;
      if (saved && (saved.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO) === value.gameAspectRatio
        && saved.topologyRevision === frame.topologyRevision && sameDeltaDisplay(saved.display, frame.display)) {
        calibrationRoi = { ...saved.roi };
        personalFeedbackRoi = saved.personalFeedbackRoi ? { ...saved.personalFeedbackRoi } : null;
      }
      const lootSaved = value.loot.config.calibration;
      if (lootSaved && (lootSaved.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO) === value.gameAspectRatio
        && lootSaved.topologyRevision === frame.topologyRevision && sameDeltaDisplay(lootSaved.display, frame.display)) {
        itemsRoi = { ...lootSaved.itemsRoi };
        contextRoi = { ...lootSaved.contextRoi };
      }
      syncRegionFields();
      drawRegion();
    } catch (error) {
      if (current()) { calibrationMessage.textContent = `${D.failed}: ${errorText(error)}`; calibrationMessage.classList.add('bad'); }
    } finally {
      if (version === calibrationVersion) { calibrationBusy = false; calibrationController = null; }
      if (!signal.aborted) {
        updateControls();
        if (hadFocus && current() && calibrationFrame && calibrationSettings.element.open
          && (doc.activeElement === doc.body || doc.activeElement === previewCalibration)) regionPurpose.focus();
      }
    }
  }
  async function calibrateDetection(removePersonal = false): Promise<void> {
    if ((removePersonal ? clearPersonal.disabled : saveCalibration.disabled) || !calibrationFrame || !validRegion(calibrationRoi) || signal.aborted) return;
    const frameId = calibrationFrame.frameId, roi = { ...calibrationRoi };
    const personal = !removePersonal && personalFeedbackRoi ? { ...personalFeedbackRoi } : null;
    generation++;
    busy = true;
    updateControls();
    try {
      const value = await invoke('detectionCalibrate', frameId, roi, personal);
      if (!signal.aborted) { clearCalibration(); render(value); calibrationMessage.textContent = D.regionSaved; calibrationMessage.classList.remove('bad'); }
    } catch (error) {
      if (!signal.aborted) { calibrationMessage.textContent = `${D.failed}: ${errorText(error)}`; calibrationMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  async function calibrateLoot(): Promise<void> {
    if (saveLootCalibration.disabled || !calibrationFrame || !validRegion(itemsRoi) || !validRegion(contextRoi) || signal.aborted) return;
    const frameId = calibrationFrame.frameId, items = { ...itemsRoi }, context = { ...contextRoi };
    generation++;
    busy = true;
    updateControls();
    try {
      const value = await invoke('lootCalibrate', frameId, items, context);
      if (!signal.aborted) { clearCalibration(); render(value); calibrationMessage.textContent = L.regionSaved; calibrationMessage.classList.remove('bad'); }
    } catch (error) {
      if (!signal.aborted) { calibrationMessage.textContent = `${D.failed}: ${errorText(error)}`; calibrationMessage.classList.add('bad'); }
    } finally { busy = false; if (!signal.aborted) updateControls(); }
  }
  function pointerPosition(event: PointerEvent): { x: number; y: number } | null {
    const bounds = calibrationSurface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  function moveRegion(event: PointerEvent): void {
    if (!drag || quickCalibration.locked() || event.pointerId !== drag.id) return;
    const point = pointerPosition(event);
    if (!point) return;
    selectRegion({ x: Math.min(drag.x, point.x), y: Math.min(drag.y, point.y), width: Math.abs(point.x - drag.x), height: Math.abs(point.y - drag.y) });
  }
  calibrationSurface.addEventListener('pointerdown', (event) => {
    if (!calibrationFrame || busy || quickCalibration.locked() || calibrationBusy || event.button !== 0) return;
    const point = pointerPosition(event);
    if (!point) return;
    event.preventDefault();
    drag = { id: event.pointerId, ...point };
    calibrationSurface.setPointerCapture(event.pointerId);
    selectRegion({ ...point, width: 0, height: 0 });
  }, { signal });
  calibrationSurface.addEventListener('pointermove', moveRegion, { signal });
  calibrationSurface.addEventListener('pointerup', (event) => { moveRegion(event); drag = null; }, { signal });
  calibrationSurface.addEventListener('pointercancel', () => { drag = null; }, { signal });
  async function showImage(part: ImageKind): Promise<void> {
    const slot = imageSlots.find((item) => item.part === part)!;
    const event = latest();
    if (slot.button.disabled || !event || !state || signal.aborted) return;
    if (Date.parse(event.validUntil) <= Date.now()) { eventMessage.textContent = S.dropReasons.expired; updateControls(); return; }
    clearSlot(slot);
    const version = slot.version, expected = generation, initial = state;
    const controller = new AbortController();
    slot.controller = controller;
    slot.busy = true;
    const imageSignal = AbortSignal.any([signal, controller.signal]);
    const current = () => !imageSignal.aborted && version === slot.version && expected === generation;
    updateControls();
    try {
      const blob = await ctx.invokeBinary(event.id, part, imageSignal);
      if (!current()) return;
      const read = ++stateRead;
      const value = await ctx.invoke('state', [], imageSignal);
      if (!current()) return;
      if (read >= appliedRead) { appliedRead = read; render(value); }
      if (!current() || !state || !sameEvidenceState(state, initial) || !sameEvidenceState(value, initial) || value.phase !== 'running'
        || event.generation !== value.generation || event.generation !== state.generation) return;
      if (Date.parse(value.events.at(-1)!.validUntil) <= Date.now()) { eventMessage.textContent = S.dropReasons.expired; return; }
      slot.url = URL.createObjectURL(blob);
      slot.image.src = slot.url;
      slot.image.dataset.displayId = event.frame.display.id;
      slot.image.dataset.frameId = event.frame.frameId;
      slot.image.dataset.eventId = event.id;
      slot.caption.textContent = `${part === 'full' ? S.previewFull : S.previewCrop} · ${S.capturedAt(new Date(event.capturedAt).toLocaleString())}`;
      slot.figure.hidden = false;
      eventMessage.textContent = '';
    } catch (error) {
      if (current()) { eventMessage.textContent = S.previewFailed(errorText(error)); eventMessage.classList.add('bad'); }
    } finally {
      if (version === slot.version) { slot.busy = false; slot.controller = null; }
      if (!signal.aborted) updateControls();
    }
  }

  updateControls();
  void refreshState();
  ctx.interval(() => void refreshState(), INTERVAL_MS);
  signal.addEventListener('abort', () => {
    clearImages(); clearCalibration();
    if (!setup.element.hidden && (preparingScreen || state?.calibrationDisplayId)) {
      void ctx.invoke('cancelCalibration', []).catch(() => {});
    }
  }, { once: true });
  return sheet.el;
}
