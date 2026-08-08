import { describe, expect, it } from 'vitest'
import type { PaymentStatus } from '@/domain/payment-status'
import { paymentStatus, quoteStatus } from '@/ui/molecules/status-badge'

/**
 * Le rendu n'est pas testable en environnement `node`, mais la table de
 * correspondance l'est — et c'est elle qui porte le risque : un statut oublie
 * n'afficherait aucune pastille, sans que rien ne le signale.
 */
describe('correspondance des statuts', () => {
  it('couvre tous les statuts de devis du schema', () => {
    expect(Object.keys(quoteStatus).sort()).toEqual(
      ['draft', 'expired', 'refused', 'sent', 'signed'],
    )
  })

  it('couvre tous les statuts de paiement du domaine', () => {
    const all: PaymentStatus[] = ['unpaid', 'partially_paid', 'paid', 'overdue']
    expect(Object.keys(paymentStatus).sort()).toEqual([...all].sort())
  })

  it("n'utilise jamais le ton neutre pour un etat problematique", () => {
    expect(quoteStatus.refused.tone).toBe('danger')
    expect(quoteStatus.expired.tone).toBe('danger')
    expect(paymentStatus.overdue.tone).toBe('danger')
  })

  it('chaque entree porte un pictogramme', () => {
    for (const entry of [...Object.values(quoteStatus), ...Object.values(paymentStatus)]) {
      expect(entry.icon).toBeTruthy()
    }
  })
})
