import { describe, expect, it } from 'vitest'
import { isRateLimited } from '@/domain/rate-limit'

const HOUR = 60 * 60 * 1000
const NOW = new Date('2026-08-08T12:00:00Z')

describe('isRateLimited', () => {
  it('laisse passer quand rien n’a ete demande', () => {
    expect(isRateLimited([], NOW, HOUR, 3)).toBe(false)
  })

  it('laisse passer en dessous du plafond', () => {
    const recent = [new Date(NOW.getTime() - 60_000), new Date(NOW.getTime() - 120_000)]
    expect(isRateLimited(recent, NOW, HOUR, 3)).toBe(false)
  })

  it('bloque au plafond', () => {
    const recent = [1, 2, 3].map((m) => new Date(NOW.getTime() - m * 60_000))
    expect(isRateLimited(recent, NOW, HOUR, 3)).toBe(true)
  })

  it('ignore ce qui est sorti de la fenetre', () => {
    const old = [1, 2, 3].map((h) => new Date(NOW.getTime() - h * HOUR - 1000))
    expect(isRateLimited(old, NOW, HOUR, 3)).toBe(false)
  })

  it('compte la limite exactement sur le bord de fenetre', () => {
    // Une demande vieille d'exactement une heure est HORS fenetre : sinon le
    // plafond se decale d'une milliseconde a chaque appel.
    const edge = [new Date(NOW.getTime() - HOUR)]
    expect(isRateLimited(edge, NOW, HOUR, 1)).toBe(false)
  })

  it('ne compte que les demandes dans la fenetre au milieu d’un historique mele', () => {
    // Historique reel : de vieilles demandes hors fenetre cotoient des
    // recentes. Seules les recentes doivent peser dans le plafond.
    const mixed = [
      new Date(NOW.getTime() - 30 * HOUR), // hors fenetre
      new Date(NOW.getTime() - 10 * HOUR), // hors fenetre
      new Date(NOW.getTime() - 30 * 60_000), // dans la fenetre
      new Date(NOW.getTime() - 5 * 60_000), // dans la fenetre
    ]
    expect(isRateLimited(mixed, NOW, HOUR, 3)).toBe(false)
    expect(isRateLimited(mixed, NOW, HOUR, 2)).toBe(true)
  })
})
