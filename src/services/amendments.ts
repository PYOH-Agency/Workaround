import { randomBytes } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, quote, quoteLine } from '@/db/schema'
import { assertAmendable, referenceVersion, type QuoteVersion } from '@/domain/quote-versions'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { recordEvent } from '@/services/events'

/**
 * La racine de la chaine de versions.
 *
 * **Les factures s'y attachent toujours.** M2 n'a pas a connaitre l'existence
 * des avenants : il facture un chantier, et le chantier est identifie par son
 * devis d'origine.
 */
export async function rootQuoteId(quoteId: string): Promise<string> {
  let current = await db.query.quote.findFirst({ where: eq(quote.id, quoteId) })
  if (!current) throw new Error('Devis introuvable')

  // La chaine est courte par construction — un avenant a la fois — mais la
  // borne evite qu'une donnee corrompue fasse tourner en boucle.
  for (let hop = 0; current.supersedesQuoteId && hop < 50; hop++) {
    const previous = await db.query.quote.findFirst({
      where: eq(quote.id, current.supersedesQuoteId),
    })
    if (!previous) break
    current = previous
  }

  return current.id
}

/** Toutes les versions d'un devis, de la plus ancienne a la plus recente. */
export async function quoteVersions(anyVersionId: string): Promise<QuoteVersion[]> {
  const root = await db.query.quote.findFirst({
    where: eq(quote.id, await rootQuoteId(anyVersionId)),
  })
  if (!root) throw new Error('Devis introuvable')

  return db
    .select({
      id: quote.id,
      version: quote.version,
      status: quote.status,
      totalInclTax: quote.totalInclTax,
    })
    .from(quote)
    .where(and(eq(quote.companyId, root.companyId), eq(quote.number, root.number)))
    .orderBy(asc(quote.version))
}

/**
 * Cree un avenant : une nouvelle version, reprenant les lignes de la
 * precedente.
 *
 * Elle nait en brouillon et suit ensuite le parcours de M1 — envoi, puis
 * signature par le client. **Tant qu'elle n'est pas signee, elle n'engage
 * personne** et ne change aucun plafond de facturation.
 */
export async function createAmendment(companyId: string, fromQuoteId: string) {
  const root = await rootQuoteId(fromQuoteId)
  const versions = await quoteVersions(root)

  const issued = await db
    .select({ type: invoice.type, totalInclTax: invoice.totalInclTax })
    .from(invoice)
    .where(eq(invoice.quoteId, root))

  const reference = referenceVersion(versions)
  const invoiced = reference
    ? reference.totalInclTax - remainingToInvoice(reference.totalInclTax, issued)
    : 0

  assertAmendable(versions, invoiced)

  const latest = await db.query.quote.findFirst({
    where: eq(quote.id, versions[versions.length - 1].id),
    with: { lines: true },
  })
  if (!latest || latest.companyId !== companyId) throw new Error('Devis introuvable')

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(quote)
      .values({
        projectId: latest.projectId,
        companyId,
        number: latest.number,
        version: latest.version + 1,
        status: 'draft',
        committedLeadTimeDays: latest.committedLeadTimeDays,
        validityDays: latest.validityDays,
        totalExclTax: latest.totalExclTax,
        totalTax: latest.totalTax,
        totalInclTax: latest.totalInclTax,
        publicToken: randomBytes(24).toString('base64url'),
        supersedesQuoteId: latest.id,
      })
      .returning()

    await tx.insert(quoteLine).values(
      [...latest.lines]
        .sort((a, b) => a.position - b.position)
        .map((line, i) => ({
          quoteId: row.id,
          position: i,
          label: line.label,
          unit: line.unit,
          quantity: line.quantity,
          unitPriceExclTax: line.unitPriceExclTax,
          taxRate: line.taxRate,
        })),
    )

    return row
  })

  await recordEvent({
    type: 'quote.amended',
    subjectType: 'quote',
    subjectId: created.id,
    companyId,
    actorType: 'company',
    payload: { number: created.number, version: created.version },
  })

  return created
}
