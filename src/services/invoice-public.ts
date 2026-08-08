import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice } from '@/db/schema'
import { computeTotals, type Totals } from '@/domain/quote-totals'
import { outstanding, paymentStatus, type PaymentStatus } from '@/domain/payment-status'
import type { InvoiceType } from '@/domain/invoice-balance'
import type { CompanyLegalDetails } from '@/domain/legal-mentions'

export interface InvoiceLineView {
  label: string
  unit: string
  quantity: string
  unitPriceExclTax: number
  taxRate: number
}

export interface PublicInvoice {
  id: string
  number: string
  type: InvoiceType
  issuedOn: string
  dueOn: string
  company: { legalName: string; siret: string; address: string; legal: CompanyLegalDetails }
  customer: { name: string; siret: string | null; isIndividual: boolean; propertyAddress: string }
  lines: InvoiceLineView[]
  totals: Totals
  outstandingInclTax: number
  status: PaymentStatus
  latePaymentRate: string
  recoveryIndemnity: number
}

/**
 * Charge une facture depuis son jeton public, sans session.
 *
 * Les trois totaux affiches sont ceux **figes a l'emission**, jamais recalcules :
 * une facture est immuable, et un changement futur de la regle d'arrondi ne doit
 * pas modifier en silence un document deja remis au client. Seule la ventilation
 * de TVA est recalculee depuis les lignes — elle n'est pas stockee, et les lignes
 * le sont.
 */
export async function loadInvoiceByToken(token: string): Promise<PublicInvoice | null> {
  const found = await db.query.invoice.findFirst({
    where: eq(invoice.publicToken, token),
    with: {
      lines: true,
      payments: true,
      project: { with: { company: true, customer: true, property: true } },
    },
  })

  if (!found) return null

  const { company, customer, property } = found.project
  const received = found.payments.map((p) => p.amount)

  return {
    id: found.id,
    number: found.number,
    type: found.type,
    issuedOn: found.issuedAt.toLocaleDateString('fr-FR'),
    dueOn: found.dueAt.toLocaleDateString('fr-FR'),
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
    },
    customer: {
      name: customer.name,
      siret: customer.siret,
      isIndividual: customer.type === 'individual',
      propertyAddress: [property.addressLine1, property.postalCode, property.city].join(' '),
    },
    lines: [...found.lines]
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        label: line.label,
        unit: line.unit,
        quantity: line.quantity,
        unitPriceExclTax: line.unitPriceExclTax,
        taxRate: line.taxRate,
      })),
    totals: {
      totalExclTax: found.totalExclTax,
      totalTax: found.totalTax,
      totalInclTax: found.totalInclTax,
      byRate: computeTotals(found.lines).byRate,
    },
    outstandingInclTax: outstanding(found.totalInclTax, received),
    status: paymentStatus(found.totalInclTax, received, found.dueAt, new Date()),
    latePaymentRate: found.latePaymentRate,
    recoveryIndemnity: found.recoveryIndemnity,
  }
}
