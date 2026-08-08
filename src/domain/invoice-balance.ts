import type { Cents } from './money'

/**
 * Reste a facturer sur un devis signe.
 *
 * Le montant ne se saisit pas, il se calcule : total du devis, moins les
 * factures emises, plus les avoirs. Laisser l'artisan saisir un solde libre
 * garantirait des ecarts avec le devis — or l'ecart devis/facture est la
 * metrique reine du passeport.
 */
export type InvoiceType = 'deposit' | 'progress' | 'balance' | 'credit_note'

export interface IssuedInvoice {
  type: InvoiceType
  totalInclTax: Cents
}

export function remainingToInvoice(quoteTotalInclTax: Cents, issued: IssuedInvoice[]): Cents {
  const invoiced = issued.reduce(
    (sum, i) => (i.type === 'credit_note' ? sum - i.totalInclTax : sum + i.totalInclTax),
    0,
  )
  return quoteTotalInclTax - invoiced
}

export function assertInvoiceable(
  quoteTotalInclTax: Cents,
  issued: IssuedInvoice[],
  amountInclTax: Cents,
): void {
  if (amountInclTax <= 0) throw new Error('Le montant doit etre positif')

  const remaining = remainingToInvoice(quoteTotalInclTax, issued)
  if (remaining <= 0) throw new Error('Ce devis est deja integralement facture')

  if (amountInclTax > remaining) {
    throw new Error(
      'Ce montant depasse le reste a facturer. Un depassement passe par un avenant au devis.',
    )
  }
}
