import { describe, it, expect } from 'vitest'
import { remainingToInvoice, assertInvoiceable, type IssuedInvoice } from '@/domain/invoice-balance'

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
