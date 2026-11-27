import type { Language } from 'cortico/core/language.ts';
import type { WebUi } from 'cortico/web/shared/client-panel.ts';
import { DEFAULT_GAME_ASPECT_RATIO, DELTA_GAME_ASPECT_RATIOS, type DeltaCalibrationSuggestion, type DeltaGameAspectRatio, type DeltaRoi, type DeltaState } from '../protocol.ts';
import { configGroupText } from '../i18n/config-groups.ts';
import { calibrationText } from './strings-calibration.ts';
import { calibrationHotkeyText } from './strings-hotkey.ts';
import { detectionText } from './strings-detection.ts';
import { lootText } from './strings-loot.ts';
import { dashboardText } from './strings-dashboard.ts';
import { startupText } from './strings-startup.ts';
import { observerText } from './strings.ts';
import type { ScreenshotMenu } from './screenshot-menu.ts';
import { calibrationGuide } from './calibration-guide.ts';

type Suggestion = Extract<DeltaCalibrationSuggestion, { status: 'ready' | 'inventory-ready' | 'preparation-only' }>;
type Failure = Exclude<DeltaCalibrationSuggestion['status'], Suggestion['status']> | 'source-changed' | 'expired' | 'failed';
type Stage = 'idle' | 'countdown' | 'loading' | Suggestion['status'] | 'saving' | 'saved' | Failure;
type Hotkey = DeltaState['calibrationHotkey'];
interface CaptureSource { displayId: string; topologyRevision?: string; gameAspectRatio: DeltaGameAspectRatio }

interface QuickCalibrationContext {
  ui: WebUi;
  language: Language;
  signal: AbortSignal;
  panel: HTMLElement;
  screenshots: ScreenshotMenu;
  suggest(signal: AbortSignal): Promise<DeltaCalibrationSuggestion>;
  image(frameId: string, signal: AbortSignal): Promise<Blob>;
  apply(frameId: string, signal: AbortSignal): Promise<void>;
  setAspectRatio(ratio: DeltaGameAspectRatio): Promise<void>;
  dismiss(attemptId: string): Promise<void>;
  openManual(): void;
  onChange(): void;
}

const CAPTURE_DELAY_MS = 3000;

