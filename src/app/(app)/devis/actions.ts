'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, quoteLine } from '@/db/schema'
import { computeTotals, type Totals } from '@/domain/quote-totals'
import { toCents } from '@/domain/money'
import { nextQuoteNumber } from '@/services/quotes'
import { createProject } from '@/services/projects'
import { recordEvent } from '@/services/events'
import { currentCompany } from '@/lib/session'
import { readLines, type LineFormInput } from './form-lines'

export interface QuoteFormState {
  error?: string
}

export async function saveQuote(
  _state: QuoteFormState,
  form: FormData,
): Promise<QuoteFormState> {
  const { companyId } = await currentCompany()

  let lines: LineFormInput[]
  try {
    lines = readLines(form)
  } catch (e) {
    return { error: (e as Error).message }
  }

  if (lines.length === 0) return { error: 'Ajoutez au moins une ligne au devis.' }

  const customerType = String(form.get('client_type') || 'particulier') === 'professionnel'
    ? 'business'
    : 'individual'

  let created
  try {
    const { project } = await createProject({
      companyId,
      customer: {
        name: String(form.get('client_nom') ?? ''),
        email: String(form.get('client_email') ?? ''),
        phone: String(form.get('client_telephone') ?? ''),
        type: customerType,
        siret: String(form.get('client_siret') || '') || undefined,
      },
      address: {
        line1: String(form.get('adresse_ligne1') ?? ''),
        postalCode: String(form.get('adresse_code_postal') ?? ''),
        city: String(form.get('adresse_ville') ?? ''),
      },
      label: String(form.get('libelle') || 'Devis'),
    })

    const totals = computeTotals(lines)
    const leadTime = form.get('delai') ? Number(form.get('delai')) : null
    const validityDays = Number(form.get('validity_days')) || 90

    created = await insertWithNumber(companyId, project.id, totals, leadTime, validityDays, lines)
  } catch (e) {
    return { error: (e as Error).message }
  }

  await recordEvent({
    type: 'quote.created',
    subjectType: 'quote',
    subjectId: created.id,
    companyId,
    actorType: 'company',
    payload: { number: created.number, totalInclTax: created.totalInclTax },
  })

  redirect(`/devis/${created.id}`)
}

/**
 * La numerotation lit le maximum puis ecrit : deux devis crees simultanement
 * peuvent viser le meme numero. La contrainte d'unicite (entreprise, numero,
 * version) rejette alors le second — on retente plutot que de renvoyer a
 * l'artisan une erreur qu'il ne peut pas comprendre.
 */
async function insertWithNumber(
  companyId: string,
  projectId: string,
  totals: Totals,
  committedLeadTimeDays: number | null,
  validityDays: number,
  lines: LineFormInput[],
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db
      .select({ number: quote.number })
      .from(quote)
      .where(eq(quote.companyId, companyId))

    const number = nextQuoteNumber(
      existing.map((q) => q.number),
      new Date().getFullYear(),
    )

    try {
      const [created] = await db
        .insert(quote)
        .values({
          projectId,
          companyId,
          number,
          committedLeadTimeDays,
          validityDays,
          publicToken: randomBytes(24).toString('base64url'),
          totalExclTax: totals.totalExclTax,
          totalTax: totals.totalTax,
          totalInclTax: totals.totalInclTax,
        })
        .returning()

      await db.insert(quoteLine).values(
        lines.map((line, i) => ({
          quoteId: created.id,
          position: i,
          label: line.label,
          unit: line.unit,
          quantity: line.quantity,
          unitPriceExclTax: line.unitPriceExclTax,
          taxRate: line.taxRate,
        })),
      )

      return created
    } catch (e) {
      const cause = String((e as Error).cause ?? e)
      if (!cause.includes('quote_number_version_uq')) throw e
      // Numero pris entre-temps : on relit et on retente.
    }
  }

  throw new Error("Impossible d'attribuer un numéro de devis. Réessayez.")
}
