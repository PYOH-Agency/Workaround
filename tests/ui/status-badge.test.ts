import { describe, expect, it } from 'vitest'
import type { PaymentStatus } from '@/domain/payment-status'
import { paymentBadges, quoteBadges } from '@/ui/molecules/status-badge'

/**
 * Le rendu n'est pas testable en environnement `node`, mais la table de
 * correspondance l'est — et c'est elle qui porte le risque : un statut oublie
 * n'afficherait aucune pastille, sans que rien ne le signale.
 */
describe('correspondance des statuts', () => {
  it('couvre tous les statuts de devis du schema', () => {
    expect(Object.keys(quoteBadges).sort()).toEqual(
      ['draft', 'expired', 'refused', 'sent', 'signed'],
    )
  })

  it('couvre tous les statuts de paiement du domaine', () => {
    // `withheld` est arrive en M8·B : ni payee, ni en retard — une somme
    // legalement retenue, qui merite sa propre pastille plutot que d'emprunter
    // celle d'un impaye.
    const all: PaymentStatus[] = ['unpaid', 'partially_paid', 'paid', 'withheld', 'overdue']
    expect(Object.keys(paymentBadges).sort()).toEqual([...all].sort())
  })

  it("n'utilise jamais le ton neutre pour un etat problematique", () => {
    expect(quoteBadges.refused.tone).toBe('danger')
    expect(quoteBadges.expired.tone).toBe('danger')
    expect(paymentBadges.overdue.tone).toBe('danger')
  })

  it('chaque entree porte un pictogramme', () => {
    for (const entry of [...Object.values(quoteBadges), ...Object.values(paymentBadges)]) {
      expect(entry.icon).toBeTruthy()
    }
  })
})
