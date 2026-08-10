import { trackedFiles, read, stripComments, report } from './lib/sources.mjs'

/**
 * Tout ecran interne verifie qu'il parle a un relecteur.
 *
 * Le layout de `(admin)` pose deja le garde, mais **un layout ne s'interpose
 * pas devant une server action** : une action qui oublie `currentStaff` est
 * appelable par n'importe quel compte connecte. Et une page qui l'oublie
 * dependrait d'un layout qu'un refactor peut deplacer.
 *
 * La relecture ne tient pas contre l'oubli, un controle si. Meme forme que
 * `check-feature-isolation` : ce qui est structurel se verifie, pas se
 * recommande.
 */
const ADMIN = 'src/app/(admin)/'
const GUARD = 'currentStaff'

const violations = []

for (const file of trackedFiles(['.ts', '.tsx'])) {
  if (!file.startsWith(ADMIN)) continue

  const base = file.slice(file.lastIndexOf('/') + 1)
  // Seuls les points d'entree du serveur. Les composants qu'ils rendent sont
  // atteints par eux, jamais directement.
  if (!['page.tsx', 'layout.tsx', 'route.ts', 'actions.ts'].includes(base)) continue

  const source = stripComments(read(file))
  if (!source.includes(GUARD)) {
    violations.push(`${file} — n'appelle pas ${GUARD}() : cet écran est ouvert`)
  }
}

process.exit(report('Garde du back-office', violations))
