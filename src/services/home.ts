import { and, eq, gte } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, payment, quote } from '@/db/schema'
import type { Cents } from '@/domain/money'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { amountDueNow, paymentStatus, type Settlement } from '@/domain/payment-status'
import { referenceVersion, type QuoteVersion } from '@/domain/quote-versions'
import { retentionState } from '@/domain/retention'
import { settlements } from '@/services/invoice-ledger'

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

/**
 * Les devis d'une entreprise, ranges par chaine de versions.
 *
 * En memoire et non par requete : `rootQuoteId` remonte la chaine d'un devis a
 * coups d'aller-retour, ce qui convient a une action mais pas a un ecran qui
 * les traite tous.
 *
 * **Tous les statuts, et c'est indispensable.** Un maillon refuse ou expire
 * relie quand meme sa version suivante a la racine : filtrer `signed` dans la
 * requete couperait la chaine en deux, et un chantier a trois versions dont la
 * deuxieme fut refusee se compterait deux fois. `passport-metrics.ts` filtre le
 * statut en SQL parce qu'il ne remonte aucune chaine — ne pas aligner les deux.
 */
async function quoteChains(companyId: string): Promise<Map<string, QuoteVersion[]>> {
  const rows = await db
    .select({
      id: quote.id,
      version: quote.version,
      status: quote.status,
      totalInclTax: quote.totalInclTax,
      signedAt: quote.signedAt,
      supersedesQuoteId: quote.supersedesQuoteId,
    })
    .from(quote)
    .where(eq(quote.companyId, companyId))

  const supersedes = new Map(rows.map((row) => [row.id, row.supersedesQuoteId]))

  /** La racine : c'est a elle que les factures restent attachees. */
  const rootOf = (id: string): string => {
    let current = id
    // Borne identique a celle de `rootQuoteId` : une donnee corrompue ne doit
    // pas faire tourner l'accueil en boucle.
    for (let hop = 0; hop < 50 && supersedes.get(current); hop++) {
      current = supersedes.get(current)!
    }
    return current
  }

  const chains = new Map<string, QuoteVersion[]>()
  for (const row of rows) {
    const root = rootOf(row.id)
    chains.set(root, [...(chains.get(root) ?? []), row])
  }

  return chains
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
