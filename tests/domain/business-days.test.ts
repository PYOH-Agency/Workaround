import { describe, it, expect } from 'vitest'
import { businessDaysSince } from '@/domain/business-days'

// 2026-08-03 est un lundi.
const MONDAY = new Date('2026-08-03T10:00:00Z')

describe('jours ouvres ecoules', () => {
  it('ne compte rien le jour meme', () => {
    expect(businessDaysSince(MONDAY, new Date('2026-08-03T23:00:00Z'))).toBe(0)
  })

  it('compte un jour le lendemain ouvre', () => {
    expect(businessDaysSince(MONDAY, new Date('2026-08-04T09:00:00Z'))).toBe(1)
  })

  it('saute le week-end', () => {
    // Vendredi 7 -> lundi 10 : samedi et dimanche ne comptent pas.
    const friday = new Date('2026-08-07T10:00:00Z')
    expect(businessDaysSince(friday, new Date('2026-08-10T10:00:00Z'))).toBe(1)
  })

  it('compte trois jours du lundi au jeudi', () => {
    expect(businessDaysSince(MONDAY, new Date('2026-08-06T09:00:00Z'))).toBe(3)
  })

  it('ne compte pas un depot du samedi avant le lundi', () => {
    const saturday = new Date('2026-08-08T10:00:00Z')
    expect(businessDaysSince(saturday, new Date('2026-08-09T10:00:00Z'))).toBe(0)
    expect(businessDaysSince(saturday, new Date('2026-08-10T10:00:00Z'))).toBe(1)
  })

  it('ne renvoie jamais de negatif', () => {
    expect(businessDaysSince(MONDAY, new Date('2026-08-01T10:00:00Z'))).toBe(0)
  })
})
