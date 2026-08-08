import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { computeTotals, type Totals } from '@/domain/quote-totals'
import { passportUrl } from '@/services/passport'
import type { CompanyLegalDetails } from '@/domain/legal-mentions'

export interface SendableState {
  status: string
  committedLeadTimeDays: number | null
  lineCount: number
  customerPhone: string | null
  hasInsuranceMentions: boolean
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
  // Garde de derniere ligne : la redaction est deja bloquee sans ces mentions,
  // mais un devis anterieur a leur mise en place ne doit pas passer non plus.
  if (!state.hasInsuranceMentions) {
    throw new Error("Renseignez les mentions obligatoires avant d'envoyer un devis")
  }
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
  company: {
    legalName: string
    siret: string
    address: string
    legal: CompanyLegalDetails
    /** Adresse du passeport, ou `null` : toute entreprise n'a pas de page publique. */
    passportUrl: string | null
  }
  customer: {
    id: string
    name: string
    phone: string | null
    isIndividual: boolean
    propertyAddress: string
  }
  committedLeadTimeDays: number | null
  validityDays: number
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
      legal: {
        legalFormLabel: company.legalFormLabel,
        registrationNumber: company.registrationNumber,
        phone: company.phone,
        email: company.email,
        vatNumber: company.vatNumber,
        vatExempt: company.vatExempt,
        paymentTerms: company.paymentTerms,
        insurerName: company.insurerName,
        insurerAddress: company.insurerAddress,
        policyNumber: company.policyNumber,
        coveredActivities: company.coveredActivities,
        coverageArea: company.coverageArea,
      },
      passportUrl: await passportUrl(company, new Date()),
    },
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      isIndividual: customer.type === 'individual',
      propertyAddress: [property.addressLine1, property.postalCode, property.city].join(' '),
    },
    committedLeadTimeDays: found.committedLeadTimeDays,
    validityDays: found.validityDays,
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
