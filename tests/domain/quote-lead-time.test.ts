import { describe, it, expect } from 'vitest'
import { medianQuoteLeadTime, type QuoteLeadTime } from '@/domain/quote-lead-time'
import { MINIMUM_OBSERVATIONS } from '@/domain/passport-metrics'

const NOW = new Date('2026-08-31T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

/** Une visite, puis un devis envoye `delay` jours plus tard. */
const measured = (delay: number, overrides: Partial<QuoteLeadTime> = {}): QuoteLeadTime => ({
  visitAt: daysAgo(30 + delay),
  visitCreatedAt: daysAgo(31 + delay),
  quoteSentAt: daysAgo(30),
  ...overrides,
})

const many = (n: number, delay: number) => Array.from({ length: n }, () => measured(delay))

describe('le seuil', () => {
  it('est celui des autres mesures du passeport', () => {
    // Deux seuils sur un meme passeport seraient indefendables.
    expect(MINIMUM_OBSERVATIONS).toBe(10)
  })

  it('ne rend aucune mediane en dessous', () => {
    expect(medianQuoteLeadTime(many(9, 3), NOW).value).toBeNull()
  })

  it('rend le volume MEME quand la mediane est masquee', () => {
    expect(medianQuoteLeadTime(many(9, 3), NOW).volume).toBe(9)
  })

  it('rend la mediane des le seuil atteint', () => {
    expect(medianQuoteLeadTime(many(10, 3), NOW).value).toBe(3)
  })
})

describe('la mediane', () => {
  it('prend la valeur du milieu sur un nombre impair', () => {
    const items = [...many(5, 1), ...many(5, 10), measured(4)]

    expect(medianQuoteLeadTime(items, NOW).value).toBe(4)
  })

  it('moyenne les deux valeurs centrales sur un nombre pair', () => {
    const items = [...many(5, 2), ...many(5, 4)]

    expect(medianQuoteLeadTime(items, NOW).value).toBe(3)
  })

  it('resiste a une valeur extreme, contrairement a une moyenne', () => {
    // C'est pourquoi la spec demande une mediane : un devis oublie six mois
    // ne doit pas deplacer le chiffre de tous les autres. Une moyenne aurait
    // rendu 20.
    const items = [...many(9, 2), measured(180)]

    expect(medianQuoteLeadTime(items, NOW).value).toBe(2)
  })

  it('compte en jours CALENDAIRES', () => {
    // C'est l'attente reellement vecue par celui qui espere son devis ; le
    // jour ouvre sert a mesurer un engagement annonce, pas une attente subie.
    // Vendredi 28 aout au lundi 31 : trois jours, pas un.
    const items = Array.from({ length: 10 }, () => ({
      visitAt: new Date('2026-08-28T09:00:00Z'),
      visitCreatedAt: new Date('2026-08-27T09:00:00Z'),
      quoteSentAt: new Date('2026-08-31T09:00:00Z'),
    }))

    expect(medianQuoteLeadTime(items, NOW).value).toBe(3)
  })
})

describe('ce qui n entre pas dans le calcul', () => {
  it('ECARTE un rendez-vous cree apres l envoi du devis', () => {
    // La garde anti-antidatage : `created_at` est pose par la base, et un
    // rendez-vous invente apres coup ne compte pas.
    const forged = measured(3, { visitCreatedAt: NOW })

    expect(medianQuoteLeadTime([...many(10, 5), forged], NOW).volume).toBe(10)
  })

  it('ecarte un devis envoye AVANT la visite', () => {
    // Ce n'est pas un delai de remise : le devis existait deja.
    const inverted = measured(3, { quoteSentAt: daysAgo(40) })

    expect(medianQuoteLeadTime([...many(10, 5), inverted], NOW).volume).toBe(10)
  })

  it('ecarte ce qui est hors de la fenetre de douze mois', () => {
    const old = measured(3, {
      quoteSentAt: daysAgo(400),
      visitAt: daysAgo(403),
      visitCreatedAt: daysAgo(404),
    })

    expect(medianQuoteLeadTime([...many(10, 5), old], NOW).volume).toBe(10)
  })

  it('ne rend rien du tout sans aucune observation', () => {
    expect(medianQuoteLeadTime([], NOW)).toEqual({ value: null, volume: 0 })
  })
})
