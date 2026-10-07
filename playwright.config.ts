import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'pnpm dev:local', url: 'http://localhost:4000/health', reuseExistingServer: true },
    { command: 'pnpm dev:web', url: 'http://localhost:8081', reuseExistingServer: true },
  ],
});
