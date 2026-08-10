import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { retentionState, type RetentionState } from '@/domain/retention'

/**
 * L'etat de la retenue d'une facture.
 *
 * Rien n'est stocke : le taux est fige sur la facture, la reception est
 * declaree sur le devis, et l'etat se recalcule a chaque lecture. Un montant
 * retenu stocke finirait par mentir le jour ou la reception est declaree — ou
 * corrigee, ce que M6·B autorise expressement.
 *
 * La reception vit sur la RACINE de la chaine de versions, comme les factures :
 * `invoice.quote_id` la designe deja.
 */
export async function retentionOf(
  row: { totalInclTax: number; retentionRate: number; quoteId: string | null },
  now: Date,
): Promise<RetentionState> {
  if (row.retentionRate === 0 || !row.quoteId) {
    return retentionState({ totalInclTax: 0, rate: 0, receivedAt: null }, now)
  }

  const [source] = await db
    .select({ receivedAt: quote.receivedAt })
    .from(quote)
    .where(eq(quote.id, row.quoteId))

  return retentionState(
    {
      totalInclTax: row.totalInclTax,
      rate: row.retentionRate,
      receivedAt: source?.receivedAt ?? null,
    },
    now,
  )
}
