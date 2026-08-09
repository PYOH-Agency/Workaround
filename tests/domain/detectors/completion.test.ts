import { describe, it, expect } from 'vitest'
import { detectCompletionDrift, type CompletionRecord } from '@/domain/detectors/completion'

const record = (overrides: Partial<CompletionRecord> = {}): CompletionRecord => ({
  quoteId: 'q1',
  companyName: 'PLOMBERIE TEST',
  declaredAt: new Date('2026-08-01'),
  invoicedAt: new Date('2026-08-03'),
  ...overrides,
})

describe('divergence entre fin declaree et solde', () => {
  it('ne signale rien en deca de sept jours', () => {
    // L'ecart s'explique par le delai normal entre la fin des travaux et
    // l'emission du solde.
    expect(detectCompletionDrift([record()])).toEqual([])
  })

  it('signale au-dela de sept jours', () => {
    const drift = record({ invoicedAt: new Date('2026-08-20') })
    const found = detectCompletionDrift([drift])

    expect(found).toHaveLength(1)
    expect(found[0].severity).toBe('signal')
    expect(found[0].type).toBe('completion_drift')
  })

  it('signale aussi une declaration POSTERIEURE au solde', () => {
    // Declarer apres avoir solde n'a aucun sens : c'est un signe de saisie
    // approximative, ou de rattrapage.
    const backwards = record({ declaredAt: new Date('2026-08-20') })
    expect(detectCompletionDrift([backwards])).toHaveLength(1)
  })

  it('ignore un chantier sans declaration prealable', () => {
    expect(detectCompletionDrift([record({ declaredAt: null })])).toEqual([])
  })

  it('produit une empreinte qui change avec les faits', () => {
    // Un examen ne doit masquer l'anomalie que tant que les dates sont les
    // memes : un nouveau solde change l'empreinte et la fait resurgir.
    const [a] = detectCompletionDrift([record({ invoicedAt: new Date('2026-08-20') })])
    const [b] = detectCompletionDrift([record({ invoicedAt: new Date('2026-08-25') })])

    expect(a.fingerprint).not.toBe(b.fingerprint)
  })
})
