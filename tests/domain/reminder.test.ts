import { describe, it, expect } from 'vitest'
import { remindersDue, type Remindable } from '@/domain/reminder'

const NOW = new Date('2026-08-31T06:00:00Z')

const item = (overrides: Partial<Remindable> = {}): Remindable => ({
  id: 'a1',
  startsAt: new Date('2026-09-01T08:00:00Z'),
  status: 'scheduled',
  alreadyReminded: false,
  ...overrides,
})

describe('la veille', () => {
  it('rappelle un rendez-vous de demain', () => {
    expect(remindersDue([item()], NOW)).toHaveLength(1)
  })

  it('ne rappelle PAS un rendez-vous d aujourd hui', () => {
    // Le travail de fond tourne le matin : un rendez-vous du jour meme se
    // rappellerait trop tard pour servir a quoi que ce soit.
    expect(remindersDue([item({ startsAt: new Date('2026-08-31T15:00:00Z') })], NOW)).toEqual([])
  })

  it('ne rappelle pas un rendez-vous d apres-demain', () => {
    expect(remindersDue([item({ startsAt: new Date('2026-09-02T08:00:00Z') })], NOW)).toEqual([])
  })

  it('compte les jours a PARIS, pas en UTC', () => {
    // 31 aout 23 h 30 UTC = 1er septembre 1 h 30 a Paris : c'est bien demain.
    expect(remindersDue([item({ startsAt: new Date('2026-08-31T23:30:00Z') })], NOW)).toHaveLength(
      1,
    )
  })

  it('franchit un changement de mois', () => {
    const eve = new Date('2026-09-30T06:00:00Z')
    const next = item({ startsAt: new Date('2026-10-01T08:00:00Z') })

    expect(remindersDue([next], eve)).toHaveLength(1)
  })
})

describe('ce qui ne se rappelle pas', () => {
  it('ecarte un rendez-vous annule', () => {
    // Le client a deja ete prevenu de l'annulation, ou va l'etre : lui
    // rappeler un rendez-vous qui n'aura pas lieu serait pire que rien.
    expect(remindersDue([item({ status: 'cancelled' })], NOW)).toEqual([])
  })

  it('ecarte un rendez-vous DEJA rappele', () => {
    // Un seul rappel, aucune relance : relancer transformerait un service
    // rendu en pression exercee sur un particulier.
    expect(remindersDue([item({ alreadyReminded: true })], NOW)).toEqual([])
  })
})
