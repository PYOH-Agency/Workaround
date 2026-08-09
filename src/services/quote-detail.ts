import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { businessDaysSince } from '@/domain/business-days'
import { assertDisputable } from '@/domain/dispute'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { computeTotals } from '@/domain/quote-totals'
import { engagedTotal, referenceVersion } from '@/domain/quote-versions'
import { quoteVersions } from '@/services/amendments'
import { disputeFor } from '@/services/disputes'
import { issuedAgainstQuote } from '@/services/invoices'
import { statementFor } from '@/services/statements'

/**
 * Tout ce que la fiche d'un devis a besoin de savoir, en un seul appel.
 *
 * La fiche est passee de cinq blocs a une douzaine au fil des jalons, et son
 * chargement occupait la moitie du fichier — au point qu'il ne restait plus la
 * place d'y ranger l'affichage. Le sortir ici rend surtout testable la seule
 * chose qui merite de l'etre : **dans quel etat est ce devis**, question dont
 * chaque section de l'ecran depend.
 *
 * `null` quand le devis n'existe pas ou n'appartient pas a l'entreprise. Les
 * deux cas se confondent volontairement : distinguer « inexistant » de « pas a
 * vous » dirait a un curieux que l'identifiant qu'il a tente existe.
 */
export async function quoteDetail(quoteId: string, companyId: string, now: Date) {
  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.companyId, companyId)),
    with: { lines: true, project: { with: { customer: true, property: true } } },
  })

  if (!found) return null

  const versions = await quoteVersions(found.id)
  const reference = referenceVersion(versions)
  const dispute = await disputeFor(found.id)
  const statement = await statementFor(found.id)
  const issued = await issuedAgainstQuote(found.id)

  const invoices = await db
    .select({
      id: invoice.id,
      number: invoice.number,
      type: invoice.type,
      totalInclTax: invoice.totalInclTax,
    })
    .from(invoice)
    .where(eq(invoice.quoteId, found.id))
    .orderBy(invoice.number)

  return {
    quote: found,
    now,
    lines: [...found.lines].sort((a, b) => a.position - b.position),
    totals: computeTotals(found.lines),
    versions,
    dispute,
    statement,
    invoices,
    remaining: remainingToInvoice(engagedTotal(versions), issued),

    /**
     * La version signee qui fait foi, s'il y en a une. C'est elle — et non le
     * statut du devis courant — qui autorise a declarer le chantier termine :
     * apres un avenant, le devis ouvert peut etre un brouillon alors qu'une
     * version signee court deja.
     */
    reference,

    /** Un avenant se cree sur une version signee, et une seule a la fois. */
    amendable:
      versions.length > 0 &&
      reference !== null &&
      !versions.some((v) => v.status === 'draft' || v.status === 'sent'),

    /**
     * La MEME fonction que le service qui execute : l'ecran ne peut pas proposer
     * ce que le service refusera, ni le cacher quand il l'accepterait.
     */
    disputable: canDispute(found, dispute),
  }
}

export type QuoteDetail = NonNullable<Awaited<ReturnType<typeof quoteDetail>>>

function canDispute(
  found: { completedAt: Date | null; committedLeadTimeDays: number | null; signedAt: Date | null },
  existing: Parameters<typeof assertDisputable>[0]['existing'],
): boolean {
  try {
    assertDisputable({
      completedAt: found.completedAt,
      committedLeadTimeDays: found.committedLeadTimeDays,
      businessDaysUsed:
        found.signedAt && found.completedAt
          ? businessDaysSince(found.signedAt, found.completedAt)
          : 0,
      existing,
      // Le motif ne participe pas a la decision d'eligibilite ; il est valide
      // par ailleurs, a la soumission.
      reason: 'placeholder',
    })
    return true
  } catch {
    return false
  }
}
