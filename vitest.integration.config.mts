import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Tests d'integration : ils appellent de vrais services tiers.
 *
 * Separes de la boucle de developpement — ils dependent du reseau et peuvent
 * echouer pour des raisons qui ne nous concernent pas. Mais ils sont les seuls
 * a reveler un changement de contrat cote fournisseur : un test mocke ne prouve
 * que la coherence avec nos propres fixtures.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.integration.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20_000,
  },
})
