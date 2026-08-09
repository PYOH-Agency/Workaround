import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { ROOT, workdir } from './lib/supabase-workdir.mjs'

/**
 * `supabase`, dirige vers la pile de ce worktree.
 *
 * Tous les scripts de `package.json` passent par ici plutot que d'appeler la
 * CLI directement : c'est le seul endroit qui sait quel repertoire viser, donc
 * le seul a corriger si la regle change. Sans worktree local, l'appel est
 * identique a ce qu'il etait.
 */
const dir = workdir()
const args = process.argv.slice(2)

// La CLI est une dependance de developpement, pas un binaire du systeme.
const cli = path.join(ROOT, 'node_modules', '.bin', 'supabase')

const { status } = spawnSync(cli, dir === ROOT ? args : [...args, '--workdir', dir], {
  stdio: 'inherit',
  cwd: ROOT,
})

/*
  Aucun rattrapage sur Kong ici, et c'est delibere.

  En CLI 2.111, un `db reset` recreait le conteneur d'authentification avec une
  nouvelle adresse Docker que le proxy ne rechargeait pas : toute requete
  d'authentification repondait 502, les liens magiques n'arrivaient plus, et les
  parcours echouaient sur « aucun message » sans designer leur cause. La 2.113
  le corrige — trois `db reset` d'affilee laissent l'authentification joignable.
  D'ou le plancher de version dans `package.json`.

  Ce qu'il ne faut surtout pas faire, si le symptome reapparaissait : un
  `docker restart` du proxy. Il en a l'air du remede et ne l'est pas — la CLI
  injecte la configuration de Kong au demarrage du conteneur, elle ne survit
  pas au redemarrage, et le conteneur sort en 127. Le remede est `pnpm db:stop`
  puis `pnpm db:start`.
*/
process.exit(status ?? 1)
