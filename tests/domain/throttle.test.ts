import { describe, it, expect } from 'vitest'
import { exceedsLimit, HOURLY_CONTACT_LIMIT } from '@/domain/throttle'

const NOW = new Date('2026-08-08T12:00:00Z')
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000)

describe('plafond de contacts', () => {
  it('laisse passer en deca du plafond', () => {
    const recent = Array.from({ length: HOURLY_CONTACT_LIMIT - 1 }, () => minutesAgo(10))
    expect(exceedsLimit(recent, NOW)).toBe(false)
  })

  it('bloque au plafond', () => {
    const recent = Array.from({ length: HOURLY_CONTACT_LIMIT }, () => minutesAgo(10))
    expect(exceedsLimit(recent, NOW)).toBe(true)
  })

  it('ignore ce qui date de plus d une heure', () => {
    // La fenetre glisse : un envoi d'hier ne doit pas bloquer aujourd'hui.
    const old = Array.from({ length: HOURLY_CONTACT_LIMIT * 3 }, () => minutesAgo(90))
    expect(exceedsLimit(old, NOW)).toBe(false)
  })

  it('ne bloque jamais une premiere demande', () => {
    expect(exceedsLimit([], NOW)).toBe(false)
  })
})
