import type { DeltaState } from '../protocol.ts';
import type { ObserverViewContext } from './observer.ts';
import { identityText } from './strings-identity.ts';
import { detectionText } from './strings-detection.ts';
import { describeControl } from './calibration-help.ts';

export function identityCalibration(ctx: ObserverViewContext, saveNickname: (nickname: string) => Promise<string>, onChange: () => void,
  _refreshState: () => Promise<void>) {
  const { ui, language, signal } = ctx;
  const T = identityText(language), D = detectionText(language);
  const element = ui.h('section', 'delta-identity delta-calibration-section');
  const title = ui.h('h4', 'delta-calibration-title', T.playerTitle);
  const body = ui.h('div', 'delta-calibration-body');
  const controls = ui.rowbar();
  controls.classList.add('delta-identity-entry');
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
  commands.append(current);
  controls.append(field, save);
  const reveal = ui.button(T.debugLog, { size: 'sm', onClick: () => void revealLog() });
  reveal.dataset.identityAction = 'debug-log';
  const debugRow = ui.h('div', 'delta-identity-command');
  const retention = ui.h('span', 'delta-note', T.retention);
  describeControl(reveal, retention);
  debugRow.append(reveal, retention);
  const nicknameHelp = ui.h('p', 'delta-nickname-help', T.nicknameHelp);
  describeControl(input, nicknameHelp);
  body.append(commands, controls, nicknameHelp, message, debugRow);
  element.append(title, body);

  let active = false, locked = false, saved = '';
  let debug: DeltaState['identityDebug'], revealing = false;
  let edited = false, saving = false;
  function sync(): void {
    input.disabled = !active || locked || saving;
    const nickname = input.value.trim();
    save.disabled = input.disabled || (!debug?.pendingFrames && (!edited || nickname === saved.trim()));
    debugRow.hidden = !debug?.hasLog;
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
      message.textContent = `${T.saved} · ${confirmed || T.empty}`;
    } catch (error) {
      if (signal.aborted) return;
      message.textContent = `${D.failed} · ${error instanceof Error ? error.message : String(error)}`;
      message.classList.add('bad');
    } finally { saving = false; if (!signal.aborted) onChange(); }
  }
  return { element, focus: () => input.focus(),
    resetDraft() { edited = false; input.value = saved; message.textContent = ''; sync(); },
    pending: () => saving, update(nickname: string | undefined, _source: string | null, blocked: boolean,
    debugState: DeltaState['identityDebug']) {
    active = nickname !== undefined;
    locked = blocked;
    debug = debugState;
    saved = nickname ?? '';
    if (!active) { edited = false; message.textContent = ''; }
    if (!edited && input.value !== saved) input.value = saved;
    sync();
  } };
}
