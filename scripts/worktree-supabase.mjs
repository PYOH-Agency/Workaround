import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { ROOT, LOCAL_DIR } from './lib/supabase-workdir.mjs'

/**
 * Donne a ce worktree sa propre pile Supabase.
 *
 * Deux worktrees partageaient jusqu'ici une seule pile locale : le `db reset`
 * de l'un effacait la base de l'autre en plein milieu d'une suite de tests, et
 * la table d'une migration absente de l'autre branche disparaissait sans que
 * rien ne l'explique. C'est arrive cinq fois en une session, dont une pendant
 * un `git push`.
 *
 * La CLI accepte `env(...)` pour `project_id` mais **pas pour les ports**, qui
 * sont typés entiers — un `port = env(X)` ne se parse pas. Un identifiant de
 * projet distinct ne suffit donc pas : sans ports distincts, les deux piles se
 * disputent 54321-54329 et la seconde ne demarre pas.
 *
 * D'ou ce repertoire genere. `supabase/` reste la source versionnee et n'est
 * jamais modifie ; `.supabase-local/supabase/` en derive avec son identifiant
 * et sa bande de ports, et les migrations, le seed et les gabarits y sont des
 * liens — un fichier, une verite. Renoncer, c'est supprimer le dossier.
 */

/** Les ports du config versionne, tous dans une bande de dix a partir de 54320. */
const BASE = 54320
const SPAN = 10

/** L'inspecteur du runtime edge vit ailleurs ; il se decale du meme ecart. */
const INSPECTOR = 8083

async function free(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, '127.0.0.1')
  })
}

/**
 * Les bandes deja reservees par les worktrees voisins.
 *
 * Sonder les ports ne suffit pas : un port n'est occupe que pendant que la pile
 * tourne. Deux worktrees configures a froid recevaient donc la MEME bande, et
 * la collision n'apparaissait qu'au demarrage du second — loin de sa cause.
 * Une bande se lit dans le config, pas sur le reseau.
 */
function reserved() {
  const listed = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
  })

  return new Set(
    (listed.stdout ?? '')
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => path.join(line.slice('worktree '.length), '.supabase-local', 'supabase', 'config.toml'))
      .filter((file) => file !== generated && existsSync(file))
      .map((file) => Number(readFileSync(file, 'utf8').match(/^shadow_port = (\d+)$/m)?.[1]))
      .filter(Number.isInteger),
  )
}

/**
 * La premiere bande de dix ports libre — ni ecoutee, ni reservee.
 *
 * Cherchee plutot que derivee d'un hachage du nom : un hachage se collisionne
 * en silence, et la panne arrive alors au demarrage de la seconde pile, loin de
 * sa cause. Une fois trouvee, la bande est ecrite dans le config et ne bouge
 * plus — les ports d'un worktree sont stables tant qu'il existe.
 */
async function findBand() {
  const taken = reserved()

  for (let base = BASE + SPAN; base < BASE + 400; base += SPAN) {
    if (taken.has(base)) continue
    const probes = await Promise.all(
      Array.from({ length: SPAN }, (_, i) => free(base + i)),
    )
    if (probes.every(Boolean)) return base
  }
  throw new Error('Aucune bande de dix ports libre entre 54330 et 54720.')
}

/**
 * Un identifiant de conteneur lisible : le nom du repertoire du worktree.
 *
 * Borne a quarante caracteres, longueur a laquelle la CLI tronque de toute
 * facon le nom des conteneurs Docker. Laisser depasser donnait un identifiant
 * qui ne correspondait a aucun conteneur reel.
 */
function projectId() {
  const name = path.basename(ROOT).replace(/[^a-zA-Z0-9_-]/g, '-')
  return `dq-${name}`.slice(0, 40)
}

function rewrite(config, base) {
  const shift = base - BASE

  return config
    .replace(/^project_id = ".*"$/m, `project_id = "${projectId()}"`)
    .replace(/^(port|shadow_port|smtp_port|pop3_port) = (\d+)$/gm, (line, key, value) => {
      const port = Number(value)
      // Seuls les ports de la bande du depot se decalent. Les autres — le 587
      // d'un SMTP distant, par exemple — ne nous appartiennent pas.
      if (port < BASE || port >= BASE + SPAN) return line
      return `${key} = ${port + shift}`
    })
    .replace(/^inspector_port = \d+$/m, `inspector_port = ${INSPECTOR + shift}`)
    /*
      Et l'adresse de l'application vue par l'authentification — `site_url` et
      `additional_redirect_urls`. L'oublier laissait tout fonctionner jusqu'au
      lien magique, qui renvoyait vers le port 3000 : le navigateur atterrissait
      sur l'application d'un autre worktree, non connecte, et le parcours
      echouait sur un titre manquant sans rien dire du port.
    */
    .replace(/(https?:\/\/(?:localhost|127\.0\.0\.1)):3000\b/g, `$1:${3000 + shift}`)
}

