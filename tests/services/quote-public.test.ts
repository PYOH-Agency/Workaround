import { describe, it, expect } from 'vitest'
import { assertSendable, type SendableState } from '@/services/quote-public'

const complete: SendableState = {
  status: 'draft',
  committedLeadTimeDays: 5,
  lineCount: 2,
  customerPhone: '0612345678',
}

describe('assertSendable', () => {
  it('accepte un brouillon complet', () => {
    expect(() => assertSendable(complete)).not.toThrow()
  })

  it('refuse un devis sans ligne', () => {
    expect(() => assertSendable({ ...complete, lineCount: 0 })).toThrow('au moins une ligne')
  })

  it("refuse un devis sans delai engage", () => {
    // Sans engagement declare, la metrique « respect du delai annonce » du
    // passeport n'a rien a comparer.
    expect(() => assertSendable({ ...complete, committedLeadTimeDays: null })).toThrow(
      "delai d'execution",
    )
  })

  it('refuse un devis sans telephone client', () => {
    // Le telephone porte l'identification du signataire par SMS : sans lui, la
    // signature ne peut pas etablir qui a signe.
    expect(() => assertSendable({ ...complete, customerPhone: null })).toThrow('telephone')
    expect(() => assertSendable({ ...complete, customerPhone: '  ' })).toThrow('telephone')
  })

  it('refuse un devis deja envoye', () => {
    expect(() => assertSendable({ ...complete, status: 'sent' })).toThrow('deja ete envoye')
  })

  it('refuse un devis deja signe', () => {
    expect(() => assertSendable({ ...complete, status: 'signed' })).toThrow('deja ete envoye')
  })
})
