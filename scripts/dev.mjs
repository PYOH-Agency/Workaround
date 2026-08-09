import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { ROOT, appPort } from './lib/supabase-workdir.mjs'

/**
 * `next dev`, sur le port de ce worktree.
 *
 * Sans worktree local, c'est 3000 — le comportement d'avant. Avec, c'est le
 * port derive de la bande Supabase, pour qu'aucun worktree n'ecoute la ou un
 * autre repond deja.
 */
const port = appPort()
const next = path.join(ROOT, 'node_modules', '.bin', 'next')

const { status } = spawnSync(next, ['dev', '--port', String(port), ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: ROOT,
})

process.exit(status ?? 1)
