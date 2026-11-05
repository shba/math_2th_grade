import { defineConfig } from '@playwright/test'

const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174/',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'he-IL',
    actionTimeout: 10_000,
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: viewports.map((viewport) => ({ name: `${viewport.width}x${viewport.height}`, use: { viewport } })),
  webServer: {
    command: 'npx vite build --logLevel error && npx vite preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
