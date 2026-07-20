import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@bidilens/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@bidilens/dom': fileURLToPath(new URL('./packages/dom/src/index.ts', import.meta.url)),
      '@bidilens/html': fileURLToPath(new URL('./packages/html/src/index.ts', import.meta.url)),
      '@bidilens/markdown': fileURLToPath(new URL('./packages/markdown/src/index.ts', import.meta.url)),
      '@bidilens/react': fileURLToPath(new URL('./packages/react/src/index.tsx', import.meta.url))
    }
  },
  test: {
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx', 'action/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.{ts,tsx}', 'action/src/**/*.{ts,tsx}'],
      thresholds: {
        lines: 80,
        statements: 75,
        functions: 75,
        branches: 65,
        'packages/core/src/**.ts': { lines: 90 }
      }
    }
  }
});
