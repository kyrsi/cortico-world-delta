import type { Language } from 'cortico/core/language.ts';
import type { WorldDefinition } from 'cortico/world.ts';
import { DELTA_DEFAULTS, deltaConfigOptions, type DeltaConfigSection } from './config.ts';
import { deltaText } from './i18n/index.ts';
import { DeltaWorld, type DeltaWorldOptions } from './world.ts';

export interface DeltaAssembly extends Pick<DeltaWorldOptions, 'binding' | 'frameSourceModule' | 'modelLanguage' | 'calibrationOperation' | 'screenshotReveal' | 'random'> {
  language?(): Language;
  onCreate?(world: DeltaWorld): void;
}
export function deltaDefinition(assembly: DeltaAssembly = {}): WorldDefinition<DeltaConfigSection> {
  return { id: 'delta', get label() { return deltaText(assembly.language?.()).title; },
    describe: { tools: [], events: [{ type: 'delta.observation', trigger: 'debounce',
      description: { zh: '校准区域的观察结果及同帧完整截图与裁图', en: 'Observations from calibrated regions with full and cropped images from one frame' } }] },
    defaults: () => structuredClone(DELTA_DEFAULTS), configOptions: deltaConfigOptions, create: (ctx) => {
      const world = new DeltaWorld({ ...assembly, cfg: ctx.cfg, dataDir: ctx.dataDir, persist: (patch) => ctx.persist(patch) });
      assembly.onCreate?.(world); return world;
    } };
}
export const DELTA = deltaDefinition();
export default DELTA;
