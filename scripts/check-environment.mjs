import { existsSync } from 'node:fs'
import { read, report } from './lib/sources.mjs'
import { ports, workdir, ROOT } from './lib/supabase-workdir.mjs'

/**
 * Le build et les tests lisent l'environnement local. Sans lui, `next build`
 * echoue au prerendu sur une erreur de client Supabase qui ne dit pas ce qui
 * manque — et l'on cherche un defaut de code la ou il n'y en a pas.
 *
 * Cas frequent : un worktree fraichement cree, ou les fichiers d'environnement
 * ne sont pas suivis par git et n'ont donc pas ete copies.
 */
/**
 * `MAIL_OPTOUT_SECRET` figure ici parce que son absence est SILENCIEUSE.
 *
 * Le lien « je ne souhaite plus etre contacte » est signe, pas stocke. Sans
 * secret, `optoutToken` leve — et l'action publique avale l'exception pour ne
 * pas reveler au demandeur ce qui est arrive a un tiers. Une variable oubliee
 * produirait donc une page qui remercie, et pas un seul mail envoye, sans que
 * rien ne s'en plaigne. C'est le seul endroit ou ce defaut peut encore crier.
 */
/**
 * `SMTP_HOST` et `SMTP_PORT` y figurent parce que leur absence est PIRE qu'une
 * panne : elle marche.
 *
 * `src/services/email.ts` retombe sur `127.0.0.1:54325` quand ils manquent —
 * le collecteur de la pile par defaut. Tant qu'un worktree partage cette pile,
 * le defaut vise juste et personne ne voit que la variable manque. Le jour ou
 * il prend la sienne (`pnpm db:worktree`, qui decale la bande), les envois
 * continuent de partir vers l'ANCIENNE pile pendant que les tests lisent la
 * nouvelle : trois parcours de courrier expirent, et rien ne dit pourquoi.
 *
 * Le script de worktree ne peut pas non plus les decaler s'ils sont absents :
 * il reecrit des lignes, il n'en invente pas.
 */
const REQUIRED = {
  '.env.local': [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'MAIL_OPTOUT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
  ],
  '.env.test': [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'MAIL_OPTOUT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
  ],
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

/**
 * Un worktree qui s'est donne sa propre pile mais dont l'environnement pointe
 * encore sur celle du depot principal.
 *
 * C'est la panne que ce controle existe pour rendre lisible : la pile tourne,
 * l'application se connecte — a la base du voisin. Les tests passent, puis
 * echouent sans raison quand l'autre worktree se reinitialise.
 */
if (workdir() !== ROOT) {
  const { api, db } = ports()

  for (const file of ['.env.local', '.env.test']) {
    if (!existsSync(file)) continue
    const source = read(file)

    for (const [key, expected] of [
      ['NEXT_PUBLIC_SUPABASE_URL', api],
      ['DATABASE_URL', db],
    ]) {
      const line = new RegExp(`^\\s*${key}\\s*=.*$`, 'm').exec(source)?.[0]
      if (line && !line.includes(String(expected))) {
        violations.push(
          `${file} — ${key} ne vise pas le port ${expected} de la pile de ce worktree : ` +
            'rejouer `pnpm db:worktree`',
        )
      }
    }
  }
}

process.exit(report("Environnement local", violations))
