import { describe, expect, it } from 'vitest'
import { guardVerdict } from '@/domain/lead-guards'

const NOW = new Date('2026-08-19T12:00:00Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const clear = { requesterRequests: [], coupleRequests: [], artisanMails: [], optedOut: false }

describe('guardVerdict', () => {
  it('laisse passer une premiere demande', () => {
    expect(guardVerdict({ now: NOW, ...clear })).toBe('ok')
  })

  it('refuse au-dela de trois demandes par heure et par demandeur', () => {
    const requesterRequests = [10, 20, 30].map((m) => new Date(NOW.getTime() - m * 60_000))
    expect(guardVerdict({ now: NOW, ...clear, requesterRequests })).toBe('requester_flooded')
  })

  it('refuse deux fois le meme couple en moins de vingt-quatre heures', () => {
    const coupleRequests = [new Date(NOW.getTime() - 2 * HOUR)]
    expect(guardVerdict({ now: NOW, ...clear, coupleRequests })).toBe('duplicate')
  })

  it('laisse repasser le meme couple apres vingt-quatre heures', () => {
    const coupleRequests = [new Date(NOW.getTime() - DAY - 1000)]
    expect(guardVerdict({ now: NOW, ...clear, coupleRequests })).toBe('ok')
  })

  it('laisse repasser le demandeur une heure apres trois demandes', () => {
    // Sans ce test, confondre HOUR et DAY dans REQUESTER_WINDOW ne se verrait
    // pas : les autres tests de ce plafond ne verrouillent que le nombre trois,
    // jamais la duree de la fenetre.
    const requesterRequests = [10, 20, 30].map(
      (m) => new Date(NOW.getTime() - HOUR - m * 60_000),
    )
    expect(guardVerdict({ now: NOW, ...clear, requesterRequests })).toBe('ok')
  })

  it('protege l artisan d un second mail dans les sept jours, quel que soit le demandeur', () => {
    const artisanMails = [new Date(NOW.getTime() - 3 * DAY)]
    expect(guardVerdict({ now: NOW, ...clear, artisanMails })).toBe('artisan_cooldown')
  })

  it('respecte l opposition avant tout le reste', () => {
    expect(guardVerdict({ now: NOW, ...clear, optedOut: true })).toBe('opted_out')
  })

  it('nomme l opposition meme quand un autre plafond joue aussi', () => {
    // L'ordre compte : une adresse opposee ne doit jamais etre decrite comme
    // « trop de demandes », sinon on la recontactera au prochain creneau.
    const artisanMails = [new Date(NOW.getTime() - 1000)]
    expect(guardVerdict({ now: NOW, ...clear, artisanMails, optedOut: true })).toBe('opted_out')
  })
})
