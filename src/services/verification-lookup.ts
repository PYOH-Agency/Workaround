import { like, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, verificationLookup } from '@/db/schema'
import type { LookupEntry, LookupOutcome } from '@/domain/lead'
import { publicProfile } from '@/services/public-profile'

/** Douze mois : au-dela, un compteur de recherches ne sert plus a rien. */
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000

export interface Classification {
  outcome: LookupOutcome
  /** Le passeport a servir, quand il existe. `null` dans tous les autres cas. */
  slug: string | null
}

/**
 * Le cas d'un SIRET : couvert, inscrit sans couverture, ou inconnu.
 *
 * **Les cas B et C ne different que pour le serveur.** La distinction ne sert
 * qu'a choisir le corps du mail envoye a l'artisan : rien de ce que voit le
 * demandeur ne doit permettre de les separer, sans quoi le formulaire redevient
 * un test d'appartenance a D'equerre.
 */
export async function classifySiret(siret: string, now: Date): Promise<Classification> {
  const siren = siret.slice(0, 9)

  const profile = await publicProfile(siren, now)
  if (profile) return { outcome: 'covered', slug: profile.slug }

  const [known] = await db
    .select({ id: company.id })
    .from(company)
    .where(like(company.siret, `${siren}%`))
    .limit(1)

  return { outcome: known ? 'uncovered_member' : 'stranger', slug: null }
}

/**
 * Journalise une recherche.
 *
 * Ecrit depuis l'ACTION, jamais depuis la page : une page qui ecrit au rendu
 * compterait les prechargements, les robots et les rechargements, et
 * `/verification/[siret]` est partageable donc revisitee. On mesure des
 * recherches humaines, pas des affichages.
 */
export async function recordLookup(
  input: { siret: string; outcome: LookupOutcome; entry: LookupEntry },
  now: Date,
): Promise<void> {
  await db.insert(verificationLookup).values({ ...input, lookedUpAt: now })
}

/** Purge des recherches de plus de douze mois. Appelee par le cron quotidien. */
export async function purgeLookups(now: Date): Promise<void> {
  await db
    .delete(verificationLookup)
    .where(lt(verificationLookup.lookedUpAt, new Date(now.getTime() - RETENTION_MS)))
}
