import { describe, it, expect } from 'vitest'
import { rankByProximity, type Listing, type Zone } from '@/domain/directory-ranking'

const listing = (id: string, postalCode: string, city: string): Listing => ({
  companyId: id,
  postalCode,
  city,
})

const BORDEAUX: Zone = { kind: 'postalCode', value: '33000', department: '33' }

describe('rangs de proximite', () => {
  it('place le code postal exact devant le departement, puis le reste', () => {
    const ranked = rankByProximity(
      [
        listing('ailleurs', '75001', 'paris'),
        listing('departement', '33530', 'bassens'),
        listing('exact', '33000', 'bordeaux'),
      ],
      BORDEAUX,
      '2026-08-08',
    )

    expect(ranked.map((l) => l.companyId)).toEqual(['exact', 'departement', 'ailleurs'])
  })

  it('classe sur la commune quand c est une commune qui est saisie', () => {
    const zone: Zone = { kind: 'city', value: 'bordeaux', department: '33' }
    const ranked = rankByProximity(
      [listing('bassens', '33530', 'bassens'), listing('bordeaux', '33000', 'bordeaux')],
      zone,
      '2026-08-08',
    )

    expect(ranked[0].companyId).toBe('bordeaux')
  })

  it('met tout au meme rang quand la zone est inconnue', () => {
    // Une commune qu'aucune entreprise n'habite : on ne peut deduire aucun
    // departement, et pretendre a une proximite serait mentir.
    const zone: Zone = { kind: 'city', value: 'inconnue', department: null }
    const ranked = rankByProximity(
      [listing('a', '33000', 'bordeaux'), listing('b', '75001', 'paris')],
      zone,
      '2026-08-08',
    )

    expect(ranked).toHaveLength(2)
  })
})

describe('rotation a rang egal', () => {
  const sameRank = [
    listing('a', '33000', 'bordeaux'),
    listing('b', '33000', 'bordeaux'),
    listing('c', '33000', 'bordeaux'),
    listing('d', '33000', 'bordeaux'),
  ]

  it('donne le meme ordre deux fois le meme jour', () => {
    // La pagination en depend, et recharger ne doit pas rebattre les cartes.
    const first = rankByProximity(sameRank, BORDEAUX, '2026-08-08').map((l) => l.companyId)
    const second = rankByProximity(sameRank, BORDEAUX, '2026-08-08').map((l) => l.companyId)

    expect(first).toEqual(second)
  })

  it('ne depend pas de l ordre de lecture en base', () => {
    const forward = rankByProximity(sameRank, BORDEAUX, '2026-08-08').map((l) => l.companyId)
    const backward = rankByProximity([...sameRank].reverse(), BORDEAUX, '2026-08-08').map(
      (l) => l.companyId,
    )

    expect(forward).toEqual(backward)
  })

  it('brasse reellement d un jour a l autre', () => {
    // Sans rotation, les premiers inscrits prendraient tous les appels a jamais.
    //
    // On regarde une semaine plutot que deux jours : deux jours consecutifs
    // peuvent coincider par hasard, et c'est ce qui avait masque un vrai
    // defaut — le jour place en fin de chaine ne perturbait pas l'avalanche,
    // et l'ordre restait le meme des jours durant.
    const week = ['08', '09', '10', '11', '12', '13', '14'].map((d) =>
      rankByProximity(sameRank, BORDEAUX, `2026-08-${d}`)
        .map((l) => l.companyId)
        .join(''),
    )

    expect(new Set(week).size).toBeGreaterThanOrEqual(4)
  })

  it('ne perd ni ne duplique personne', () => {
    const ranked = rankByProximity(sameRank, BORDEAUX, '2026-08-08')
    expect(new Set(ranked.map((l) => l.companyId)).size).toBe(4)
  })
})
