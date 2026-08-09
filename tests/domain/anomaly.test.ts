import { describe, it, expect } from 'vitest'
import { sortAnomalies, suppressReviewed, type Anomaly, type AnomalyReview } from '@/domain/anomaly'

const anomaly = (overrides: Partial<Anomaly> = {}): Anomaly => ({
  type: 'shared_signer',
  severity: 'signal',
  subjectId: 'c1',
  since: new Date('2026-08-01'),
  detail: 'Trois clients partagent un téléphone',
  href: '/supervision',
  fingerprint: 'a|b|c',
  ...overrides,
})

describe('tri de la file', () => {
  it('remonte le bloquant avant l attention, puis le signal', () => {
    const sorted = sortAnomalies([
      anomaly({ severity: 'signal' }),
      anomaly({ severity: 'blocking' }),
      anomaly({ severity: 'attention' }),
    ])

    expect(sorted.map((a) => a.severity)).toEqual(['blocking', 'attention', 'signal'])
  })

  it('a gravite egale, le plus ancien d abord', () => {
    // Une anomalie qui traine est plus grave qu'une qui vient d'apparaitre.
    const sorted = sortAnomalies([
      anomaly({ subjectId: 'recent', since: new Date('2026-08-07') }),
      anomaly({ subjectId: 'ancien', since: new Date('2026-07-01') }),
    ])

    expect(sorted.map((a) => a.subjectId)).toEqual(['ancien', 'recent'])
  })
})

describe('suppression par examen', () => {
  const review = (overrides: Partial<AnomalyReview> = {}): AnomalyReview => ({
    type: 'shared_signer',
    subjectId: 'c1',
    factsFingerprint: 'a|b|c',
    ...overrides,
  })

  it('masque une anomalie deja examinee', () => {
    expect(suppressReviewed([anomaly()], [review()])).toEqual([])
  })

  it('ne masque rien quand l examen porte sur un autre sujet', () => {
    expect(suppressReviewed([anomaly()], [review({ subjectId: 'autre' })])).toHaveLength(1)
  })

  it('ne masque rien quand l examen porte sur un autre type', () => {
    expect(suppressReviewed([anomaly()], [review({ type: 'certificate_waiting' })])).toHaveLength(1)
  })

  it('fait resurgir l anomalie quand un fait nouveau apparait', () => {
    // LA propriete qui empeche l'aveuglement : trois clients examines et juges
    // benins ne doivent pas rendre le quatrieme invisible.
    const withFourth = anomaly({ fingerprint: 'a|b|c|d' })
    expect(suppressReviewed([withFourth], [review()])).toHaveLength(1)
  })
})
