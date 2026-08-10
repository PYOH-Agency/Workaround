import type { Cents } from './money'

/**
 * Statut de reglement d'une facture.
 *
 * Fonction pure prenant la date courante en parametre : un statut qui depend de
 * l'horloge est intestable si l'horloge est implicite.
 */
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'withheld' | 'overdue'

/**
 * Ce qu'il faut savoir pour statuer.
 *
 * **`withheld` est OBLIGATOIRE**, et ce n'est pas un oubli d'`?` : un appelant
 * qui l'omettrait reclamerait une somme que son client a le droit de garder.
 * Le rendre requis fait chercher les points d'appel par le compilateur plutot
 * que par la revue.
 */
export interface Settlement {
  totalInclTax: Cents
  payments: Cents[]
  dueAt: Date
  /** Ce que le client a le droit de retenir aujourd'hui — voir `retentionState`. */
  withheld: Cents
}

export function outstanding(totalInclTax: Cents, payments: Cents[]): Cents {
  const received = payments.reduce((sum, amount) => sum + amount, 0)
  return Math.max(0, totalInclTax - received)
}

/**
 * Ce qu'on peut reclamer AUJOURD'HUI.
 *
 * Distinct du reste du, qui est comptable : une somme legalement retenue reste
 * due, elle n'est simplement pas encore exigible. C'est ce montant-la, et lui
 * seul, que les relances poursuivront.
 */
export function amountDueNow(settlement: Settlement): Cents {
  const remaining = outstanding(settlement.totalInclTax, settlement.payments)
  return Math.max(0, remaining - settlement.withheld)
}

export function paymentStatus(settlement: Settlement, now: Date): PaymentStatus {
  const remaining = outstanding(settlement.totalInclTax, settlement.payments)

  // Le reglement l'emporte sur le retard : une facture soldee apres l'echeance
  // n'est plus en retard, elle est payee.
  if (remaining === 0) return 'paid'

  // **AVANT le retard, et c'est toute la decision du jalon.** Une somme retenue
  // n'est pas un impaye : ce qui reste est legitimement garde, pas oublie.
  if (remaining <= settlement.withheld) return 'withheld'

  if (now.getTime() > settlement.dueAt.getTime()) return 'overdue'

  return settlement.payments.length > 0 ? 'partially_paid' : 'unpaid'
}
