import { describe, it, expect } from 'vitest'
import { nextQuoteNumber } from '@/services/quotes'

describe('nextQuoteNumber', () => {
  it('demarre a 0001 pour l annee en cours', () => {
    expect(nextQuoteNumber([], 2026)).toBe('D2026-0001')
  })

  it('incremente a partir du plus grand numero de l annee', () => {
    expect(nextQuoteNumber(['D2026-0001', 'D2026-0007'], 2026)).toBe('D2026-0008')
  })

  it("ne se fie pas a l'ordre de la liste", () => {
    expect(nextQuoteNumber(['D2026-0007', 'D2026-0002'], 2026)).toBe('D2026-0008')
  })

  it('ignore les numeros des annees precedentes', () => {
    expect(nextQuoteNumber(['D2025-0042'], 2026)).toBe('D2026-0001')
  })

  it('ignore les numeros malformes plutot que de produire NaN', () => {
    expect(nextQuoteNumber(['D2026-abcd', 'D2026-0003', 'nimportequoi'], 2026)).toBe('D2026-0004')
  })

  it('passe correctement au-dela de 9999', () => {
    expect(nextQuoteNumber(['D2026-9999'], 2026)).toBe('D2026-10000')
  })
})
