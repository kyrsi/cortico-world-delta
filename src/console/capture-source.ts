import type { CuaDisplay } from 'cortico-world-desktop-pet';
import type { DeltaState } from '../protocol.ts';
import type { ObserverViewContext } from './observer.ts';
import { captureText } from './strings-capture.ts';
import { setupText } from './strings-setup.ts';
import { calibrationText } from './strings-calibration.ts';

export function captureSourcePicker(
  ctx: ObserverViewContext, label: (display: CuaDisplay) => string,
  start: (displayId: string, trigger: HTMLButtonElement, calibration: boolean) => void,
  selected: () => void, cancel: () => void,
) {
  const { ui, signal } = ctx;
  const T = captureText(ctx.language);
  const element = ui.h('div', 'delta-screen-permission');
  const controls = ui.rowbar();
  const select = ui.select({ options: [], onChange: () => { sync(); selected(); } });
  select.setAttribute('aria-label', T.choose);
  const refresh = ui.button(T.refresh, { size: 'sm', onClick: () => void load() });
  const grant = ui.button(T.grant, { size: 'sm', variant: 'primary', onClick: () => {
    if (!grant.disabled && select.value) start(select.value, grant, mode === 'calibration');
  } });
  grant.dataset.sourceGrant = '';
  const preparation = setupText(ctx.language).grant;
  const consent = ui.h('p', 'delta-note', T.consent);
  const pauseCapture = ui.h('p', 'delta-note', T.pauseCapture);
  pauseCapture.dataset.capturePause = '';
  const message = ui.h('p', 'delta-note');
  const dismiss = ui.button(calibrationText(ctx.language).cancel, { size: 'sm', onClick: cancel });
  dismiss.dataset.sourceCancel = '';
  message.setAttribute('role', 'status');
  controls.append(select, refresh, grant, dismiss);
  element.append(consent, pauseCapture, controls, message);
  element.hidden = true;
  let state: DeltaState | null = null;
  let displays: CuaDisplay[] = [];
  let locked = false, loading = false, listed = false, revision = 0;
  let mode: 'closed' | 'calibration' | 'observe' = 'closed';

  function sync(): void {
    const granted = !!state?.standaloneGranted;
    controls.hidden = granted;
    select.disabled = loading || locked || select.options.length <= 1;
    refresh.disabled = loading || locked;
    const calibration = mode === 'calibration';
    dismiss.hidden = mode !== 'observe';
    dismiss.disabled = locked;
    const label = calibration ? preparation : T.grant;
    if (grant.textContent !== label) grant.textContent = label;
    consent.hidden = calibration;
    grant.disabled = granted || loading || locked || !select.value || (calibration
      ? state?.calibrationDisplayId === select.value : state?.startBlockedReason === 'no-image-model');
  }
  async function load(): Promise<void> {
    if (!state || loading || signal.aborted) return;
    const expected = ++revision;
    const preferred = listed ? select.value : state.calibrationDisplayId || state.configuredDisplayId;
    listed = true;
    loading = true;
    message.textContent = '';
    sync();
    try {
      const available = await ctx.invoke('listStandaloneDisplays', [], signal);
      if (expected !== revision || signal.aborted) return;
      displays = available;
      const placeholder = ui.h('option', null, T.choose);
      placeholder.value = '';
      select.replaceChildren(placeholder, ...displays.map((display) => {
        const option = ui.h('option', null, label(display));
        option.value = display.id;
        return option;
      }));
      select.value = displays.some((display) => display.id === preferred) ? preferred : '';
      if (!displays.length) message.textContent = T.empty;
    } catch (error) {
      if (expected !== revision || signal.aborted) return;
      displays = [];
      select.replaceChildren();
      message.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      if (expected === revision && !signal.aborted) { loading = false; sync(); selected(); }
    }
  }
  return { element, grant, display: () => select.value, displayInfo: () => displays.find(display => display.id === select.value),
    focus() { (grant.disabled && !select.disabled ? select : !grant.disabled ? grant : refresh).focus(); },
    update(next: DeltaState | null, isLocked: boolean, nextMode: typeof mode) {
    const previous = state;
    mode = nextMode;
    state = next?.captureMode === 'standalone' ? next : null;
    locked = isLocked;
    element.hidden = !state || (!state.standaloneGranted && mode === 'closed');
    if (previous && (!state || previous.standaloneGranted !== state.standaloneGranted)) {
      revision++;
      loading = listed = false;
      displays = [];
      select.replaceChildren();
      message.textContent = '';
    }
    if (!element.hidden && state && !state.standaloneGranted && !listed) void load();
    sync();
  } };
}
