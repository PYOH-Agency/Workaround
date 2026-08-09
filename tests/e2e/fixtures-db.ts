import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'

// Meme garde que pour les tests unitaires : on n'attaque que la pile locale.
config({ path: '.env.test' })

/**
 * Chargement differe du client de base.
 *
 * `@/db/client` lit `DATABASE_URL` a l'evaluation du module. Un import statique
 * serait hisse au-dessus du `config()` ci-dessus et ouvrirait la connexion sur
 * une variable absente.
 */
async function load() {
  const [{ db }, imported] = await Promise.all([import('@/db/client'), import('@/db/schema')])

  // Playwright transpile ses fichiers en CommonJS. Un module qui ne fait que
  // reexporter (`export *`) ne laisse alors rien deviner statiquement, et ses
  // exports se retrouvent sous `default` au lieu d'etre a plat.
  // Le `default` n'existe qu'a l'execution sous CommonJS : le type du module,
  // lui, ne le connait pas.
  const wrapped = imported as { default?: unknown }
  const schema = (wrapped.default ?? imported) as typeof import('@/db/schema')

  return { db, schema }
}

export { load }

/** L'identifiant Supabase d'un compte deja connecte. */
export async function userIdFor(email: string): Promise<string> {
  const { db } = await load()
  const [user] = await db.execute<{ id: string }>(
    sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`,
  )
  if (!user) throw new Error(`Aucun compte Supabase pour ${email} — la connexion a-t-elle abouti ?`)
  return user.id
}
