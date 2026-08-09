import { and, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { referenceVersion } from '@/domain/quote-versions'
import { quoteVersions, rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'

/**
 * L'artisan declare son chantier termine.
 *
 * Une date declaree compte immediatement dans les metriques : refuser la
 * declaration penaliserait l'artisan honnete qui ne solde pas tout de suite.
 * Mais elle reste une parole — et l'emission du solde l'auditera.
 */
export async function declareCompleted(companyId: string, quoteId: string, at: Date) {
  const root = await rootQuoteId(quoteId)
  const versions = await quoteVersions(root)

  const [target] = await db
    .select()
    .from(quote)
    .where(and(eq(quote.id, root), eq(quote.companyId, companyId)))

  if (!target) throw new Error('Devis introuvable')
  if (!referenceVersion(versions)) {
    throw new Error('Un chantier ne se termine que sur un devis signé')
  }

  await db
    .update(quote)
    .set({ completedAt: at, completionSource: 'declared' })
    .where(eq(quote.id, root))

  await recordEvent({
    type: 'chantier.completed',
    subjectType: 'quote',
    subjectId: root,
    companyId,
    actorType: 'company',
    payload: { source: 'declared', at: at.toISOString() },
  })
}

/**
 * L'emission d'une facture de solde constate la reception des travaux.
 *
 * **C'est l'emission qui compte, jamais l'encaissement** : un artisan qui a
 * envoye sa facture et attend son virement a un chantier termine.
 *
 * L'authentifie l'emporte sur le declare, quelle que soit l'ampleur de l'ecart.
 * Mais une seconde emission ne reecrit pas l'histoire : la premiere fait foi.
 */
export async function recordInvoicedCompletion(rootQuoteIdValue: string, at: Date) {
  const [updated] = await db
    .update(quote)
    .set({ completedAt: at, completionSource: 'invoiced' })
    .where(
      and(
        eq(quote.id, rootQuoteIdValue),
        // Seule une fin declaree — ou aucune — se laisse ecraser. La condition
        // doit etre un predicat SQL, pas un test JavaScript : un ternaire ici
        // s'evaluerait une fois a la construction de la requete, et non ligne
        // par ligne.
        or(isNull(quote.completionSource), eq(quote.completionSource, 'declared')),
      ),
    )
    .returning()

  return updated ?? null
}
