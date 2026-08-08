import path from 'node:path'
import { trackedFiles, read, stripComments, lineAt, report } from './lib/sources.mjs'

/**
 * Une fonctionnalite est autonome : elle depend d'elle-meme et des couches
 * partagees (`domain`, `services`, `lib`, `db`, `pdf`, `ui`), jamais d'une
 * autre fonctionnalite.
 *
 * Le jour ou `factures` importe depuis `devis`, les deux ne se comprennent plus
 * ni ne se testent isolement, et le decoupage en modules de la spec (§7) n'est
 * plus qu'une intention. Le besoin partage remonte dans une couche partagee —
 * c'est la seule reponse.
 */
const APP = 'src/app/'

const SHARED_LAYERS = ['src/actions/', 'src/domain/', 'src/services/', 'src/lib/', 'src/db/']

const IMPORT = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g

/**
 * La fonctionnalite a laquelle appartient un chemin : le premier segment sous
 * `src/app` qui ne soit pas un groupe de routes. `src/app/layout.tsx` n'en a
 * aucune, `src/app/(app)/devis/[id]/page.tsx` appartient a `devis`.
 */
function featureOf(modulePath) {
  if (!modulePath.startsWith(APP)) return null
  const directories = modulePath.slice(APP.length).split('/').slice(0, -1)
  const [feature] = directories.filter((segment) => !/^\(.*\)$/.test(segment))
  return feature ?? null
}

/** Chemin depot d'un specificateur interne ; `null` pour une dependance externe. */
function resolve(fromFile, specifier) {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`
  if (!specifier.startsWith('.')) return null
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier))
}

const violations = []

for (const file of trackedFiles(['.ts', '.tsx'])) {
  if (!file.startsWith('src/')) continue

  const source = stripComments(read(file))
  const feature = featureOf(file)

  for (const match of source.matchAll(IMPORT)) {
    const target = resolve(file, match[1])
    if (!target) continue

    const line = `${file}:${lineAt(source, match.index)}`
    const targetFeature = featureOf(target)

    if (feature && targetFeature && targetFeature !== feature) {
      violations.push(
        `${line} — « ${feature} » importe « ${targetFeature} » (${match[1]}) : ` +
          `remonter le besoin partage dans ${SHARED_LAYERS.join(', ')}`,
      )
    }

    if (!feature && !file.startsWith(APP) && targetFeature) {
      violations.push(
        `${line} — une couche partagee importe la fonctionnalite « ${targetFeature} » (${match[1]})`,
      )
    }
  }
}

process.exit(report('Autonomie des fonctionnalites', violations))
