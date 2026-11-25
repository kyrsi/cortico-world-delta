import type { DeltaPanelMethods, DeltaState } from '../protocol.ts';
import type { ObserverViewContext } from './observer.ts';
import { identityText } from './strings-identity.ts';
import { calibrationText } from './strings-calibration.ts';
import { detectionText } from './strings-detection.ts';
import { calibrationHint, describeControl } from './calibration-help.ts';

export function identityCalibration(ctx: ObserverViewContext, saveNickname: (nickname: string) => Promise<string>, onChange: () => void,
  refreshState: () => Promise<void>) {
  const { ui, language, signal } = ctx;
  const T = identityText(language), C = calibrationText(language), D = detectionText(language);
  const element = ui.h('section', 'delta-identity delta-calibration-section');
  const title = ui.h('h4', 'delta-calibration-title', T.playerTitle);
  const body = ui.h('div', 'delta-calibration-body');
  const controls = ui.rowbar();
  controls.classList.add('delta-identity-entry');
  const read = ui.button(T.calibrate, { variant: 'primary', onClick: begin });
  read.dataset.identityAction = 'suggest';
  const input = ui.input({ onInput: () => { edited = true; message.textContent = ''; sync(); } });
  input.maxLength = 64;
  input.placeholder = D.nickname;
  const field = ui.h('label', 'delta-identity-field', T.manual);
  field.append(input);
  const save = ui.button(T.save, { size: 'sm', onClick: () => void persist() });
  save.dataset.identityAction = 'save';
  const message = ui.h('p', 'delta-note');
  message.setAttribute('role', 'status');
  const current = ui.h('p', 'delta-identity-current delta-note');
  const commands = ui.h('div', 'delta-identity-command');
  commands.append(read, current);
  controls.append(field, save);
  const reveal = ui.button(T.debugLog, { size: 'sm', onClick: () => void revealLog() });
  reveal.dataset.identityAction = 'debug-log';
  const debugRow = ui.h('div', 'delta-identity-command');
  const retention = ui.h('span', 'delta-note', T.retention);
  describeControl(reveal, retention);
  debugRow.append(reveal, retention);
  const nicknameHelp = ui.h('p', 'delta-nickname-help', T.nicknameHelp);
  describeControl(input, nicknameHelp);
  const profileHint = calibrationHint(ui, read, T.profile, 'delta-profile-hint');
  read.setAttribute('aria-describedby', `${profileHint.id} ${retention.id}`);
  body.append(commands, profileHint, controls, nicknameHelp, message, debugRow);
  element.append(title, body);

  let active = false, locked = false, captureKey: string | null = null, saved = '';
  let debug: DeltaState['identityDebug'], revealing = false;
  let edited = false, saving = false, reading = false, sequence = 0;
  let timer: ReturnType<typeof setTimeout>;
  function sync(): void {
    read.disabled = !captureKey || locked || reading || saving;
    input.disabled = !active || locked || saving || reading;
    const nickname = input.value.trim();
    save.disabled = input.disabled || !nickname || (!debug?.pendingFrames && (!edited || nickname === saved.trim()));
    reveal.disabled = !active || !debug?.hasLog || revealing;
    const label = active ? `${T.current} · ${saved || T.empty}` : '';
    if (current.textContent !== label) current.textContent = label;
  }
  async function revealLog(): Promise<void> {
    if (reveal.disabled) return;
    revealing = true;
    sync();
    try { await ctx.invoke('identityDebugReveal', [], signal); }
    catch (error) { if (!signal.aborted) ui.toast(error instanceof Error ? error.message : D.failed, 'bad'); }
    finally { revealing = false; if (!signal.aborted) sync(); }
  }
  function begin(): void {
    if (read.disabled) return;
    reading = true;
    const attempt = ++sequence;
    const deadline = Date.now() + 3000;
    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) { void suggest(attempt); return; }
      const seconds = Math.ceil(remaining / 1000);
      message.textContent = C.countdown(seconds);
      timer = setTimeout(tick, remaining - (seconds - 1) * 1000);
    };
    message.classList.remove('bad');
    tick();
    onChange();
  }
  async function suggest(attempt: number): Promise<void> {
    message.textContent = T.reading;
    let result: DeltaPanelMethods['identitySuggest']['result'];
    try { result = await ctx.invoke('identitySuggest', [], signal); }
    catch { result = { status: 'capture-unavailable' }; }
    if (attempt !== sequence || signal.aborted) return;
    reading = false;
    if (result.status === 'candidate') {
      edited = true;
      input.value = result.nickname;
      message.textContent = T.review;
    } else {
      const failures = { 'profile-unrecognized': T.noProfile, 'nickname-unreadable': T.unreadable, 'ocr-unavailable': C.ocrUnavailable, 'capture-unavailable': C.captureUnavailable };
      const reference = result.attemptId ? ` · ${T.traceId} ${result.attemptId.slice(0, 8)}` : '';
      message.textContent = failures[result.status] + reference;
      message.classList.add('bad');
    }
    onChange();
    await refreshState();
  }
  async function persist(): Promise<void> {
    if (save.disabled) return;
    saving = true;
    message.classList.remove('bad');
    message.textContent = '';
    onChange();
    try {
      const confirmed = await saveNickname(input.value.trim());
      if (signal.aborted) return;
      edited = false;
      input.value = confirmed;
      message.textContent = `${T.saved} · ${confirmed}`;
    } catch (error) {
      if (signal.aborted) return;
      message.textContent = `${D.failed} · ${error instanceof Error ? error.message : String(error)}`;
      message.classList.add('bad');
    } finally { saving = false; if (!signal.aborted) onChange(); }
  }
  function cancelRead(): void { clearTimeout(timer); sequence++; reading = false; }
  signal.addEventListener('abort', cancelRead, { once: true });
  return { element, focus: () => (read.disabled ? input : read).focus(),
    resetDraft() { edited = false; input.value = saved; message.textContent = ''; sync(); },
    pending: () => reading || saving, update(nickname: string | undefined, source: string | null, blocked: boolean,
    debugState: DeltaState['identityDebug']) {
    if (reading && captureKey !== source) { cancelRead(); message.textContent = C.captureUnavailable; message.classList.add('bad'); }
    captureKey = source;
    active = nickname !== undefined;
    locked = blocked;
    debug = debugState;
    saved = nickname ?? '';
    if (!active) { edited = false; message.textContent = ''; }
    if (!edited && input.value !== saved) input.value = saved;
    sync();
  } };
}
