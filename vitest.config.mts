import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { playwright } from '@vitest/browser-playwright';

const playwrightServerDeps = [
  'playwright',
  'playwright-core',
  'chromium-bidi',
  'fsevents',
  /^playwright\//,
  /^playwright-core\//,
  /^chromium-bidi\//,
  /^fsevents\//,
];

const optimizeDepsExcludes = [
  '@vitest/browser-playwright',
  'playwright',
  'playwright-core',
  'chromium-bidi',
  'chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
  'chromium-bidi/lib/cjs/cdp/CdpConnection',
  'fsevents',
];

export default defineConfig({
  plugins: [angular(), viteTsConfigPaths()],
  optimizeDeps: {
    include: [
      '@angular/common/locales/en',
      '@angular/common/locales/es',
      '@angular/common/locales/eu',
      '@angular/common/locales/fr',
    ],
    exclude: optimizeDepsExcludes,
  },
  test: {
    globals: true,
    environment: 'node',
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    deps: {
      optimizer: {
        client: {
          enabled: false,
        },
      },
    },
    server: {
      deps: {
        external: playwrightServerDeps,
      },
    },
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts'],
    },
  },
  define: {
    'import.meta.vitest': true,
  },
});
