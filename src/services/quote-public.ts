import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { computeTotals, type Totals } from '@/domain/quote-totals'

export interface SendableState {
  status: string
  committedLeadTimeDays: number | null
  lineCount: number
  customerPhone: string | null
}

/**
 * Conditions d'envoi d'un devis. Fonction pure, testee isolement.
 *
 * Les deux exigences non evidentes viennent du produit, pas du droit :
 * l'engagement de delai est ce que la metrique « respect du delai annonce »
 * comparera, et le telephone du client porte l'identification du signataire
 * par SMS.
 */
export function assertSendable(state: SendableState): void {
  if (state.status !== 'draft') throw new Error('Ce devis a deja ete envoye')
  if (state.lineCount === 0) throw new Error('Un devis doit comporter au moins une ligne')
  if (state.committedLeadTimeDays === null) throw new Error("Le delai d'execution est obligatoire")
  if (!state.customerPhone?.trim()) throw new Error('Le telephone du client est obligatoire')
}

export interface QuoteLineView {
  label: string
  unit: string
  quantity: string
  unitPriceExclTax: number
  taxRate: number
}

export interface PublicQuote {
  id: string
  status: 'draft' | 'sent' | 'signed' | 'refused' | 'expired'
  companyId: string
  number: string
  issuedOn: string
  company: { legalName: string; siret: string; address: string }
  customer: { name: string; phone: string | null; propertyAddress: string }
  committedLeadTimeDays: number | null
  lines: QuoteLineView[]
  totals: Totals
}

/**
 * Charge un devis depuis son jeton public, sans session.
 *
 * C'est la seule porte d'entree du cote client : il n'a pas de compte, le
 * jeton fait office d'autorisation.
 */
export async function loadQuoteByToken(token: string): Promise<PublicQuote | null> {
  const found = await db.query.quote.findFirst({
    where: eq(quote.publicToken, token),
    with: {
      lines: true,
      project: { with: { company: true, customer: true, property: true } },
    },
  })

  if (!found) return null

  const { company, customer, property } = found.project

  return {
    id: found.id,
    status: found.status,
    companyId: company.id,
    number: found.number,
    issuedOn: (found.sentAt ?? found.createdAt).toLocaleDateString('fr-FR'),
    company: {
      legalName: company.legalName,
      siret: company.siret,
      address: [company.addressLine1, company.postalCode, company.city].filter(Boolean).join(' '),
    },
    customer: {
      name: customer.name,
      phone: customer.phone,
      propertyAddress: [property.addressLine1, property.postalCode, property.city].join(' '),
    },
    committedLeadTimeDays: found.committedLeadTimeDays,
    lines: [...found.lines]
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        label: line.label,
        unit: line.unit,
        quantity: line.quantity,
        unitPriceExclTax: line.unitPriceExclTax,
        taxRate: line.taxRate,
      })),
    totals: computeTotals(found.lines),
  }
}
