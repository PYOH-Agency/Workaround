/**
 * Numerotation des factures.
 *
 * Contrairement au devis, la sequence doit etre **continue et sans trou** :
 * c'est une obligation comptable. Ce module ne fait que le formatage —
 * l'attribution du rang est serialisee en base (voir src/services/invoices.ts).
 */
export const INVOICE_PREFIX = 'F'

export function formatInvoiceNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Rang de sequence invalide : ${sequence}`)
  }
  return `${INVOICE_PREFIX}${year}-${String(sequence).padStart(4, '0')}`
}
