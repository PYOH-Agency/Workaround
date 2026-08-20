import { describe, it, expect } from 'vitest'
import { frenchVatNumber, sirenFromSiret } from '@/domain/vat-number'
import {
  missingLegalMentions,
  hasLegalMentions,
  missingInvoiceMentions,
  LEGAL_RECOVERY_INDEMNITY_CENTS,
  MENTION_GROUP_OF,
  missingMentionGroups,
} from '@/domain/legal-mentions'

describe('numero de TVA intracommunautaire', () => {
  it('extrait le SIREN des neuf premiers chiffres du SIRET', () => {
    expect(sirenFromSiret('50769820700036')).toBe('507698207')
  })

  it('calcule la cle a partir du SIREN', () => {
    // Cle = (12 + 3 x (SIREN mod 97)) mod 97.
    // Valeurs confrontees aux numeros reels publies par l'annuaire des
    // entreprises, et non ecrites de memoire.
    expect(frenchVatNumber('507698207')).toBe('FR51507698207')
    expect(frenchVatNumber('751353731')).toBe('FR37751353731')
    expect(frenchVatNumber('991747114')).toBe('FR27991747114')
  })

  it('refuse un SIREN malforme', () => {
    expect(() => frenchVatNumber('123')).toThrow('SIREN')
  })
})

const complete = {
  legalFormLabel: 'SASU',
  registrationNumber: 'RCS Bordeaux 507 698 207',
  phone: '0556000000',
  email: 'contact@bd-plomberie.fr',
  vatNumber: 'FR51507698207',
  vatExempt: false,
  quoteValidityDays: 90,
  paymentTerms: 'Acompte de 30 % à la commande, solde à la réception.',
  insurerName: 'SMABTP',
  insurerAddress: '114 avenue Émile Zola, 75015 Paris',
  policyNumber: 'D-2024-889321',
  coveredActivities: 'Plomberie',
  coverageArea: 'France métropolitaine',
}

describe('mentions obligatoires du devis', () => {
  it('accepte un dossier complet', () => {
    expect(missingLegalMentions(complete)).toEqual([])
    expect(hasLegalMentions(complete)).toBe(true)
  })

  it('exige aussi les mentions d assurance', () => {
    expect(missingLegalMentions({ ...complete, policyNumber: null })).toEqual(['policyNumber'])
  })

  it('accepte l absence de numero de TVA en franchise en base', () => {
    // L'artisan en franchise porte « TVA non applicable, art. 293 B du CGI ».
    expect(missingLegalMentions({ ...complete, vatNumber: null, vatExempt: true })).toEqual([])
  })

  it('exige le numero de TVA si l entreprise y est assujettie', () => {
    expect(missingLegalMentions({ ...complete, vatNumber: null, vatExempt: false })).toEqual([
      'vatNumber',
    ])
  })

  it('refuse une duree de validite absente ou nulle', () => {
    expect(missingLegalMentions({ ...complete, quoteValidityDays: null })).toEqual([
      'quoteValidityDays',
    ])
    expect(missingLegalMentions({ ...complete, quoteValidityDays: 0 })).toEqual([
      'quoteValidityDays',
    ])
  })

  it('liste toutes les mentions manquantes d un dossier vide', () => {
    expect(missingLegalMentions({}).length).toBeGreaterThan(8)
  })
})

describe('mentions propres a la facture', () => {
  const base = { ...complete, latePaymentRate: 'trois fois le taux d’intérêt légal' }

  it('accepte un dossier complet', () => {
    expect(missingInvoiceMentions(base)).toEqual([])
  })

  it('exige le taux des penalites de retard', () => {
    // Articles L441-9 et D441-5 du Code de commerce.
    expect(missingInvoiceMentions({ ...base, latePaymentRate: null })).toEqual(['latePaymentRate'])
  })

  it('exige toutes les mentions deja requises pour le devis', () => {
    expect(missingInvoiceMentions({ ...base, policyNumber: null })).toContain('policyNumber')
  })

  it("n'exige pas la duree de validite, qui n'a de sens que sur un devis", () => {
    // Une facture ne se perime pas : exiger ce reglage bloquerait l'emission
    // pour une raison qui ne concerne pas la facture.
    expect(missingInvoiceMentions({ ...base, quoteValidityDays: null })).toEqual([])
  })

  it("fixe l'indemnite de recouvrement a 40 EUR", () => {
    // Montant fixe par la loi : il n'est pas parametrable.
    expect(LEGAL_RECOVERY_INDEMNITY_CENTS).toBe(4000)
  })
})

describe('le regroupement des mentions manquantes', () => {
  it('rend les trois groupes pour une entreprise vide', () => {
    expect(missingMentionGroups({})).toEqual(['contact', 'insurance', 'terms'])
  })

  it('ne rend rien quand tout est renseigne', () => {
    expect(
      missingMentionGroups({
        legalFormLabel: 'SARL',
        registrationNumber: 'RCS Nantes 000 000 000',
        phone: '0240000000',
        email: 'contact@test.local',
        paymentTerms: 'Solde à réception.',
        vatNumber: 'FR00000000000',
        quoteValidityDays: 90,
        insurerName: 'SMABTP',
        insurerAddress: '114 avenue Émile Zola, 75015 Paris',
        policyNumber: 'D-2026-000999',
        coveredActivities: 'Plomberie',
        coverageArea: 'France métropolitaine',
      }),
    ).toEqual([])
  })

  it('isole le groupe reellement manquant', () => {
    expect(
      missingMentionGroups({
        legalFormLabel: 'SARL',
        registrationNumber: 'RCS Nantes 000 000 000',
        phone: '0240000000',
        email: 'contact@test.local',
        paymentTerms: 'Solde à réception.',
        vatNumber: 'FR00000000000',
        quoteValidityDays: 90,
      }),
    ).toEqual(['insurance'])
  })

  it('garde l ordre : coordonnees, assurance, conditions', () => {
    // L'ordre est celui de la liste de premiers pas d'A2. Deux ordres
    // differents entre l'annonce et la liste desorienteraient.
    expect(missingMentionGroups({ insurerName: 'SMABTP' })).toEqual([
      'contact',
      'insurance',
      'terms',
    ])
  })

  it('CHAQUE mention obligatoire appartient a un groupe', () => {
    // Le garde contre la divergence : ajouter une mention a
    // `missingLegalMentions` sans la classer la rendrait invisible a l'ecran,
    // et l'artisan se ferait refuser l'emission sans savoir pourquoi.
    for (const key of missingLegalMentions({})) {
      expect(MENTION_GROUP_OF[key as keyof typeof MENTION_GROUP_OF]).toBeDefined()
    }
  })
})
