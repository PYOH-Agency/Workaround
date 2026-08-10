import { and, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { registrationIntent } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'

/**
 * Vingt-quatre heures, comme `quote_link_request`.
 *
 * Assez pour ouvrir son courriel le lendemain matin, trop peu pour qu'une
 * intention oubliee dorme dans une table de donnees personnelles.
 */
const RETENTION_MS = 24 * 60 * 60 * 1000

export interface Intent {
  kind: 'company' | 'requester'
  siret: string | null
  name: string | null
}

/**
 * Ecrite AVANT l'envoi du lien.
 *
 * L'ordre importe : si l'envoi echoue, une intention orpheline ne coute rien et
 * se purge seule. Dans l'autre ordre, la personne atterrirait avec un compte et
 * sans intention — c'est-a-dire sur l'inscription artisan, quoi qu'elle ait
 * demande.
 *
 * La purge se fait ici plutot que par une tache planifiee, « qu'on oublierait
 * de surveiller » — meme raison que `resendQuoteLinks`.
 */
export async function recordIntent(input: {
  email: string
  kind: 'company' | 'requester'
  siret?: string
  name?: string
  now?: Date
}): Promise<void> {
  const now = input.now ?? new Date()
  const email = normalizeEmail(input.email)
  const values = {
    kind: input.kind,
    siret: input.siret ?? null,
    name: input.name ?? null,
    createdAt: now,
  }

  await db
    .delete(registrationIntent)
    .where(lt(registrationIntent.createdAt, new Date(now.getTime() - RETENTION_MS)))

  await db
    .insert(registrationIntent)
    .values({ email, ...values })
    .onConflictDoUpdate({ target: registrationIntent.email, set: values })
}

/**
 * Lue et supprimee du meme geste.
 *
 * `DELETE ... RETURNING` plutot qu'un `SELECT` puis un `DELETE` : deux clics
 * simultanes sur le meme courriel creeraient sinon deux entreprises.
 *
 * Une intention perimee n'est pas rendue, et n'est pas supprimee non plus — la
 * purge de `recordIntent` s'en charge. Deux mecanismes de suppression pour la
 * meme table divergeraient.
 */
export async function consumeIntent(rawEmail: string, now = new Date()): Promise<Intent | null> {
  const email = normalizeEmail(rawEmail)

  const [row] = await db
    .delete(registrationIntent)
    .where(
      and(
        eq(registrationIntent.email, email),
        gte(registrationIntent.createdAt, new Date(now.getTime() - RETENTION_MS)),
      ),
    )
    .returning()

  return row ? { kind: row.kind, siret: row.siret, name: row.name } : null
}
