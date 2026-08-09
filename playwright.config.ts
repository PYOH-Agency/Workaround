import { defineConfig, devices } from '@playwright/test'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    // La MEME adresse que `baseURL`. Les dissocier laissait `reuseExistingServer`
    // se raccrocher a n'importe quel serveur ecoutant sur le port par defaut —
    // y compris celui d'un autre arbre de travail, qui aurait fait passer le
    // parcours sur du code qui n'est pas le sien.
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
