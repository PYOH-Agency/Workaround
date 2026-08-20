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
     * et la base devient le goulot : les tests expirent par dizaines, jamais
     * les memes, en designant du code parfaitement sain. Constate sur une
     * machine ou d'autres piles tournaient — 32 expirations sans borne, 0 avec.
     *
     * Le plafond ne ralentit presque rien : c'est l'attente de la base qui
     * domine, pas le calcul.
     *
     * Va de pair avec les deux delais ci-dessous, qui traitent le meme mal par
     * l'autre bout : la borne reduit la contention, le delai absorbe ce qui en
     * reste. Retirer l'une ramene les grappes d'echecs que l'autre seule ne
     * suffisait pas a empecher.
     */
    maxWorkers: 4,
    /**
     * Le budget par defaut de vitest est de 5 s, et il a ete ecrit pour des
     * tests purs. La moitie de cette suite n'en est pas : `tests/services` et
     * `tests/lib` parlent a un vrai Postgres, et un seul d'entre eux y cree une
     * entreprise, un chantier, un devis et ses lignes.
     *
     * Sur une machine chargee, ces allers-retours passent de 200 ms a plusieurs
     * secondes — et la suite se mettait a echouer par grappes, sur des tests
     * differents a chaque passage, jamais sur une assertion. Un test qui met six
     * secondes au lieu de deux cents millisecondes n'a rien prouve de faux :
     * c'est le plafond qui etait trop bas, pas le code qui a regresse.
     *
     * Un delai maximal n'est pas une attente : les tests sains gardent leurs
     * quelques millisecondes. Il ne coute qu'au moment ou une vraie boucle
     * infinie se declare — et vingt secondes suffisent a la reveler.
     *
     * Meme valeur que `vitest.integration.config.mts`, pour la meme raison
     * qu'elle y figure : une dependance exterieure au processus de test.
     */
    testTimeout: 20_000,
    /**
     * Les `beforeAll` de cette suite remettent des tables a zero et rechargent
     * un jeu de donnees : ils sont plus lourds que les tests eux-memes, et l'un
     * d'eux a deja depasse les 10 s par defaut.
     */
    hookTimeout: 30_000,
  },
})
