import { and, count, eq, gte, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, payment, quote } from '@/db/schema'
import type { Cents } from '@/domain/money'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { amountDueNow, paymentStatus, type Settlement } from '@/domain/payment-status'
import { referenceVersion } from '@/domain/quote-versions'
import { retentionState } from '@/domain/retention'
import { settlements } from '@/services/invoice-ledger'
import { quoteChains } from '@/services/quote-chains'

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

export async function moneyInFlight(companyId: string, now: Date): Promise<MoneyInFlight> {
  const chains = await quoteChains(companyId)
  const { rows, paid } = await settlements(companyId)

  let signedNotInvoiced = 0
  for (const versions of chains.values()) {
    /**
     * Le dernier avenant SIGNE fait foi.
     *
     * Un avenant remplace le total precedent, il ne s'y ajoute pas. Prendre la
     * version d'origine — celle dont `supersedesQuoteId` est nul — sous-
     * estimerait le carnet de commandes de tout ce qu'un avenant a ajoute ;
     * les additionner le doublerait. `quote-detail.ts` fait deja ce calcul, et
     * `initialTotal` n'existe que pour la metrique du passeport.
     */
    const engaged = referenceVersion(versions)?.totalInclTax
    if (engaged === undefined) continue

    const chain = new Set(versions.map((version) => version.id))
    const issued = rows
      .filter((row) => row.quoteId !== null && chain.has(row.quoteId))
      .map((row) => ({ type: row.type, totalInclTax: row.totalInclTax }))

    signedNotInvoiced += Math.max(0, remainingToInvoice(engaged, issued))
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

export interface MonthlyQuoteStats {
  /** Devis etablis ce mois-ci — racines seulement. */
  issued: number
  /** Parmi ceux-la, combien sont signes A CE JOUR. */
  signed: number
}

/**
 * Ce que la bande « Votre mois » annonce avec « dont ».
 *
 * **Les deux chiffres portent sur le meme ensemble**, sans quoi le « dont »
 * affirme un sous-ensemble qui n'existe pas : un devis cree en juillet et
 * signe en aout n'est établi ni signe « ce mois-ci » au sens de cette bande,
 * quelle que soit la date de sa signature.
 *
 * **Racines seulement** : un avenant est une nouvelle ligne, pas un nouveau
 * devis etabli — le compter grossirait artificiellement les deux chiffres.
 */
export async function monthlyQuoteStats(companyId: string, now: Date): Promise<MonthlyQuoteStats> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const establishedThisMonth = and(
    eq(quote.companyId, companyId),
    gte(quote.createdAt, monthStart),
    isNull(quote.supersedesQuoteId),
  )

  const [issued] = await db.select({ total: count() }).from(quote).where(establishedThisMonth)

  const [signed] = await db
    .select({ total: count() })
    .from(quote)
    .where(and(establishedThisMonth, eq(quote.status, 'signed')))

  return { issued: issued.total, signed: signed.total }
}
