import { describe, it, expect } from 'vitest'
import { paymentStatus, outstanding } from '@/domain/payment-status'

const INVOICE = 100700

describe('statut de reglement', () => {
  it('non regle sans encaissement', () => {
    expect(paymentStatus(INVOICE, [], new Date('2026-01-01'), new Date('2026-01-01'))).toBe('unpaid')
  })

  it('partiellement regle', () => {
    expect(paymentStatus(INVOICE, [30000], new Date('2026-02-01'), new Date('2026-01-01'))).toBe(
      'partially_paid',
    )
  })

  it('regle a l euro pres', () => {
    expect(paymentStatus(INVOICE, [30000, 70700], new Date('2026-02-01'), new Date('2026-01-01'))).toBe(
      'paid',
    )
  })

  it('regle meme en cas de trop-percu', () => {
    expect(paymentStatus(INVOICE, [110000], new Date('2026-02-01'), new Date('2026-01-01'))).toBe('paid')
  })

  it('en retard une fois l echeance passee', () => {
    // L'echeance est le 1er fevrier, on est le 2 : les penalites courent.
    expect(paymentStatus(INVOICE, [], new Date('2026-02-01'), new Date('2026-02-02'))).toBe('overdue')
  })

  it('en retard aussi quand il reste une partie a payer', () => {
    expect(paymentStatus(INVOICE, [30000], new Date('2026-02-01'), new Date('2026-02-02'))).toBe(
      'overdue',
    )
  })

  it("n'est jamais en retard s'il est deja regle", () => {
    expect(
      paymentStatus(INVOICE, [100700], new Date('2026-02-01'), new Date('2026-06-01')),
    ).toBe('paid')
  })
})

describe('reste du', () => {
  it('deduit les encaissements', () => {
    expect(outstanding(INVOICE, [30000])).toBe(70700)
  })

  it('ne descend jamais sous zero', () => {
    expect(outstanding(INVOICE, [110000])).toBe(0)
  })
})
