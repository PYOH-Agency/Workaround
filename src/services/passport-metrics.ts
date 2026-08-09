import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, metricDispute, quote } from '@/db/schema'
import { computeMetrics, type CompletedChantier, type Metrics } from '@/domain/passport-metrics'

/**
 * L'instantane des chantiers termines d'une entreprise, puis le calcul.
 *
 * **Les exclusions sont portees par la requete**, jamais par un filtre
 * d'affichage — comme l'exige l'AIPD pour tout ce qui est publie. Un chantier
 * n'entre que s'il est signe, termine, et racine de sa chaine de versions.
 */
export async function companyMetrics(companyId: string, now: Date): Promise<Metrics> {
  const roots = await db
    .select({
      id: quote.id,
      signedAt: quote.signedAt,
      completedAt: quote.completedAt,
      committedLeadTimeDays: quote.committedLeadTimeDays,
      initialTotalInclTax: quote.totalInclTax,
      // La contestation vient de la REQUETE, pas d'un filtre applique ensuite :
      // un ecran qui oublierait de filtrer publierait un chiffre conteste.
      disputeExpiresAt: metricDispute.expiresAt,
      disputeVerdict: metricDispute.verdict,
    })
    .from(quote)
    // Jointure GAUCHE : un chantier sans contestation reste dans l'instantane.
    .leftJoin(metricDispute, eq(metricDispute.quoteId, quote.id))
    .where(
      and(
        eq(quote.companyId, companyId),
        eq(quote.status, 'signed'),
        isNotNull(quote.completedAt),
        isNotNull(quote.signedAt),
        // La racine seule : un avenant n'est pas un chantier de plus.
        isNull(quote.supersedesQuoteId),
      ),
    )

  const chantiers: CompletedChantier[] = []

  for (const root of roots) {
    const issued = await db
      .select({ type: invoice.type, totalInclTax: invoice.totalInclTax })
      .from(invoice)
      .where(eq(invoice.quoteId, root.id))

    const invoiced = issued.reduce(
      (sum, i) => (i.type === 'credit_note' ? sum - i.totalInclTax : sum + i.totalInclTax),
      0,
    )

    chantiers.push({
      signedAt: root.signedAt!,
      completedAt: root.completedAt!,
      committedLeadTimeDays: root.committedLeadTimeDays,
      // Le total de la RACINE, que les avenants ne modifient pas : M5·A cree
      // une nouvelle ligne plutot que de toucher la precedente.
      initialTotalInclTax: root.initialTotalInclTax,
      invoicedInclTax: invoiced,
      // L'etat se deduit de l'echeance au moment du calcul : rien n'est stocke,
      // donc rien ne peut rester exclu apres la fin du delai.
      dispute: root.disputeExpiresAt
        ? { expiresAt: root.disputeExpiresAt, verdict: root.disputeVerdict }
        : null,
    })
  }

  return computeMetrics(chantiers, now)
}
