import { existsSync } from 'node:fs'
import { read, report } from './lib/sources.mjs'

/**
 * Le build et les tests lisent l'environnement local. Sans lui, `next build`
 * echoue au prerendu sur une erreur de client Supabase qui ne dit pas ce qui
 * manque — et l'on cherche un defaut de code la ou il n'y en a pas.
 *
 * Cas frequent : un worktree fraichement cree, ou les fichiers d'environnement
 * ne sont pas suivis par git et n'ont donc pas ete copies.
 */
const REQUIRED = {
  '.env.local': ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  '.env.test': ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
}

const violations = []

for (const [file, keys] of Object.entries(REQUIRED)) {
  if (!existsSync(file)) {
    violations.push(`${file} est absent — le copier depuis .env.example, ou depuis le dépôt principal`)
    continue
  }

  const source = read(file)
  for (const key of keys) {
    if (!new RegExp(`^\\s*${key}\\s*=\\s*\\S`, 'm').test(source)) {
      violations.push(`${file} — ${key} est absent ou vide`)
    }
  }
}

process.exit(report("Environnement local", violations))
