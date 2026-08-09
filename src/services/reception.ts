import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, signature } from '@/db/schema'
import { assertReceivable } from '@/domain/guarantees'
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

  await db
    .update(quote)
    .set({ receivedAt: input.declaredAt, receivedBy: input.requesterId })
    .where(eq(quote.id, row.id))

  await recordEvent({
    type: 'chantier.received',
    subjectType: 'quote',
    subjectId: row.id,
    companyId: row.companyId,
    actorType: 'customer',
    // Un identifiant, jamais une adresse : ce journal est ineffacable.
    actorId: input.requesterId,
    payload: { at: input.declaredAt.toISOString() },
  })
}
