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

/**
 * Cree un compte Supabase confirme, sans passer par l'interface.
 *
 * Depuis A1, `/connexion` est une porte de RETOUR : elle n'envoie plus de lien
 * a une adresse inconnue. Les parcours qui inventent une adresse neuve doivent
 * donc creer le compte d'abord — l'alternative serait de leur faire traverser
 * l'inscription artisan, ce qui rendrait chaque parcours dependant d'un ecran
 * qu'il ne teste pas.
 */
export async function createAccount(email: string): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js')

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true })
  // « already been registered » : un parcours rejoue la meme adresse, c'est bon.
  if (error && !/already/i.test(error.message)) throw error
}

/**
 * Un compte Supabase existe-t-il pour cette adresse ?
 *
 * Sert a prouver une ABSENCE : `shouldCreateUser: false` n'a d'interet que si
 * l'on verifie qu'aucun compte n'est ne. Le message affiche, lui, est
 * volontairement identique dans les deux cas — il ne prouve donc rien.
 */
export async function accountExists(email: string): Promise<boolean> {
  const { db } = await load()
  const rows = await db.execute<{ id: string }>(
    sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`,
  )
  return rows.length > 0
}
