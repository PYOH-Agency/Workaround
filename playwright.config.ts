import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

/**
 * `.env.test` est lu ici, et pas seulement par les fixtures.
 *
 * Ce fichier est evalue avant tout test, donc avant que quoi que ce soit
 * n'importe `fixtures-db`. Sans cette ligne, `APP_URL` restait indefini et
 * `baseURL` retombait sur 3000 — le port du worktree principal. Les parcours
 * s'executaient alors contre l'application d'un autre arbre de travail,
 * branchee sur une autre base, et repondaient 200 a tout.
 */
config({ path: '.env.test', quiet: true })

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
