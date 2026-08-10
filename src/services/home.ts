import { and, eq, gte, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, payment, quote } from '@/db/schema'
import type { Cents } from '@/domain/money'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { amountDueNow, paymentStatus, type Settlement } from '@/domain/payment-status'
import { retentionState } from '@/domain/retention'

/**
 * L'assemblage de l'accueil.
 *
 * **Il vit ici et non dans l'ecran** : l'isolation des fonctionnalites interdit
 * a la racine d'importer `(app)/devis` ou `(app)/factures`, et un besoin
 * partage remonte dans une couche partagee. C'est de toute facon la bonne
 * place : ces requetes traversent quatre tables qui n'appartiennent a aucun
 * ecran en particulier.
 */

const MONTHS_12 = 12

export interface MoneyInFlight {
  /** Le carnet de commandes : signe, pas encore facture. */
  signedNotInvoiced: Cents
  /** Facture, exigible plus tard. */
  invoicedOnTime: Cents
  /** Facture, echu, retenue de garantie deduite. */
  overdue: Cents
  cashedLast12Months: Cents
}

/** Les factures d'une entreprise, avec leurs encaissements et la reception du chantier. */
async function settlements(companyId: string) {
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

export async function moneyInFlight(companyId: string, now: Date): Promise<MoneyInFlight> {
  const signed = await db
    .select({ id: quote.id, totalInclTax: quote.totalInclTax })
    .from(quote)
    .where(
      and(
        eq(quote.companyId, companyId),
        eq(quote.status, 'signed'),
        // La racine seule : un avenant n'est pas une commande de plus.
        isNull(quote.supersedesQuoteId),
      ),
    )

  const { rows, paid } = await settlements(companyId)

  let signedNotInvoiced = 0
  for (const root of signed) {
    const issued = rows
      .filter((row) => row.quoteId === root.id)
      .map((row) => ({ type: row.type, totalInclTax: row.totalInclTax }))
    signedNotInvoiced += Math.max(0, remainingToInvoice(root.totalInclTax, issued))
  }

  let invoicedOnTime = 0
  let overdue = 0

  for (const row of rows) {
    // Un avoir n'est pas une creance : il diminue ce qui est du, et il est deja
    // pris en compte par `remainingToInvoice`.
    if (row.type === 'credit_note') continue

    const payments = paid.filter((p) => p.invoiceId === row.id).map((p) => p.amount)
    const { withheld } = retentionState(
      { totalInclTax: row.totalInclTax, rate: row.retentionRate, receivedAt: row.receivedAt },
      now,
    )

    const settlement: Settlement = {
      totalInclTax: row.totalInclTax,
      payments,
      dueAt: row.dueAt,
      withheld,
    }

    const due = amountDueNow(settlement)
    if (due === 0) continue

    if (paymentStatus(settlement, now) === 'overdue') overdue += due
    else invoicedOnTime += due
  }

  const since = new Date(now)
  since.setMonth(since.getMonth() - MONTHS_12)

  const cashed = await db
    .select({ amount: payment.amount })
    .from(payment)
    .innerJoin(invoice, eq(payment.invoiceId, invoice.id))
    .where(and(eq(invoice.companyId, companyId), gte(payment.receivedAt, since)))

  return {
    signedNotInvoiced,
    invoicedOnTime,
    overdue,
    cashedLast12Months: cashed.reduce((sum, row) => sum + row.amount, 0),
  }
}
