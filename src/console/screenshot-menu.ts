import type { Language } from 'cortico/core/language.ts';
import type { WebUi } from 'cortico/web/shared/client-panel.ts';
import type { DeltaScreenshotRevealRequest } from '../protocol.ts';
import { screenshotText } from './strings-screenshots.ts';

type ReadScreenshot = () => DeltaScreenshotRevealRequest | null;

export interface ScreenshotMenu {
  bind(image: HTMLImageElement, readScreenshot: ReadScreenshot, surface?: HTMLElement): void;
  dismissFor(image: HTMLImageElement): void;
}

export function screenshotMenu(panel: HTMLElement, ui: WebUi, language: Language, signal: AbortSignal,
  invoke: (request: DeltaScreenshotRevealRequest) => Promise<unknown>): ScreenshotMenu {
  const doc = panel.ownerDocument;
  const win = doc.defaultView!;
  const text = screenshotText(language);
  const menu = ui.h('div', 'delta-screenshot-menu');
  menu.dataset.screenshotMenu = '';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const action = ui.button(text.reveal, { size: 'sm', onClick: () => void reveal() });
  action.setAttribute('role', 'menuitem');
  action.tabIndex = -1;
  action.dataset.screenshotMenuAction = 'reveal';
  menu.append(action);
  panel.append(menu);

  let selected: { image: HTMLImageElement; request: DeltaScreenshotRevealRequest; current(): boolean } | null = null;

  function close(restoreFocus = false): void {
    const previous = selected;
    selected = null;
    menu.hidden = true;
    if (restoreFocus && previous?.current()) previous.image.focus({ preventScroll: true });
  }
  async function reveal(): Promise<void> {
    const item = selected;
    if (!item || signal.aborted) return;
    close(true);
    if (!item.current()) { ui.toast(text.failed, 'bad'); return; }
    try {
      await invoke(item.request);
    } catch (error) {
      if (!signal.aborted) ui.toast(error instanceof Error && error.message ? error.message : text.failed, 'bad');
    }
  }
  function bind(image: HTMLImageElement, readScreenshot: ReadScreenshot, surface = image): void {
    image.tabIndex = 0;
    image.setAttribute('aria-haspopup', 'menu');
    const visible = () => image.isConnected && !image.closest('[hidden], details:not([open])');
    function open(x: number, y: number): boolean {
      const src = image.getAttribute('src');
      if (!src || !visible()) return false;
      const request = readScreenshot();
      if (!request) return false;
      selected = { image, request, current: () => {
        if (!visible() || image.getAttribute('src') !== src) return false;
        const current = readScreenshot();
        if (!current || current.kind !== request.kind || current.frameId !== request.frameId) return false;
        return request.kind === 'preview' || (current.kind === 'event' && current.eventId === request.eventId && current.part === request.part);
      } };
      menu.setAttribute('aria-label', image.alt);
      menu.hidden = false;
      const edge = 6;
      menu.style.left = `${Math.max(edge, Math.min(x, win.innerWidth - menu.offsetWidth - edge))}px`;
      menu.style.top = `${Math.max(edge, Math.min(y, win.innerHeight - menu.offsetHeight - edge))}px`;
      action.focus({ preventScroll: true });
      return true;
    }

    surface.addEventListener('contextmenu', (event) => {
      if (event.defaultPrevented || !open(event.clientX, event.clientY)) return;
      event.preventDefault();
      event.stopPropagation();
    }, { signal });
    image.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.repeat || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))) return;
      const bounds = image.getBoundingClientRect();
      if (open(bounds.left, bounds.top + 12)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { signal });
  }
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }, { signal });
  menu.addEventListener('focusout', (event) => {
    if (selected && !menu.contains(event.relatedTarget as Node | null)) close();
  }, { signal });
  const outside = (event: Event) => { if (selected && !event.composedPath().includes(menu)) close(); };
  doc.addEventListener('pointerdown', outside, { capture: true, signal });
  doc.addEventListener('click', outside, { capture: true, signal });
  doc.addEventListener('scroll', () => { if (selected) close(); }, { capture: true, passive: true, signal });
  win.addEventListener('resize', () => { if (selected) close(); }, { signal });
  signal.addEventListener('abort', () => close(), { once: true });
  return { bind, dismissFor(image) { if (selected?.image === image) close(); } };
}
