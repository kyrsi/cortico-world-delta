import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const options = {
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  logLevel: 'info',
};

await build({
  ...options,
  entryPoints: { console: 'src/console/client.ts' },
  platform: 'browser',
  target: 'es2022',
  loader: { '.png': 'dataurl' },
  minify: true,
});

await build({
  ...options,
  entryPoints: { index: 'src/index.ts', 'engine-child': 'src/engine-child.ts', 'official-capture': 'src/official-capture.ts' },
  platform: 'node',
  target: 'node22',
  external: ['cortico/*'],
});
