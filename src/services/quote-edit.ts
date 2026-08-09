import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, quoteLine } from '@/db/schema'
import { computeTotals, type LineInput } from '@/domain/quote-totals'
import { recordEvent } from '@/services/events'

export interface EditableLine extends LineInput {
  label: string
  unit: string
}

export interface QuoteEdit {
  lines: EditableLine[]
  committedLeadTimeDays: number | null
}

/**
 * Modifie un devis **en brouillon**.
 *
 * Seul un brouillon se modifie. Un devis envoye est entre les mains du client :
 * le changer dans son dos rendrait le document qu'il detient different de celui
 * qu'on lui opposerait. Et un devis signe est un contrat — le modifier est
 * exactement ce que l'avenant existe pour eviter.
 *
 * Le client et le chantier ne sont pas touches : ils appartiennent au projet,
 * et les changer serait une autre operation.
 */
export async function updateDraftQuote(companyId: string, quoteId: string, edit: QuoteEdit) {
  const source = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.companyId, companyId)),
  })

  if (!source) throw new Error('Devis introuvable')
  if (source.status !== 'draft') {
    throw new Error('Seul un brouillon se modifie. Un devis signé se corrige par un avenant.')
  }
  if (edit.lines.length === 0) throw new Error('Un devis doit comporter au moins une ligne')

  const totals = computeTotals(edit.lines)

  const updated = await db.transaction(async (tx) => {
    // Les lignes sont remplacees en bloc : suivre les ajouts, retraits et
    // deplacements un par un produirait un code plus long pour un resultat
    // identique — le brouillon n'a aucune histoire a preserver.
    await tx.delete(quoteLine).where(eq(quoteLine.quoteId, quoteId))

    await tx.insert(quoteLine).values(
      edit.lines.map((line, i) => ({
        quoteId,
        position: i,
        label: line.label,
        unit: line.unit,
        quantity: line.quantity,
        unitPriceExclTax: line.unitPriceExclTax,
        taxRate: line.taxRate,
      })),
    )

    const [row] = await tx
      .update(quote)
      .set({
        committedLeadTimeDays: edit.committedLeadTimeDays,
        totalExclTax: totals.totalExclTax,
        totalTax: totals.totalTax,
        totalInclTax: totals.totalInclTax,
      })
      .where(eq(quote.id, quoteId))
      .returning()

    return row
  })

  await recordEvent({
    type: 'quote.updated',
    subjectType: 'quote',
    subjectId: quoteId,
    companyId,
    actorType: 'company',
    payload: { totalInclTax: totals.totalInclTax, lines: edit.lines.length },
  })

  return updated
}
