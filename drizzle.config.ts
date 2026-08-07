import { config } from 'dotenv'
import type { Config } from 'drizzle-kit'

config({ path: '.env.local' })

export default {
  schema: './src/db/schema/*.ts',
  // On ecrit dans le dossier de migrations de Supabase : une seule chaine de
  // migrations, appliquee a l'identique en local (db reset) et en distant (db push).
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
