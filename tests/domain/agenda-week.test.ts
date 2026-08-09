import { describe, it, expect } from 'vitest'
import { dayKeyOf, groupByDay, weekOf } from '@/domain/agenda-week'

describe('le jour de Paris', () => {
  it('rend le jour local, pas le jour UTC', () => {
    // 30 juin 23 h 30 UTC = 1er juillet 1 h 30 a Paris. Grouper en UTC
    // placerait ce rendez-vous la veille.
    expect(dayKeyOf(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01')
  })

  it('tient en hiver comme en ete', () => {
    // +1 en janvier, +2 en juillet : la meme heure UTC ne donne pas le meme
    // jour local selon la saison.
    expect(dayKeyOf(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16')
    expect(dayKeyOf(new Date('2026-07-15T08:00:00Z'))).toBe('2026-07-15')
  })
})

describe('la semaine', () => {
  it('commence le lundi', () => {
    // Le 2 septembre 2026 est un mercredi.
    expect(weekOf(new Date('2026-09-02T10:00:00Z'))[0]).toBe('2026-08-31')
  })

  it('compte sept jours', () => {
    expect(weekOf(new Date('2026-09-02T10:00:00Z'))).toHaveLength(7)
  })

  it('ne bouge pas quand on part du lundi lui-meme', () => {
    expect(weekOf(new Date('2026-08-31T10:00:00Z'))[0]).toBe('2026-08-31')
  })

  it('garde le dimanche dans la semaine qui l a precede', () => {
    expect(weekOf(new Date('2026-09-06T10:00:00Z'))).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ])
  })

  it('franchit un changement de mois et d annee', () => {
    expect(weekOf(new Date('2027-01-01T10:00:00Z'))[0]).toBe('2026-12-28')
  })
})

describe('le groupement', () => {
  const item = (iso: string, label: string) => ({ startsAt: new Date(iso), label })

  it('range chaque rendez-vous dans son jour de Paris', () => {
    const days = groupByDay(
      [item('2026-09-01T08:00:00Z', 'matin'), item('2026-09-02T09:00:00Z', 'lendemain')],
      weekOf(new Date('2026-09-02T10:00:00Z')),
    )

    expect(days.find((d) => d.day === '2026-09-01')!.items).toHaveLength(1)
    expect(days.find((d) => d.day === '2026-09-02')!.items).toHaveLength(1)
  })

  it('rend les sept jours, meme vides', () => {
    // Une semaine sans rendez-vous doit rester une semaine : sauter les jours
    // vides ferait sauter le lecteur d'une date a l'autre.
    const days = groupByDay([], weekOf(new Date('2026-09-02T10:00:00Z')))

    expect(days).toHaveLength(7)
    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('classe les rendez-vous d un jour par heure', () => {
    const days = groupByDay(
      [item('2026-09-01T14:00:00Z', 'apres-midi'), item('2026-09-01T08:00:00Z', 'matin')],
      weekOf(new Date('2026-09-01T10:00:00Z')),
    )

    expect(days.find((d) => d.day === '2026-09-01')!.items.map((i) => i.label)).toEqual([
      'matin',
      'apres-midi',
    ])
  })

  it('ignore ce qui tombe hors de la semaine', () => {
    // Le service sur-lit volontairement d'un jour de chaque cote : c'est ici
    // que le surplus est ecarte.
    const days = groupByDay(
      [item('2026-09-20T08:00:00Z', 'plus tard')],
      weekOf(new Date('2026-09-02T10:00:00Z')),
    )

    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })
})
