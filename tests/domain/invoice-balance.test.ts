import { describe, it, expect } from 'vitest'
import {
  remainingToInvoice,
  assertInvoiceable,
  splitDepositByRate,
  remainingByRate,
  type IssuedInvoice,
} from '@/domain/invoice-balance'

const QUOTE_TOTAL = 100700 // 1 007,00 EUR TTC

const invoice = (overrides: Partial<IssuedInvoice> = {}): IssuedInvoice => ({
  type: 'deposit',
  totalInclTax: 30000,
  ...overrides,
})

describe('reste a facturer', () => {
  it('vaut le total du devis quand rien n a ete facture', () => {
    expect(remainingToInvoice(QUOTE_TOTAL, [])).toBe(100700)
  })

  it('deduit les factures deja emises', () => {
    expect(remainingToInvoice(QUOTE_TOTAL, [invoice({ totalInclTax: 30000 })])).toBe(70700)
  })

  it('rajoute les avoirs, qui annulent une facturation', () => {
    const issued = [invoice({ totalInclTax: 30000 }), invoice({ type: 'credit_note', totalInclTax: 30000 })]
    expect(remainingToInvoice(QUOTE_TOTAL, issued)).toBe(100700)
  })

  it('tombe a zero quand le devis est integralement facture', () => {
    const issued = [invoice({ totalInclTax: 30000 }), invoice({ type: 'balance', totalInclTax: 70700 })]
    expect(remainingToInvoice(QUOTE_TOTAL, issued)).toBe(0)
  })
})

describe('controle avant emission', () => {
  it('accepte un montant inferieur au reste', () => {
    expect(() => assertInvoiceable(QUOTE_TOTAL, [], 30000)).not.toThrow()
  })

  it('accepte un montant egal au reste', () => {
    expect(() => assertInvoiceable(QUOTE_TOTAL, [], 100700)).not.toThrow()
  })

  it('refuse de facturer au-dela du devis', () => {
    // L'ecart devis/facture est la metrique reine du passeport : le depassement
    // doit passer par un avenant au devis, pas par une facture plus grosse.
    expect(() => assertInvoiceable(QUOTE_TOTAL, [], 100701)).toThrow('depasse')
  })

  it('refuse un montant nul ou negatif', () => {
    expect(() => assertInvoiceable(QUOTE_TOTAL, [], 0)).toThrow('positif')
    expect(() => assertInvoiceable(QUOTE_TOTAL, [], -1)).toThrow('positif')
  })

  it('refuse d emettre quand tout est deja facture', () => {
    const issued = [invoice({ type: 'balance', totalInclTax: 100700 })]
    expect(() => assertInvoiceable(QUOTE_TOTAL, issued, 1)).toThrow('integralement facture')
  })
})

describe('ventilation d un acompte', () => {
  // Devis : 850 EUR a 10 % et 60 EUR a 20 %.
  const byRate = [
    { rate: 1000, baseExclTax: 85000, taxAmount: 8500 },
    { rate: 2000, baseExclTax: 6000, taxAmount: 1200 },
  ]

  it('repartit au prorata de chaque base', () => {
    // Acompte de 30 % : 255,00 a 10 % et 18,00 a 20 %.
    expect(splitDepositByRate(byRate, 30)).toEqual([
      { rate: 1000, unitPriceExclTax: 25500 },
      { rate: 2000, unitPriceExclTax: 1800 },
    ])
  })

  it('conserve le total hors taxe, au centime pres', () => {
    // 33 % de 910,00 = 300,30. La somme des lignes doit tomber juste.
    const lines = splitDepositByRate(byRate, 33)
    const total = lines.reduce((sum, l) => sum + l.unitPriceExclTax, 0)
    expect(total).toBe(30030)
  })

  it('refuse un pourcentage hors bornes', () => {
    expect(() => splitDepositByRate(byRate, 0)).toThrow('pourcentage')
    expect(() => splitDepositByRate(byRate, 101)).toThrow('pourcentage')
  })
})

describe('solde restant, taux par taux', () => {
  const byRate = [
    { rate: 1000, baseExclTax: 85000, taxAmount: 8500 },
    { rate: 2000, baseExclTax: 6000, taxAmount: 1200 },
  ]

  it('vaut les bases du devis quand rien n a ete facture', () => {
    expect(remainingByRate(byRate, [])).toEqual([
      { rate: 1000, unitPriceExclTax: 85000 },
      { rate: 2000, unitPriceExclTax: 6000 },
    ])
  })

  it('deduit ce qui a deja ete facture, taux par taux', () => {
    const issued = [{ type: 'deposit' as const, byRate: splitDepositByRate(byRate, 30) }]
    expect(remainingByRate(byRate, issued)).toEqual([
      { rate: 1000, unitPriceExclTax: 59500 },
      { rate: 2000, unitPriceExclTax: 4200 },
    ])
  })

  it('rajoute les avoirs', () => {
    const issued = [
      { type: 'deposit' as const, byRate: splitDepositByRate(byRate, 30) },
      { type: 'credit_note' as const, byRate: splitDepositByRate(byRate, 30) },
    ]
    expect(remainingByRate(byRate, issued)).toEqual([
      { rate: 1000, unitPriceExclTax: 85000 },
      { rate: 2000, unitPriceExclTax: 6000 },
    ])
  })

  it('ne laisse aucun residu apres trois acomptes arrondis', () => {
    // C'est le defaut qu'un solde calcule en pourcentage produirait : trois
    // arrondis successifs decalent le total, et le devis ne serait jamais
    // soldable au centime pres.
    const issued = [33, 33, 33].map((p) => ({
      type: 'progress' as const,
      byRate: splitDepositByRate(byRate, p),
    }))

    const balance = remainingByRate(byRate, issued)
    const invoiced = issued.flatMap((i) => i.byRate).reduce((s, l) => s + l.unitPriceExclTax, 0)
    const total = balance.reduce((s, l) => s + l.unitPriceExclTax, 0) + invoiced

    expect(total).toBe(91000)
  })

  it('ecarte les taux entierement soldes', () => {
    const issued = [{ type: 'balance' as const, byRate: [{ rate: 2000, unitPriceExclTax: 6000 }] }]
    expect(remainingByRate(byRate, issued)).toEqual([{ rate: 1000, unitPriceExclTax: 85000 }])
  })
})
