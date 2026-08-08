import type { Cents } from './money'

/**
 * Statut de reglement d'une facture.
 *
 * Fonction pure prenant la date courante en parametre : un statut qui depend de
 * l'horloge est intestable si l'horloge est implicite.
 */
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue'

export function outstanding(totalInclTax: Cents, payments: Cents[]): Cents {
  const received = payments.reduce((sum, amount) => sum + amount, 0)
  return Math.max(0, totalInclTax - received)
}

export function paymentStatus(
  totalInclTax: Cents,
  payments: Cents[],
  dueAt: Date,
  now: Date,
): PaymentStatus {
  const remaining = outstanding(totalInclTax, payments)

  // Le reglement l'emporte sur le retard : une facture soldee apres l'echeance
  // n'est plus en retard, elle est payee.
  if (remaining === 0) return 'paid'
  if (now.getTime() > dueAt.getTime()) return 'overdue'

  return payments.length > 0 ? 'partially_paid' : 'unpaid'
}
