import { config } from 'dotenv'

// Les tests attaquent la pile Supabase locale, jamais un projet distant.
config({ path: '.env.test' })
