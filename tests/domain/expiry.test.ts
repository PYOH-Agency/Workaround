import { describe, it, expect } from 'vitest'
import { noticesDue, NOTICE_DAYS } from '@/domain/expiry'

const validUntil = new Date('2026-12-31T00:00:00Z')

describe('preavis d echeance', () => {
  it('previent a J-60, J-30 et J-7', () => {
    expect(NOTICE_DAYS).toEqual([60, 30, 7])
  })

  it('declenche le preavis le jour exact', () => {
    expect(noticesDue(validUntil, new Date('2026-11-01T09:00:00Z'), [])).toEqual([60])
  })

  it('ne renvoie rien avant le premier palier', () => {
    expect(noticesDue(validUntil, new Date('2026-09-01T09:00:00Z'), [])).toEqual([])
  })

  it('ne previent jamais deux fois pour le meme palier', () => {
    // Un artisan prevenu trois fois du meme palier cesse de lire les
    // notifications, et manque celle qui comptait.
    expect(noticesDue(validUntil, new Date('2026-11-02T09:00:00Z'), [60])).toEqual([])
  })

  it('rattrape un palier manque plutot que de le laisser passer', () => {
    // Si le travail de fond n'a pas tourne pendant trois jours, le preavis doit
    // partir en retard — jamais etre saute.
    expect(noticesDue(validUntil, new Date('2026-11-04T09:00:00Z'), [])).toEqual([60])
  })

  it('passe au palier suivant une fois le precedent envoye', () => {
    expect(noticesDue(validUntil, new Date('2026-12-01T09:00:00Z'), [60])).toEqual([30])
  })

  it('ne saute pas un palier quand plusieurs sont dus', () => {
    // Le plus large des paliers atteints part en premier : il porte le message
    // le plus utile — il reste du temps pour agir.
    expect(noticesDue(validUntil, new Date('2026-12-28T09:00:00Z'), [])).toEqual([60])
  })

  it('ne previent plus une fois l echeance passee', () => {
    expect(noticesDue(validUntil, new Date('2027-01-05T09:00:00Z'), [60, 30, 7])).toEqual([])
    expect(noticesDue(validUntil, new Date('2027-01-05T09:00:00Z'), [])).toEqual([])
  })
})
