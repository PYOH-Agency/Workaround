import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, payment, quote } from '@/db/schema'

/**
 * La lecture brute des factures d'une entreprise.
 *
 * **Aucun filtre metier ici, et c'est le point.** Deux appelants s'en servent
 * sans chercher la meme chose — l'un veut ce qui reste du, l'autre ce qui est
 * echu. Faire porter le filtre a cette fonction la couperait de l'un des deux.
 */

/** Les factures d'une entreprise, avec leurs encaissements et la reception du chantier. */
export async function settlements(companyId: string) {
  const rows = await db
    .select({
      id: invoice.id,
      quoteId: invoice.quoteId,
      type: invoice.type,
      totalInclTax: invoice.totalInclTax,
      dueAt: invoice.dueAt,
      retentionRate: invoice.retentionRate,
      receivedAt: quote.receivedAt,
    })
    .from(invoice)
    .leftJoin(quote, eq(invoice.quoteId, quote.id))
    .where(eq(invoice.companyId, companyId))

  const paid = await db
    .select({ invoiceId: payment.invoiceId, amount: payment.amount, receivedAt: payment.receivedAt })
    .from(payment)
    .innerJoin(invoice, eq(payment.invoiceId, invoice.id))
    .where(eq(invoice.companyId, companyId))

  return { rows, paid }
}
