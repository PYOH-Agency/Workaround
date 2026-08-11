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

/**
 * Un point d'entree se reconnait a ce qu'il contient, pas a son nom.
 *
 * Une liste de noms de fichiers ne couvre que ce qu'elle enumere : une action
 * colocalisee dans `mutations.ts` echappait au controle tout en restant
 * appelable par n'importe quel compte connecte. `'use server'` est ce que le
 * runtime lit, donc la seule marque qui ne puisse pas etre contournee par un
 * renommage. Les pages, layouts et routes s'y ajoutent : eux, c'est Next qui
 * les nomme.
 */
const ROUTED = ['page', 'layout', 'route']
const SERVER_ACTION = /(?:^|[\s;{])['"]use server['"]/

/**
 * Ce que le fichier expose au reseau, et ce qu'il garde.
 *
 * `source.includes('currentStaff')` se contentait de l'`import` — un fichier
 * pouvait exporter trois actions et n'en garder aucune. On compte donc des
 * APPELS, et on en exige un par export : `attestations/actions.ts` en expose
 * deux, et une seule verification y laissait la seconde ouverte.
 *
 * Le plancher a un : une page dont la fonction n'est pas `async` n'exporte
 * aucune entree au sens de ce compte, et n'en reste pas moins un ecran servi.
 */
const ENTRY = /export\s+(?:default\s+)?async\s+function\b/g
const CALL = new RegExp(`\\b${GUARD}\\s*\\(`, 'g')

const count = (source, pattern) => source.match(pattern)?.length ?? 0

const violations = []

for (const file of trackedFiles(['.ts', '.tsx'])) {
  if (!file.startsWith(ADMIN)) continue

  const source = stripComments(read(file))
  const base = file.slice(file.lastIndexOf('/') + 1).replace(/\.tsx?$/, '')
  if (!SERVER_ACTION.test(source) && !ROUTED.includes(base)) continue

  const required = Math.max(count(source, ENTRY), 1)
  const guarded = count(source, CALL)

  if (guarded < required) {
    violations.push(
      `${file} — ${guarded} appel(s) a ${GUARD}() pour ${required} entrée(s) : le reste est ouvert`,
    )
  }
}

process.exit(report('Garde du back-office', violations))
