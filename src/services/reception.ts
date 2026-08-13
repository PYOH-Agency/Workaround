import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, signature } from '@/db/schema'
import { assertReceivable, assertReservesLiftable } from '@/domain/guarantees'
import { recordEvent } from '@/services/events'

/**
 * Le maitre d'ouvrage declare la reception de ses travaux.
 *
 * **C'est son acte, pas le notre et pas celui de l'entreprise.** Nous
 * n'etablissons pas la reception : nous enregistrons une declaration, elle fait
 * courir les garanties legales affichees, et elle est visible des deux cotes —
 * un fait partage ne se consigne pas en secret.
 *
 * Corrigible : une date erronee lui couterait un delai de forclusion, et il est
 * le seul a savoir. Chaque correction passe par le journal.
 */
export async function declareReception(input: {
  requesterId: string
  quoteId: string
  declaredAt: Date
  /**
   * Les reserves, telles que le maitre d'ouvrage les decrit. `null` = reception
   * sans reserve. Vide ou blanc est traite comme `null` : cocher « avec
   * reserves » sans rien ecrire ne cree pas de reserve.
   */
  reserves: string | null
  now: Date
}) {
  const [row] = await db
    .select({
      id: quote.id,
      companyId: quote.companyId,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    // La condition d'acces est portee par la requete, comme partout ailleurs.
    .where(and(eq(signature.requesterId, input.requesterId), eq(signature.quoteId, input.quoteId)))

  if (!row?.signedAt) throw new Error('Chantier introuvable')

  assertReceivable({
    signedAt: row.signedAt,
    completedAt: row.completedAt,
    declaredAt: input.declaredAt,
    now: input.now,
  })

  const reserves = input.reserves?.trim() ? input.reserves.trim() : null

  await db
    .update(quote)
    .set({
      receivedAt: input.declaredAt,
      receivedBy: input.requesterId,
      receptionReserves: reserves,
      // Une reception sans reserve n'a rien a lever : on efface toute levee
      // heritee d'une declaration precedente. Avec reserves, une levee deja
      // enregistree tient — la correction porte sur la date, pas sur elle.
      ...(reserves === null ? { reservesLiftedAt: null, reservesLiftedBy: null } : {}),
    })
    .where(eq(quote.id, row.id))

  await recordEvent({
    type: 'chantier.received',
    subjectType: 'quote',
    subjectId: row.id,
    companyId: row.companyId,
    actorType: 'customer',
    // Un identifiant, jamais une adresse : ce journal est ineffacable.
    actorId: input.requesterId,
    payload: { at: input.declaredAt.toISOString(), withReserves: reserves !== null },
  })
}

/**
 * La levee des reserves, declaree par le maitre d'ouvrage.
 *
 * Son acte, comme la reception : c'est lui qui constate que les reprises ont
 * ete faites. Elle debloque la retenue de garantie, restee due jusque-la. Le
 * journal la consigne — un fait partage, visible des deux cotes.
 */
export async function liftReserves(input: {
  requesterId: string
  quoteId: string
  liftedAt: Date
  now: Date
}) {
  const [row] = await db
    .select({
      id: quote.id,
      companyId: quote.companyId,
      receivedAt: quote.receivedAt,
      reserves: quote.receptionReserves,
      reservesLiftedAt: quote.reservesLiftedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(quote.id, signature.quoteId))
    .where(and(eq(signature.requesterId, input.requesterId), eq(signature.quoteId, input.quoteId)))

  if (!row?.receivedAt) throw new Error('Chantier introuvable')
  if (row.reserves === null) throw new Error('Aucune réserve à lever')
  if (row.reservesLiftedAt !== null) throw new Error('Les réserves sont déjà levées')

  assertReservesLiftable({ receivedAt: row.receivedAt, liftedAt: input.liftedAt, now: input.now })

  await db
    .update(quote)
    .set({ reservesLiftedAt: input.liftedAt, reservesLiftedBy: input.requesterId })
    .where(eq(quote.id, row.id))

  await recordEvent({
    type: 'chantier.reserves_lifted',
    subjectType: 'quote',
    subjectId: row.id,
    companyId: row.companyId,
    actorType: 'customer',
    actorId: input.requesterId,
    payload: { at: input.liftedAt.toISOString() },
  })
}
