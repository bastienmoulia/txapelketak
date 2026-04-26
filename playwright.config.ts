import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

declare const process: {
  env: Record<string, string | undefined>;
};

const isCI = Boolean(process.env['CI']);
const isGitHubActions = Boolean(process.env['GITHUB_ACTIONS']);
const ciWorkers = Number(process.env['PLAYWRIGHT_CI_WORKERS'] ?? 4);
const ciRetries = Number(process.env['PLAYWRIGHT_CI_RETRIES'] ?? 1);
const reporter: ReporterDescription[] = isGitHubActions
  ? [['github'], ['html'], ['dot']]
  : [['list'], ['html']];

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? ciRetries : 0,
  /* Keep CI parallel by default; override with PLAYWRIGHT_CI_WORKERS when needed. */
  workers: isCI ? ciWorkers : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter,
  /* Global timeout for each test */
  timeout: 30000,
  /* Increased assertion timeout to handle slow Firebase emulator and Angular operations on CI. */
  expect: {
    timeout: 10000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? 'http://localhost:4200',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take a screenshot on test failure */
    screenshot: 'only-on-failure',

    /* Record video on test failure */
    video: 'retain-on-failure',
  },

  /* Start dev server automatically when not launched via ng e2e */
  webServer: {
    command: 'npm run serve:test -- --no-open',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});
