import { describe, it, expect } from 'vitest'
import { mergeBusy, type BusyInterval } from '@/domain/busy'

const span = (from: string, to: string): BusyInterval => ({
  from: new Date(from),
  to: new Date(to),
})

const hours = (intervals: BusyInterval[]) =>
  intervals.map((i) => `${i.from.toISOString().slice(11, 16)}–${i.to.toISOString().slice(11, 16)}`)

describe('fusion des creneaux occupes', () => {
  it('fusionne deux intervalles qui se chevauchent', () => {
    const merged = mergeBusy([
      span('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'),
      span('2026-09-01T10:00:00Z', '2026-09-01T12:00:00Z'),
    ])

    expect(hours(merged)).toEqual(['09:00–12:00'])
  })

  it('fusionne deux intervalles qui se TOUCHENT', () => {
    // « Occupe 9h-10h, occupe 10h-11h » se lit mal la ou il faut lire
    // « occupe 9h-11h ».
    const merged = mergeBusy([
      span('2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'),
      span('2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'),
    ])

    expect(hours(merged)).toEqual(['09:00–11:00'])
  })

  it('garde deux intervalles disjoints', () => {
    const merged = mergeBusy([
      span('2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'),
      span('2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z'),
    ])

    expect(hours(merged)).toEqual(['09:00–10:00', '14:00–15:00'])
  })

  it('les classe, quel que soit l ordre recu', () => {
    // Deux agendas raccordes rendent leurs intervalles dans leur propre ordre.
    const merged = mergeBusy([
      span('2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z'),
      span('2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'),
    ])

    expect(hours(merged)).toEqual(['09:00–10:00', '14:00–15:00'])
  })

  it('absorbe un intervalle entierement contenu', () => {
    const merged = mergeBusy([
      span('2026-09-01T09:00:00Z', '2026-09-01T18:00:00Z'),
      span('2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'),
    ])

    expect(hours(merged)).toEqual(['09:00–18:00'])
  })

  it('ne rend rien quand il n y a rien', () => {
    expect(mergeBusy([])).toEqual([])
  })
})
