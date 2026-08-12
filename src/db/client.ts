import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * L'adresse de la base, ou un refus qui se lit.
 *
 * Sans ce garde, `postgres(undefined)` leve a l'import du module — donc avant
 * tout rendu, sur toute route qui touche la base, c'est-a-dire la racine. Le
 * deploiement rend alors « Internal Server Error » et rien d'autre : ni la
 * variable en cause, ni meme l'indication qu'il s'agit d'un defaut de
 * configuration. Il a fallu une construction a blanc, en local, pour retrouver
 * laquelle manquait.
 *
 * Meme discipline que `SECRET_KEY` dans `lib/secrets.ts` : on refuse
 * bruyamment plutot que de se rabattre. La difference tient au message — celui
 * qui lit ce journal a une heure du matin doit y trouver le nom de ce qu'il
 * doit renseigner, et ou.
 */
function url(): string {
  const value = process.env.DATABASE_URL
  if (value) return value

  throw new Error(
    "DATABASE_URL est absente : la base est injoignable et aucune page ne peut etre servie. " +
      "En local, la copier depuis .env.example ; en deploiement, la renseigner dans les " +
      "variables du projet — pour l'environnement de PREVIEW autant que pour la production.",
  )
}

// `prepare: false` : requis derriere un pooler en mode transaction.
// Exportee pour que les tests puissent fermer la connexion et laisser le
// processus se terminer.
export const connection = postgres(url(), { prepare: false })

export const db = drizzle(connection, { schema })
