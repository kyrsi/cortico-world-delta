import type { ObserverViewContext } from './observer.ts';
import type { DeltaState } from '../protocol.ts';

export function desktopSetup(ctx: ObserverViewContext, render: (state: DeltaState) => void) {
  const zh = ctx.language === 'zh' || ctx.language === 'zh-Hant';
  const text = zh ? {
    title: '屏幕授权', select: '刷新屏幕列表', placeholder: '请选择游戏所在的屏幕', loading: '正在读取屏幕列表…', empty: '未找到屏幕，请检查显示器连接后刷新。',
    allow: '允许持续查看所选屏幕', revoke: '撤销授权并停止',
    note: '选择游戏屏幕并授权 → 一键校准并保存 → 开始观察。仅读取选定屏幕，并按回应设置将观察事件及截图发送给你配置的模型；不读取其他屏幕，不操作键鼠。停止或重启后需重新授权。',
    granted: '所选屏幕已授权', pending: '请先选择屏幕并授权',
  } : {
    title: 'Screen permission', select: 'Refresh displays', placeholder: 'Select your game display', loading: 'Loading displays…', empty: 'No displays found. Check the connection and refresh.',
    allow: 'Allow continuous viewing of this display', revoke: 'Revoke and stop',
    note: 'Select your game display and grant access → calibrate and save → start observation. Only the selected display is read. Observation events and screenshots are sent to your configured model according to response settings. Other displays are not read, and no keyboard or mouse input is sent. Stopping or restarting requires consent again.',
    granted: 'Selected display authorized', pending: 'Select a display and grant access',
  };
  const { ui, signal } = ctx;
  const element = ui.h('section', 'delta-screen-permission'); element.hidden = true;
  const select = ui.h('select'); select.setAttribute('aria-label', text.placeholder);
  const placeholder = ui.h('option', '', text.placeholder); placeholder.value = ''; select.append(placeholder);
  const message = ui.h('p', 'delta-note'); message.setAttribute('role', 'status');
  let busy = false, state: DeltaState | undefined, requested = false, error = '', loading = false;
  async function action(work: () => Promise<void>) {
    if (busy) return;
    busy = true; error = ''; update();
    try { await work(); } catch (failure) { if (!signal.aborted) error = failure instanceof Error ? failure.message : String(failure); }
    finally { busy = false; if (!signal.aborted) update(); }
  }
  async function loadDisplays() { await action(async () => {
    loading = true; update();
    try {
    const displays = await ctx.invoke('desktopDisplays', [], signal);
    if (signal.aborted) return;
    const selected = select.value || state?.desktop?.displayId || '';
    select.replaceChildren(placeholder);
    for (const d of displays) { const option = ui.h('option', '', `${d.id} · ${d.bounds.width} × ${d.bounds.height}`); option.value = d.id; select.append(option); }
    select.value = displays.some(d => d.id === selected) ? selected : '';
    if (!displays.length) error = text.empty;
    } finally { loading = false; }
  }); }
  const list = ui.button(text.select, { onClick: () => void loadDisplays() });
  const allow = ui.button(text.allow, { onClick: () => void action(async () => {
    const next = await ctx.invoke('desktopAuthorize', [select.value], signal);
    if (!signal.aborted) render(next);
  }) });
  const revoke = ui.button(text.revoke, { onClick: () => void action(async () => {
    const next = await ctx.invoke('desktopRevoke', [], signal);
    if (!signal.aborted) render(next);
  }) });
  list.classList.add('delta-screen-action');
  revoke.classList.add('delta-screen-action');
  function update() {
    element.hidden = !state?.desktop;
    list.disabled = select.disabled = busy;
    message.textContent = error || (loading ? text.loading : state?.desktop?.permitted ? `${text.granted}: ${state.desktop.displayId}` : text.pending);
    allow.disabled = busy || !select.value;
    revoke.hidden = !state?.desktop?.permitted; revoke.disabled = busy;
  }
  select.addEventListener('change', update, { signal });
  const displayRow = ui.h('div', 'delta-display-row');
  const label = ui.h('label', 'delta-display-label', zh ? '观察屏幕' : 'Observation display');
  label.append(select);
  displayRow.append(label, list);
  const permissionRow = ui.h('div', 'delta-permission-row');
  permissionRow.append(allow, revoke, message);
  element.append(displayRow, permissionRow, ui.h('p', 'delta-note delta-permission-note', text.note));
  return { element, focus() { element.scrollIntoView({ block: 'center', behavior: 'smooth' }); (select.disabled ? list : select).focus(); }, render(next: DeltaState) {
    state = next; update();
    if (next.desktop && !requested) { requested = true; void loadDisplays(); }
  } };
}
