import { describe, it, expect } from 'vitest'
import {
  MAX_PERCENT,
  assertSituation,
  situationByRate,
  type SituationLine,
} from '@/domain/situation'

/** Deux lignes, deux taux : 850,00 a 10 % et 60,00 a 20 %. */
const lines = (a: number, b: number): SituationLine[] => [
  { quoteLineId: 'l1', taxRate: 1000, totalExclTax: 85_000, percent: a },
  { quoteLineId: 'l2', taxRate: 2000, totalExclTax: 6_000, percent: b },
]

describe('recevabilite d un avancement', () => {
  it('accepte un avancement partiel', () => {
    expect(() => assertSituation(lines(50, 25))).not.toThrow()
  })

  it('accepte zero et cent', () => {
    expect(MAX_PERCENT).toBe(100)
    expect(() => assertSituation(lines(0, 100))).not.toThrow()
  })

  it('REFUSE au-dela de cent', () => {
    // La garde qui manquait : une facture `progress` a lignes libres laissait
    // facturer 120 % d'une ligne, seul le total global etant plafonne.
    expect(() => assertSituation(lines(120, 0))).toThrow(/entre 0 et 100/)
  })

  it('refuse un pourcentage negatif ou fractionnaire', () => {
    expect(() => assertSituation(lines(-10, 0))).toThrow()
    expect(() => assertSituation(lines(33.5, 0))).toThrow()
  })

  it('refuse une situation sans aucune ligne', () => {
    expect(() => assertSituation([])).toThrow(/au moins une ligne/)
  })
})

describe('la valeur cumulee declaree', () => {
  it('ventile par taux de TVA', () => {
    expect(situationByRate(lines(50, 50))).toEqual([
      { rate: 1000, baseExclTax: 42_500, taxAmount: 4_250 },
      { rate: 2000, baseExclTax: 3_000, taxAmount: 600 },
    ])
  })

  it('vaut EXACTEMENT le devis a cent pour cent', () => {
    // La propriete qui compte : a 100 %, aucun residu de centimes ne peut
    // subsister. C'est ce qui garantit qu'une derniere situation solde le
    // chantier au centime — donc que la metrique « ecart devis vers facture »
    // du passeport a un sens.
    expect(situationByRate(lines(100, 100))).toEqual([
      { rate: 1000, baseExclTax: 85_000, taxAmount: 8_500 },
      { rate: 2000, baseExclTax: 6_000, taxAmount: 1_200 },
    ])
  })

  it('vaut zero a zero pour cent', () => {
    expect(situationByRate(lines(0, 0))).toEqual([
      { rate: 1000, baseExclTax: 0, taxAmount: 0 },
      { rate: 2000, baseExclTax: 0, taxAmount: 0 },
    ])
  })

  it('regroupe deux lignes de meme taux', () => {
    const same: SituationLine[] = [
      { quoteLineId: 'l1', taxRate: 1000, totalExclTax: 10_000, percent: 50 },
      { quoteLineId: 'l2', taxRate: 1000, totalExclTax: 20_000, percent: 25 },
    ]

    expect(situationByRate(same)).toEqual([{ rate: 1000, baseExclTax: 10_000, taxAmount: 1_000 }])
  })

  it('arrondit ligne par ligne, jamais sur le total', () => {
    // 333 a 33 % = 109,89 -> 110. Arrondir apres sommation donnerait un autre
    // centime, et deux situations successives ne se raccorderaient plus.
    const odd: SituationLine[] = [
      { quoteLineId: 'l1', taxRate: 2000, totalExclTax: 333, percent: 33 },
    ]

    expect(situationByRate(odd)[0].baseExclTax).toBe(110)
  })
})
