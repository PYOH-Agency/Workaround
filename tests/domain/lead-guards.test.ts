import { describe, expect, it } from 'vitest'
import { guardVerdict } from '@/domain/lead-guards'

const NOW = new Date('2026-08-19T12:00:00Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const noHistory = { requesterRequests: [], coupleRequests: [], artisanMails: [], optedOut: false }

describe('guardVerdict', () => {
  it('laisse passer une premiere demande', () => {
    expect(guardVerdict({ now: NOW, ...noHistory })).toBe('ok')
  })

  it('refuse au-dela de trois demandes par heure et par demandeur', () => {
    const requesterRequests = [10, 20, 30].map((m) => new Date(NOW.getTime() - m * 60_000))
    expect(guardVerdict({ now: NOW, ...noHistory, requesterRequests })).toBe('requester_flooded')
  })

  it('laisse repasser le demandeur une heure apres trois demandes', () => {
    // La fenetre du plafond demandeur se compte en heures, pas en jours : une
    // fois sorties de l'heure, les memes trois demandes ne comptent plus.
    const requesterRequests = [10, 20, 30].map(
      (m) => new Date(NOW.getTime() - HOUR - m * 60_000),
    )
    expect(guardVerdict({ now: NOW, ...noHistory, requesterRequests })).toBe('ok')
  })

  it('refuse deux fois le meme couple en moins de vingt-quatre heures', () => {
    const coupleRequests = [new Date(NOW.getTime() - 2 * HOUR)]
    expect(guardVerdict({ now: NOW, ...noHistory, coupleRequests })).toBe('already_requested')
  })

  it('laisse repasser le meme couple apres vingt-quatre heures', () => {
    const coupleRequests = [new Date(NOW.getTime() - DAY - 1000)]
    expect(guardVerdict({ now: NOW, ...noHistory, coupleRequests })).toBe('ok')
  })

  it("protege l'artisan d'un second mail dans les sept jours, quel que soit le demandeur", () => {
    const artisanMails = [new Date(NOW.getTime() - 3 * DAY)]
    expect(guardVerdict({ now: NOW, ...noHistory, artisanMails })).toBe('artisan_cooldown')
  })

  it("rend l'artisan a nouveau joignable sept jours apres le dernier mail", () => {
    // La treve artisan est la garde qui compte : elle merite sa direction de
    // sortie autant que son entree, sans quoi une fenetre demesuree (70 jours,
    // voire sans fin) passerait la suite sans jamais etre prise en defaut.
    const artisanMails = [new Date(NOW.getTime() - 7 * DAY - 1000)]
    expect(guardVerdict({ now: NOW, ...noHistory, artisanMails })).toBe('ok')
  })

  it("respecte l'opposition avant tout le reste", () => {
    expect(guardVerdict({ now: NOW, ...noHistory, optedOut: true })).toBe('opted_out')
  })

  it("nomme l'opposition meme quand un autre plafond joue aussi", () => {
    // L'ordre compte : une adresse opposee ne doit jamais etre decrite comme
    // « trop de demandes », sinon on la recontactera au prochain creneau.
    const artisanMails = [new Date(NOW.getTime() - 1000)]
    expect(
      guardVerdict({ now: NOW, ...noHistory, artisanMails, optedOut: true }),
    ).toBe('opted_out')
  })

  it("protege l'artisan avant de proteger nos serveurs quand tout est charge a la fois", () => {
    // Les trois plafonds peuvent jouer ensemble : c'est alors la treve artisan
    // qui doit parler, pas le doublon de couple ni le plafond demandeur —
    // sinon la phrase « la protection de l'artisan avant celle de nos
    // serveurs » ne serait qu'une intention, jamais verifiee.
    const artisanMails = [new Date(NOW.getTime() - 3 * DAY)]
    const coupleRequests = [new Date(NOW.getTime() - 2 * HOUR)]
    const requesterRequests = [10, 20, 30].map((m) => new Date(NOW.getTime() - m * 60_000))
    expect(
      guardVerdict({ now: NOW, artisanMails, coupleRequests, requesterRequests, optedOut: false }),
    ).toBe('artisan_cooldown')
  })
})