export function quickCalibrationView(ctx: QuickCalibrationContext) {
  const { ui, language, signal, panel } = ctx;
  const doc = panel.ownerDocument;
  const T = calibrationText(language), H = calibrationHotkeyText(language), D = detectionText(language), L = lootText(language);
  const { outputNumber, capturedAt } = observerText(language);
  const startup = startupText(language);
  const settings = configGroupText(language);
  const formatTime = new Intl.DateTimeFormat(language, {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const element = ui.h('div', 'delta-quick-calibration');
  const heading = ui.h('div', 'delta-quick-calibration-command');
  const ratio = ui.select({
    options: DELTA_GAME_ASPECT_RATIOS.map((value) => ({ value, label: value })),
    onChange: () => void saveRatio(),
  });
  ratio.dataset.calibrationField = 'gameAspectRatio';
  ratio.value = DEFAULT_GAME_ASPECT_RATIO;
  const ratioField = ui.h('label', 'delta-game-aspect', settings.gameAspectRatio);
  ratioField.append(ratio);
  const ratioHint = ui.h('p', 'delta-note', settings.gameAspectRatioDescription);
  const ratioError = ui.h('span', 'delta-quick-status bad');
  ratioError.setAttribute('role', 'alert');
  const start = ui.button(T.start, { size: 'sm', onClick: begin });
  start.dataset.calibrationAction = 'suggest';
  start.setAttribute('aria-keyshortcuts', 'Control+Shift+F8');
  const shortcut = ui.h('kbd', 'delta-calibration-shortcut', 'Ctrl+Shift+F8');
  shortcut.setAttribute('aria-hidden', 'true');
  const shortcutStatus = ui.h('span', 'delta-calibration-shortcut-status');
  shortcutStatus.setAttribute('role', 'status');
  heading.append(start, shortcut, shortcutStatus, ratioField, ratioError);
  const status = ui.h('p', 'delta-quick-status');
  status.setAttribute('role', 'status');
  const instructions = ui.h('p', 'delta-note', T.prepare);
  const enable = ui.h('p', 'delta-note', T.enable);
  const manual = ui.button(dashboardText(language).calibration, { size: 'sm', onClick: () => {
    if (hotkeyAttemptId || previewFrameId) cancelAttempt();
    ctx.openManual();
  } });
  manual.dataset.calibrationAction = 'manual';
  const cancel = ui.button(T.cancel, { size: 'sm', onClick: cancelAttempt });
  cancel.dataset.calibrationAction = 'cancel';
  const actions = ui.rowbar();
  actions.classList.add('delta-quick-calibration-actions');
  actions.append(cancel, manual);

  const preview = ui.h('figure', 'delta-calibration delta-quick-preview');
  const captureCaption = ui.h('figcaption', 'delta-quick-capture delta-note');
  captureCaption.dataset.calibrationCapture = '';
  const captureDisplay = ui.h('span');
  captureDisplay.dataset.calibrationDisplay = '';
  const captureTime = ui.h('time');
  captureTime.dataset.calibrationTime = '';
  const captureResolution = ui.h('span');
  captureResolution.dataset.calibrationResolution = '';
  captureCaption.append(captureDisplay, captureResolution, captureTime);
  const previewSurface = ui.h('div', 'delta-quick-preview-surface');
  const image = ui.h('img', 'delta-calibration-image');
  image.alt = D.previewAlt;
  image.draggable = false;
  ctx.screenshots.bind(image, () => previewFrameId && expiresAtMs > Date.now() && stage !== 'saving' && stage !== 'saved'
    ? { kind: 'preview', frameId: previewFrameId } : null, previewSurface);
  const regions = [
    { key: 'feed', label: D.feed }, { key: 'personal', label: T.personal },
    { key: 'items', label: L.items }, { key: 'context', label: L.context },
    { key: 'start', label: T.startTab }, { key: 'actions', label: T.deploymentActions },
  ] as const;
  const boxes = regions.map(({ key, label }, index) => {
    const box = ui.h('div', 'delta-quick-region');
    box.dataset.calibrationRegion = key;
    box.dataset.region = key;
    box.setAttribute('aria-hidden', 'true');
    const legend = ui.h('li');
    legend.dataset.region = key;
    const marker = ui.h('span', 'delta-quick-marker', String(index + 1));
    marker.setAttribute('aria-hidden', 'true');
    const sourceLabel = ui.h('span', 'delta-quick-area-source');
    box.append(marker);
    legend.append(marker.cloneNode(true), label, sourceLabel);
    return { key, box, legend, sourceLabel };
  });
  const legend = ui.h('ul', 'delta-quick-legend');
  legend.append(...boxes.map(({ legend }) => legend));
  previewSurface.append(image, ...boxes.map(({ box }) => box));
  const preset = ui.h('p', 'delta-note');
  preview.append(captureCaption, previewSurface, legend, preset);
  const attempt = ui.h('div', 'delta-quick-attempt');
  attempt.append(status, enable, preview, actions);
  const guide = calibrationGuide(ui, language);
  element.append(heading, ratioHint, instructions, guide, attempt);

  let stage: Stage = 'idle';
  let attemptRevision = 0;
  let allowed = false, blocked = false, ratioBusy = false, expiresAtMs = 0;
  let previewFrameId: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let previewUrl: string | null = null;
  let hotkeyStatus: NonNullable<Hotkey>['status'] | undefined;
  let hotkeyAttemptId: string | null = null, ignoredHotkeyAttemptId: string | null = null;
  let hotkeyResultHandled = false;
  let captureSource: CaptureSource | undefined;
  const failures: Record<Failure, string> = {
    'unsupported-layout': T.unsupported, 'scene-unrecognized': T.unrecognized,
    'ocr-unavailable': T.ocrUnavailable, 'capture-unavailable': T.captureUnavailable,
    'source-changed': startup.reasons['display-changed'],
    expired: T.expired, failed: T.failed,
  };

  function canApply(): boolean { return stage === 'ready' || stage === 'inventory-ready'; }
  function locked(): boolean { return ratioBusy || stage === 'countdown' || stage === 'loading' || canApply() || stage === 'saving'; }
  function pending(): boolean { return ratioBusy || stage === 'saving' || (stage === 'loading' && !hotkeyAttemptId); }
  function updateControls(): void {
    const failed = stage in failures;
    const hasPreview = previewFrameId !== null;
    const label = hasPreview || failed ? T.recapture : T.start;
    if (start.textContent !== label) start.textContent = label;
    const running = stage === 'countdown' || stage === 'loading' || stage === 'saving';
    start.disabled = !allowed || blocked || ratioBusy || running;
    ratio.disabled = !captureSource || blocked || ratioBusy || running;
    preview.hidden = !hasPreview;
    cancel.textContent = stage === 'saved' ? T.closePreview : T.cancel;
    cancel.hidden = !locked() && !hotkeyAttemptId && !hasPreview;
    cancel.disabled = stage === 'saving';
    manual.hidden = !failed && stage !== 'preparation-only' && stage !== 'saved';
    manual.disabled = blocked;
    enable.hidden = stage !== 'saved';
    instructions.hidden = locked();
    guide.hidden = locked();
    attempt.hidden = stage === 'idle';
    status.classList.toggle('bad', failed);
    status.dataset.calibrationStatus = stage;
  }
  async function saveRatio(): Promise<void> {
    const value = DELTA_GAME_ASPECT_RATIOS.find((item) => item === ratio.value);
    if (!value || ratio.disabled) return;
    ratioBusy = true;
    ratioError.textContent = '';
    ctx.onChange();
    try { await ctx.setAspectRatio(value); }
    catch { if (!signal.aborted) ratioError.textContent = T.ratioFailed; }
    finally {
      ratioBusy = false;
      if (!signal.aborted) {
        ratio.value = captureSource?.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO;
        ctx.onChange();
      }
    }
  }
  function updateShortcut(hotkey: Hotkey): void {
    if (hotkeyStatus === hotkey?.status) return;
    hotkeyStatus = hotkey?.status;
    if (hotkeyStatus) shortcutStatus.dataset.calibrationHotkeyStatus = hotkeyStatus;
    else delete shortcutStatus.dataset.calibrationHotkeyStatus;
    shortcutStatus.textContent = hotkeyStatus ? H[hotkeyStatus] : '';
    instructions.textContent = hotkeyStatus === 'registered' ? H.prepare : T.prepare;
    if (hotkeyStatus === 'disabled') start.removeAttribute('aria-keyshortcuts');
    else start.setAttribute('aria-keyshortcuts', 'Control+Shift+F8');
    shortcut.hidden = hotkeyStatus === 'disabled';
  }
  function show(next: Stage, message = ''): void {
    stage = next;
    status.textContent = message;
    updateControls();
    ctx.onChange();
  }
  function clearAttempt(): void {
    attemptRevision++;
    ctx.screenshots.dismissFor(image);
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    previewFrameId = null;
    image.removeAttribute('src');
    delete image.dataset.frameId;
    captureDisplay.textContent = captureResolution.textContent = captureTime.textContent = '';
    captureTime.removeAttribute('datetime');
    drawRegions(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  function finish(next: 'idle' | Failure): void {
    const returnFocus = actions.contains(doc.activeElement);
    clearAttempt();
    show(next, next === 'idle' ? '' : failures[next]);
    if (returnFocus) (start.disabled ? panel : start).focus();
  }
  function forgetHotkeyAttempt(dismiss: boolean): void {
    if (!hotkeyAttemptId) return;
    const id = hotkeyAttemptId;
    ignoredHotkeyAttemptId = id;
    hotkeyAttemptId = null;
    hotkeyResultHandled = false;
    if (dismiss) void ctx.dismiss(id).catch(() => {});
  }
  function cancelAttempt(): void {
    forgetHotkeyAttempt(true);
    finish('idle');
  }
  function begin(): void {
    if (start.disabled || signal.aborted) return;
    forgetHotkeyAttempt(true);
    clearAttempt();
    const deadline = Date.now() + CAPTURE_DELAY_MS;
    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) { void capture(); return; }
      const seconds = Math.ceil(remaining / 1000);
      timer = setTimeout(tick, remaining - (seconds - 1) * 1000);
      show('countdown', T.countdown(seconds));
    };
    tick();
    cancel.focus();
  }
  function beginLoading(): AbortSignal {
    controller = new AbortController();
    const requestSignal = AbortSignal.any([signal, controller.signal]);
    show('loading', T.loading);
    return requestSignal;
  }
  async function capture(): Promise<void> {
    const requestSignal = beginLoading();
    try {
      if (!requestSignal.aborted) await present(await ctx.suggest(requestSignal), requestSignal);
    } catch {
      if (!requestSignal.aborted) finish('capture-unavailable');
    }
  }
  async function present(value: DeltaCalibrationSuggestion, requestSignal: AbortSignal): Promise<void> {
    if (requestSignal.aborted) return;
    const { frame, expiresAt } = value;
    if (frame === undefined) {
      finish(value.status);
      return;
    }
    try {
      expiresAtMs = Date.parse(expiresAt);
      if (expiresAtMs <= Date.now()) { expire(); return; }
      const blob = await ctx.image(frame.frameId, requestSignal);
      if (requestSignal.aborted) return;
      if (expiresAtMs <= Date.now()) { expire(); return; }
      previewFrameId = frame.frameId;
      const { display, capturedAt: timestamp } = frame;
      captureDisplay.textContent = display.systemNumber === null ? display.name : outputNumber(display.systemNumber);
      captureResolution.textContent = `${startup.resolution} ${display.bounds.width} × ${display.bounds.height}`;
      captureTime.dateTime = timestamp;
      captureTime.textContent = capturedAt(formatTime.format(new Date(timestamp)));
      const found = value.status === 'ready' || value.status === 'inventory-ready' || value.status === 'preparation-only';
      drawRegions(found ? value : null);
      previewUrl = URL.createObjectURL(blob);
      image.src = previewUrl;
      image.dataset.frameId = frame.frameId;
      timer = setTimeout(expire, expiresAtMs - Date.now());
      const revision = attemptRevision;
      await image.decode();
      if (requestSignal.aborted || revision !== attemptRevision) return;
      if (expiresAtMs <= Date.now()) { expire(); return; }
      show(value.status, found ? value.status === 'preparation-only' ? T.preparationOnly : T.verify : failures[value.status]);
      if (value.status === 'ready' || value.status === 'inventory-ready') await apply();
    } catch {
      if (!requestSignal.aborted) finish('capture-unavailable');
    }
  }
  function drawRegions(value: Suggestion | null): void {
    type Key = typeof regions[number]['key'];
    type Source = 'detected' | 'saved' | 'preset' | 'estimated';
    const overlays = new Map<Key, { area: DeltaRoi; source: Source }>();
    if (value?.status === 'ready') {
      overlays.set('feed', { area: value.combat.roi, source: value.sources.combat });
      if (value.combat.personalFeedbackRoi) overlays.set('personal', { area: value.combat.personalFeedbackRoi, source: value.sources.combat });
    }
    if (value && value.status !== 'preparation-only') {
      overlays.set('items', { area: value.loot.itemsRoi, source: value.sources.loot });
      overlays.set('context', { area: value.loot.contextRoi, source: value.sources.loot });
    }
    if (value && value.status !== 'inventory-ready' && value.anchors) {
      overlays.set('start', { area: value.anchors.start, source: 'detected' });
      overlays.set('actions', { area: value.anchors.actions, source: 'detected' });
    }
    legend.hidden = overlays.size === 0;
    preset.hidden = value?.status !== 'ready' || (value.sources.combat !== 'estimated' && value.sources.loot !== 'estimated');
    preset.textContent = preset.hidden ? '' : T.estimateHint;
    for (const { key, box, legend: item, sourceLabel } of boxes) {
      const overlay = overlays.get(key);
      box.hidden = item.hidden = !overlay;
      if (!overlay) continue;
      const { area, source } = overlay;
      box.dataset.source = item.dataset.source = source;
      sourceLabel.textContent = source === 'saved' ? T.savedArea : T[source];
      box.style.left = `${area.x * 100}%`;
      box.style.top = `${area.y * 100}%`;
      box.style.width = `${area.width * 100}%`;
      box.style.height = `${area.height * 100}%`;
    }
  }
  function expire(): void {
    forgetHotkeyAttempt(true);
    finish('expired');
  }
  async function apply(): Promise<void> {
    if (!canApply() || !allowed || blocked || ratioBusy || !previewFrameId || signal.aborted) return;
    if (expiresAtMs <= Date.now()) { expire(); return; }
    const frameId = previewFrameId;
    const revision = attemptRevision;
    const applySignal = controller ? AbortSignal.any([signal, controller.signal]) : signal;
    clearTimeout(timer);
    show('saving', T.saving);
    try {
      await ctx.apply(frameId, applySignal);
      if (!applySignal.aborted && revision === attemptRevision) {
        forgetHotkeyAttempt(false);
        show('saved', T.saved);
      }
    } catch {
      if (!applySignal.aborted && revision === attemptRevision) finish('failed');
    }
  }

  function syncHotkeyAttempt(hotkey: Hotkey): void {
    if (!allowed || blocked || ratioBusy || stage === 'saving' || signal.aborted) return;
    const next = hotkey?.attempt;
    if (hotkeyAttemptId && hotkeyAttemptId !== next?.id) {
      forgetHotkeyAttempt(false);
      if (!next && (locked() || previewFrameId)) finish('expired');
    }
    if (!next || next.id === ignoredHotkeyAttemptId) return;
    if (hotkeyAttemptId !== next.id) {
      clearAttempt();
      hotkeyAttemptId = next.id;
    }
    if (next.result.status === 'capturing') {
      if (stage !== 'loading') show('loading', T.loading);
      return;
    }
    if (hotkeyResultHandled) return;
    hotkeyResultHandled = true;
    void present(next.result, beginLoading());
  }

  image.addEventListener('error', () => {
    if (stage === 'saved') { status.textContent = T.previewFailed; return; }
    if (previewFrameId && stage !== 'saving') finish('capture-unavailable');
  }, { signal });
  doc.addEventListener('keydown', (event) => {
    if (start.disabled || hotkeyStatus === 'registered' || hotkeyStatus === 'disabled' || event.defaultPrevented || event.repeat || event.isComposing
      || event.key !== 'F8' || !event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return;
    if (!panel.isConnected || doc.hidden || panel.closest('[hidden], [inert], [aria-hidden="true"]')
      || panel.checkVisibility?.({ visibilityProperty: true }) === false) return;
    if (event.composedPath().some((target) => target instanceof Element
      && target.matches('input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])'))) return;
    event.preventDefault();
    begin();
  }, { signal });
  signal.addEventListener('abort', clearAttempt, { once: true });
  drawRegions(null);
  updateControls();
  return { element, locked, pending, update(enabled: boolean, isBusy: boolean, hotkey?: Hotkey, source?: CaptureSource) {
    allowed = enabled;
    blocked = isBusy;
    updateShortcut(hotkey);
    const sourceChanged = source && captureSource && (source.displayId !== captureSource.displayId
      || (source.topologyRevision && captureSource.topologyRevision && source.topologyRevision !== captureSource.topologyRevision));
    const ratioChanged = captureSource && source && captureSource.gameAspectRatio !== source.gameAspectRatio;
    captureSource = source;
    if (!ratioBusy) ratio.value = source?.gameAspectRatio ?? DEFAULT_GAME_ASPECT_RATIO;
    if (ratioChanged && (locked() || previewFrameId)) {
      forgetHotkeyAttempt(false);
      finish('idle');
    } else if ((!enabled || sourceChanged) && (locked() || previewFrameId)) {
      forgetHotkeyAttempt(false);
      finish(enabled ? 'source-changed' : 'capture-unavailable');
    } else {
      syncHotkeyAttempt(hotkey);
      updateControls();
    }
  } };
}
