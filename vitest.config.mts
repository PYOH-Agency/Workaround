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

    /**
     * Quatre fichiers a la fois, pas un par coeur.
     *
     * La quasi-totalite de ces tests attaque le MEME Postgres. Laisse libre,
     * Vitest ouvre un processus par coeur, chacun avec son pool de connexions,
     * et la base devient le goulot : les tests expirent a 5 s par dizaines,
     * jamais les memes, en designant du code parfaitement sain. Constate sur
     * une machine ou d'autres piles tournaient — 32 expirations sans borne, 0
     * avec.
     *
     * Le plafond ne ralentit presque rien : c'est l'attente de la base qui
     * domine, pas le calcul. Le relever ne fera gagner que des secondes, et
     * ramenera le defaut le jour ou la machine sera chargee.
     */
    maxWorkers: 4,
  },
})
