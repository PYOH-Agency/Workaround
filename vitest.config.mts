import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Les tests d'integration touchent le reseau et des services tiers : ils ne
    // font pas partie de la boucle de developpement (`pnpm test:integration`).
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
