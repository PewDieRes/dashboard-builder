import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 30_000,
    reporter: [['list']],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8080',
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        trace: 'retain-on-failure',
    },
});
