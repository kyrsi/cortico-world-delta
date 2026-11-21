import type { WebUiClientBundle } from 'cortico/web/shared/client-panel.ts';
import type { WebUiManifest } from 'cortico/web/shared/webui-protocol.ts';
import { observerView } from './observer.ts';

const bundle: WebUiClientBundle = {
  panels: {
    observer: {
      mount(ctx) {
        ctx.root.append(observerView({
          ui: ctx.ui, signal: ctx.signal, language: ctx.language,
          interval: (fn, ms) => { ctx.interval(fn, ms); },
          invoke: (method, args) => ctx.invoke(method, args),
          invokeBinary: (id, part) => ctx.invokeBinary('eventImage', [id, part]),
          invokePreviewBinary: (frameId) => ctx.invokeBinary('detectionPreviewImage', [frameId]),
          availability: async () => {
            const response = await fetch('/api/webui/manifest', { signal: ctx.signal, headers: { 'x-cortico-language': ctx.language } });
            const manifest = await response.json() as WebUiManifest & { error?: string };
            if (!response.ok) throw new Error(manifest.error ?? `HTTP ${response.status}`);
            const page = manifest.providers.find((entry) => entry.id === 'world:delta');
            return page ? { kind: page.availability, reason: page.reason } : { kind: 'absent' };
          },
        }));
      },
    },
  },
};
export default bundle;
