import { build } from 'tsup';

const shared = {
  format: ['esm'],
  dts: true,
  sourcemap: true,
  target: 'es2022'
};

// Run sequentially: a concurrent clean could erase the standalone output.
await build({
  ...shared,
  entry: ['src/index.ts'],
  clean: true
});

await build({
  ...shared,
  entry: { standalone: 'src/standalone.ts' },
  clean: false,
  minify: true,
  noExternal: ['@bidilens/core']
});
