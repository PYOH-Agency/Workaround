import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'

/**
 * L'adresse de la base, ou un refus qui se lit.
 *
 * `postgres(undefined)` ne leve pas : le deploiement sortait vert et chaque
 * page rendait « Internal Server Error » sans nommer ce qui manquait. Il a
 * fallu une construction a blanc, en local, pour retrouver la variable.
 *
 * Meme discipline que `SECRET_KEY` dans `lib/secrets.ts` : on refuse
 * bruyamment plutot que de se rabattre. La difference tient au message — celui
 * qui lit ce journal doit y trouver le nom de ce qu'il doit renseigner, et ou.
 */
function url(): string {
  const value = process.env.DATABASE_URL
  if (value) return value

  throw new Error(
    "DATABASE_URL est absente : la base est injoignable. En local, la copier depuis " +
      ".env.example ; en deploiement, la renseigner dans les variables du projet — pour " +
      "l'environnement de PREVIEW autant que pour la production.",
  )
}

/**
 * La connexion ne s'ouvre qu'au premier usage, et c'est ce qui sauve le build.
 *
 * Une premiere version appelait `url()` au chargement du module. Le refus
 * arrivait alors pendant `next build`, quand Next collecte les donnees des
 * routes dynamiques : **plus rien ne se construisait**, pas meme les ecrans
 * statiques. Or `/connexion` et les portes d'inscription n'ont besoin d'aucune
 * base, et ce sont justement les ecrans qu'une previsualisation sert a relire.
 *
 * Differee, la lecture laisse le build produire ce qu'il peut, et le refus
 * revient a la premiere requete qui touche vraiment la base — nomme, dans le
 * journal d'execution. On perd l'echec precoce, on gagne une previsualisation
 * utilisable ; et le defaut reste impossible a manquer.
 */
let started: { connection: Sql; db: PostgresJsDatabase<typeof schema> } | null = null

function boot() {
  if (!started) {
    // `prepare: false` : requis derriere un pooler en mode transaction.
    const connection = postgres(url(), { prepare: false })
    started = { connection, db: drizzle(connection, { schema }) }
  }
  return started
}

/**
 * Les methodes sont reliees a leur instance avant d'etre rendues.
 *
 * Sans cela, `const { end } = connection` puis `end()` perdrait son `this` — et
 * les tests appellent bien `connection.end()`.
 */
function lazy<T extends object>(pick: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const source = pick()
      const value = Reflect.get(source, property, source) as unknown
      return typeof value === 'function' ? value.bind(source) : value
    },
  })
}

/**
 * Exportee pour que les tests puissent fermer la connexion et laisser le
 * processus se terminer.
 */
export const connection = lazy(() => boot().connection)

export const db = lazy(() => boot().db)
