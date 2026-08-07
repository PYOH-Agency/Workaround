import { describe, it, expect } from 'vitest'
import { computeTotals, type LineInput } from '@/domain/quote-totals'

const line = (overrides: Partial<LineInput> = {}): LineInput => ({
  quantity: '1',
  unitPriceExclTax: 10000,
  taxRate: 2000,
  ...overrides,
})

describe('computeTotals', () => {
  it('renvoie zero pour un devis vide', () => {
    expect(computeTotals([])).toEqual({
      totalExclTax: 0,
      totalTax: 0,
      totalInclTax: 0,
      byRate: [],
    })
  })

  it('calcule une ligne simple a 20 %', () => {
    const totals = computeTotals([line()])
    expect(totals.totalExclTax).toBe(10000)
    expect(totals.totalTax).toBe(2000)
    expect(totals.totalInclTax).toBe(12000)
  })

  it('applique la quantite au prix unitaire', () => {
    const totals = computeTotals([line({ quantity: '2.5', unitPriceExclTax: 4000 })])
    expect(totals.totalExclTax).toBe(10000)
  })

  it('regroupe la TVA par taux et arrondit sur le sous-total, pas ligne par ligne', () => {
    // Trois lignes a 33,33 EUR HT en TVA 20 %.
    // Arrondi ligne par ligne : 6,67 x 3 = 20,01 EUR. Faux.
    // Arrondi sur le sous-total : 99,99 x 20 % = 19,998 -> 20,00 EUR. Correct.
    const totals = computeTotals([
      line({ unitPriceExclTax: 3333 }),
      line({ unitPriceExclTax: 3333 }),
      line({ unitPriceExclTax: 3333 }),
    ])
    expect(totals.totalExclTax).toBe(9999)
    expect(totals.totalTax).toBe(2000)
    expect(totals.totalInclTax).toBe(11999)
  })

  it('ventile plusieurs taux et les trie par taux croissant', () => {
    const totals = computeTotals([
      line({ unitPriceExclTax: 100000, taxRate: 2000 }),
      line({ unitPriceExclTax: 200000, taxRate: 550 }),
      line({ unitPriceExclTax: 50000, taxRate: 1000 }),
    ])
    expect(totals.totalExclTax).toBe(350000)
    expect(totals.byRate).toEqual([
      { rate: 550, baseExclTax: 200000, taxAmount: 11000 },
      { rate: 1000, baseExclTax: 50000, taxAmount: 5000 },
      { rate: 2000, baseExclTax: 100000, taxAmount: 20000 },
    ])
    expect(totals.totalTax).toBe(36000)
    expect(totals.totalInclTax).toBe(386000)
  })

  it('gere une ligne negative (remise)', () => {
    const totals = computeTotals([
      line({ unitPriceExclTax: 100000 }),
      line({ unitPriceExclTax: -10000 }),
    ])
    expect(totals.totalExclTax).toBe(90000)
    expect(totals.totalTax).toBe(18000)
  })
})
