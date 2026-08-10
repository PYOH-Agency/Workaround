import { describe, it, expect } from 'vitest'
import { amountDueNow, outstanding, paymentStatus } from '@/domain/payment-status'

const TOTAL = 100_700
const DUE = new Date('2026-02-01')

/** Une facture ordinaire, sans retenue stipulee. */
const plain = (payments: number[]) => ({
  totalInclTax: TOTAL,
  payments,
  dueAt: DUE,
  withheld: 0,
})

/** La meme, avec 5 % legalement retenus. */
const withRetention = (payments: number[]) => ({ ...plain(payments), withheld: 5_035 })

describe('le statut de reglement', () => {
  it('part de « en attente »', () => {
    expect(paymentStatus(plain([]), new Date('2026-01-01'))).toBe('unpaid')
  })

  it('reconnait un reglement partiel', () => {
    expect(paymentStatus(plain([30_000]), new Date('2026-01-01'))).toBe('partially_paid')
  })

  it('reconnait une facture soldee', () => {
    expect(paymentStatus(plain([30_000, 70_700]), new Date('2026-01-01'))).toBe('paid')
  })

  it('tolere un trop-percu', () => {
    expect(paymentStatus(plain([110_000]), new Date('2026-01-01'))).toBe('paid')
  })

  it('passe en retard apres l echeance', () => {
    expect(paymentStatus(plain([]), new Date('2026-02-02'))).toBe('overdue')
  })

  it('le reglement l emporte sur le retard', () => {
    // Une facture soldee apres l'echeance n'est plus en retard, elle est payee.
    expect(paymentStatus(plain([100_700]), new Date('2026-06-01'))).toBe('paid')
  })
})

describe('la retenue de garantie', () => {
  it('N EST PAS un impaye, meme apres l echeance', () => {
    // **La decision structurante du jalon.** Sans cette regle, la sequence de
    // relances poursuivrait le client pour 5 % qu'il est en droit de garder
    // pendant un an — et l'artisan qui decouvrirait ce message parti en son nom
    // se retournerait contre l'outil, a juste titre.
    expect(paymentStatus(withRetention([95_665]), new Date('2026-06-01'))).toBe('withheld')
  })

  it('ne masque PAS un vrai retard', () => {
    // 900,00 recus sur 1 007,00 : 50,35 sont retenus, le reste est en retard.
    expect(paymentStatus(withRetention([90_000]), new Date('2026-06-01'))).toBe('overdue')
  })

  it('laisse « payee » quand tout est encaisse, retenue comprise', () => {
    expect(paymentStatus(withRetention([100_700]), new Date('2026-06-01'))).toBe('paid')
  })

  it('redevient exigible une fois la retenue liberee', () => {
    // `withheld` tombe a zero : la meme facture bascule en retard, et c'est
    // exactement ce qu'on veut — la somme est due.
    expect(paymentStatus(plain([95_665]), new Date('2027-06-01'))).toBe('overdue')
  })
})

describe('le reste du, et ce qu on peut reclamer', () => {
  it('distingue les deux', () => {
    // `outstanding` est comptable, `amountDueNow` est ce qu'on ose reclamer.
    expect(outstanding(TOTAL, [95_665])).toBe(5_035)
    expect(amountDueNow(withRetention([95_665]))).toBe(0)
  })

  it('ne descend jamais sous zero', () => {
    expect(amountDueNow(withRetention([110_000]))).toBe(0)
  })

  it('reclame le retard au-dela de la retenue', () => {
    expect(amountDueNow(withRetention([90_000]))).toBe(5_665)
  })
})
