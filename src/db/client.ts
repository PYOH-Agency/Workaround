import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// `prepare: false` : requis derriere un pooler en mode transaction.
// Exportee pour que les tests puissent fermer la connexion et laisser le
// processus se terminer.
export const connection = postgres(process.env.DATABASE_URL!, { prepare: false })

export const db = drizzle(connection, { schema })
