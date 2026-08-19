import { describe, expect, it } from 'vitest'
import { funnel } from '@/domain/lead-funnel'

const AT = new Date('2026-08-19T12:00:00Z')

describe('funnel', () => {
  it('rend un entonnoir vide sans rien casser', () => {
    expect(funnel({ lookups: [], requests: [] })).toEqual({
      lookups: 0,
      uncovered: 0,
      requests: 0,
      sent: 0,
      copied: 0,
      registered: 0,
      deposited: 0,
      covered: 0,
    })
  })

  it('compte les recherches sans couverture, cas B et cas C confondus', () => {
    const result = funnel({
      lookups: [
        { outcome: 'covered' },
        { outcome: 'uncovered_member' },
        { outcome: 'stranger' },
        { outcome: 'stranger' },
      ],
      requests: [],
    })
    expect(result.lookups).toBe(4)
    expect(result.uncovered).toBe(3)
  })

  it('separe les deux canaux de demande', () => {
    const result = funnel({
      lookups: [],
      requests: [
        { channel: 'sent', registeredAt: null, depositedAt: null, coveredAt: null },
        { channel: 'copied', registeredAt: null, depositedAt: null, coveredAt: null },
        { channel: 'copied', registeredAt: null, depositedAt: null, coveredAt: null },
      ],
    })
    expect(result.requests).toBe(3)
    expect(result.sent).toBe(1)
    expect(result.copied).toBe(2)
  })

  it('compte les jalons d attribution sur les dates figees', () => {
    const result = funnel({
      lookups: [],
      requests: [
        { channel: 'sent', registeredAt: AT, depositedAt: AT, coveredAt: AT },
        { channel: 'sent', registeredAt: AT, depositedAt: AT, coveredAt: null },
        { channel: 'sent', registeredAt: AT, depositedAt: null, coveredAt: null },
        { channel: 'copied', registeredAt: null, depositedAt: null, coveredAt: null },
      ],
    })
    expect(result.registered).toBe(3)
    expect(result.deposited).toBe(2)
    expect(result.covered).toBe(1)
  })

  // La purge a 30 jours retire le SIRET et le contact d'une demande, sans
  // toucher a ses dates ni a son canal. L'entonnoir doit continuer de la
  // compter a l'identique. Ce test attrape la faute concrete ou une
  // implementation, voyant une ligne sans SIRET, la traite comme purgee et
  // l'exclut du calcul.
  it('rend le meme resultat avant et apres anonymisation des demandes', () => {
    const before = [
      {
        channel: 'sent' as const,
        registeredAt: AT,
        depositedAt: AT,
        coveredAt: null,
        siret: '73282932000074',
        contactEmail: 'artisan@example.com',
      },
      {
        channel: 'copied' as const,
        registeredAt: AT,
        depositedAt: null,
        coveredAt: null,
        siret: '39182974000058',
        contactEmail: 'demandeur@example.com',
      },
    ]
    const after = before.map(({ channel, registeredAt, depositedAt, coveredAt }) => ({
      channel,
      registeredAt,
      depositedAt,
      coveredAt,
    }))

    expect(funnel({ lookups: [], requests: before })).toEqual(
      funnel({ lookups: [], requests: after }),
    )
  })
})