const source = path.join(ROOT, 'supabase')
const target = path.join(LOCAL_DIR, 'supabase')
const generated = path.join(target, 'config.toml')

/**
 * La bande deja attribuee a ce worktree, s'il en a une.
 *
 * Relire plutot que rechercher : une pile allumee occupe ses propres ports, et
 * une nouvelle recherche lui en attribuerait d'autres a chaque passage. Les
 * ports d'un worktree doivent survivre a un second `pnpm db:worktree`.
 */
const existing = existsSync(generated)
  ? Number(readFileSync(generated, 'utf8').match(/^shadow_port = (\d+)$/m)?.[1])
  : null

const band = Number.isInteger(existing) ? existing : await findBand()

rmSync(LOCAL_DIR, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
writeFileSync(
  path.join(target, 'config.toml'),
  rewrite(readFileSync(path.join(source, 'config.toml'), 'utf8'), band),
)

// Liens et non copies : une migration ajoutee dans `supabase/` doit s'appliquer
// ici sans qu'on ait a resynchroniser quoi que ce soit.
for (const entry of ['migrations', 'seed.sql', 'templates']) {
  if (existsSync(path.join(source, entry))) {
    symlinkSync(path.join(source, entry), path.join(target, entry))
  }
}

const shift = band - BASE

/**
 * Les fichiers d'environnement suivent, sinon la pile tourne et l'application
 * continue de parler a l'ancienne. Ils ne sont pas versionnes — `.gitignore`
 * les exclut tous sauf l'exemple — donc les reecrire n'engage que ce worktree.
 *
 * La substitution ne porte que sur les ports de la bande du depot : une URL
 * distante qui contiendrait un nombre voisin n'est pas touchee.
 */
const retouched = []
for (const file of ['.env.local', '.env.test']) {
  const full = path.join(ROOT, file)
  if (!existsSync(full)) continue

  const before = readFileSync(full, 'utf8')
  const moved = (value) => {
    const port = Number(value)
    return port >= BASE && port < BASE + SPAN ? port + shift : null
  }

  let after = before
    // Les ports dans une URL : `127.0.0.1:54322`.
    .replace(/(127\.0\.0\.1|localhost):(\d{5})/g, (whole, host, value) => {
      const to = moved(value)
      return to === null ? whole : `${host}:${to}`
    })
    /*
      Et ceux qui sont une valeur a eux seuls — `SMTP_PORT=54325`. Les oublier
      laissait les tests d'envoi expirer sans rien dire : le collecteur du
      worktree ecoutait, mais personne ne lui parlait.
    */
    .replace(/^(\w*PORT)=(\d{5})$/gm, (whole, key, value) => {
      const to = moved(value)
      return to === null ? whole : `${key}=${to}`
    })
    /*
      Et l'adresse de l'application. `next dev` ecoute sur 3000 dans tous les
      worktrees : sans ce decalage, les parcours de l'un interrogent
      l'application de l'autre, branchee sur une autre base, et tout repond 200.
    */
    .replace(/^((?:NEXT_PUBLIC_)?APP_URL)=(https?:\/\/[^:]+):3000\b/gm, `$1=$2:${3000 + shift}`)

  // `MAILBOX_URL` a un defaut code en dur dans les parcours ; il doit devenir
  // explicite des lors que la pile n'est plus a l'adresse attendue.
  if (!/^MAILBOX_URL=/m.test(after)) {
    after = `${after.trimEnd()}\nMAILBOX_URL=http://127.0.0.1:${54324 + shift}\n`
  }

  if (after !== before) {
    writeFileSync(full, after)
    retouched.push(file)
  }
}

console.log(`Pile de ce worktree : ${projectId()}`)
console.log(`  ports ${band}–${band + SPAN - 1}, soit un décalage de ${shift}`)
console.log(`  API ${54321 + shift} · base ${54322 + shift} · studio ${54323 + shift} · courrier ${54324 + shift}`)
console.log('')
console.log(retouched.length > 0 ? `Réécrits : ${retouched.join(', ')}` : 'Aucun fichier .env à réécrire.')
console.log('')
console.log('Démarrer : pnpm db:start')
