import { defineConfig, devices } from '@playwright/test'

// Smoke test: plays every lesson start to finish in a production build.
// Fails on missing narration audio (set ALLOW_TTS_FALLBACK=1 while audio isn't generated yet),
// console errors, and any request to another site.
export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  projects: [
    { name: 'iPad', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' } },
    { name: 'iPhone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: { command: 'npm run preview -- --port 4173 --host 127.0.0.1 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
})
