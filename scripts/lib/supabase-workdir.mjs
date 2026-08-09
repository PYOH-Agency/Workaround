import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Le repertoire Supabase que la CLI doit utiliser ici.
 *
 * Par defaut la racine du depot, donc `supabase/` — le comportement d'avant, et
 * celui du worktree principal. Si `.supabase-local/` existe, c'est un worktree
 * qui s'est donne sa propre pile : on l'utilise a la place.
 *
 * Aucun fichier versionne ne change dans un cas comme dans l'autre. Renoncer a
 * sa pile locale, c'est supprimer un dossier.
 */
export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')

export const LOCAL_DIR = path.join(ROOT, '.supabase-local')

export function workdir() {
  return existsSync(path.join(LOCAL_DIR, 'supabase', 'config.toml')) ? LOCAL_DIR : ROOT
}

/** L'identifiant de projet en vigueur — le suffixe des conteneurs Docker. */
export function projectId() {
  const config = readFileSync(path.join(workdir(), 'supabase', 'config.toml'), 'utf8')
  return config.match(/^project_id = "(.*)"$/m)?.[1] ?? null
}

/**
 * Le port de l'application pour ce worktree.
 *
 * Isoler la pile Supabase ne suffisait pas : `next dev` ecoute sur 3000 dans
 * tous les worktrees, et `reuseExistingServer` de Playwright s'attache a celui
 * qui tourne deja. Les parcours d'un worktree interrogeaient alors
 * l'application d'un autre, branchee sur une autre base — et le diagnostic
 * etait impossible, puisque tout repondait 200.
 *
 * Le port suit le decalage des ports Supabase : une bande, un worktree, un
 * port applicatif.
 */
export function appPort() {
  const { shadow } = ports()
  return 3000 + (shadow === null ? 0 : shadow - 54320)
}

/** Les ports en vigueur, lus dans le config effectif. */
export function ports() {
  const config = readFileSync(path.join(workdir(), 'supabase', 'config.toml'), 'utf8')
  const read = (section, key = 'port') => {
    const block = config.split(/^\[/m).find((part) => part.startsWith(`${section}]`))
    const found = block?.match(new RegExp(`^${key} = (\\d+)`, 'm'))
    return found ? Number(found[1]) : null
  }

  return {
    api: read('api'),
    db: read('db'),
    studio: read('studio'),
    mailbox: read('local_smtp'),
    // Le premier port de la bande : il porte le decalage du worktree.
    shadow: read('db', 'shadow_port'),
  }
}
