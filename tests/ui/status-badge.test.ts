import { describe, expect, it } from 'vitest'
import type { PaymentStatus } from '@/domain/payment-status'
import { PAYMENT_STATUS, QUOTE_STATUS } from '@/ui/molecules/status-badge'

/**
 * Le rendu n'est pas testable en environnement `node`, mais la table de
 * correspondance l'est — et c'est elle qui porte le risque : un statut oublie
 * n'afficherait aucune pastille, sans que rien ne le signale.
 */
describe('correspondance des statuts', () => {
  it('couvre tous les statuts de devis du schema', () => {
    expect(Object.keys(QUOTE_STATUS).sort()).toEqual(
      ['draft', 'expired', 'refused', 'sent', 'signed'],
    )
  })

  it('couvre tous les statuts de paiement du domaine', () => {
    const all: PaymentStatus[] = ['unpaid', 'partially_paid', 'paid', 'overdue']
    expect(Object.keys(PAYMENT_STATUS).sort()).toEqual([...all].sort())
  })

  it("n'utilise jamais le ton neutre pour un etat problematique", () => {
    expect(QUOTE_STATUS.refused.tone).toBe('danger')
    expect(QUOTE_STATUS.expired.tone).toBe('danger')
    expect(PAYMENT_STATUS.overdue.tone).toBe('danger')
  })

  it('chaque entree porte un pictogramme', () => {
    for (const entry of [...Object.values(QUOTE_STATUS), ...Object.values(PAYMENT_STATUS)]) {
      expect(entry.icon).toBeTruthy()
    }
  })
})
