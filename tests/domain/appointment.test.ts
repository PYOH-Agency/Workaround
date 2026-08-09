import { describe, it, expect } from 'vitest'
import {
  MAX_HOURS,
  MIN_MINUTES,
  assertSchedulable,
  conflicts,
  overlaps,
  type Slot,
} from '@/domain/appointment'

const at = (iso: string) => new Date(iso)
const slot = (from: string, to: string): Slot => ({ startsAt: at(from), endsAt: at(to) })

describe('recevabilite d un creneau', () => {
  it('accepte un rendez-vous d une heure', () => {
    expect(() =>
      assertSchedulable(slot('2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')),
    ).not.toThrow()
  })

  it('refuse une fin avant le debut', () => {
    expect(() => assertSchedulable(slot('2026-09-01T09:00:00Z', '2026-09-01T08:00:00Z'))).toThrow(
      /après/,
    )
  })

  it('refuse une duree nulle', () => {
    expect(() => assertSchedulable(slot('2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'))).toThrow(
      /après/,
    )
  })

  it('refuse un creneau plus court que le minimum', () => {
    expect(() => assertSchedulable(slot('2026-09-01T08:00:00Z', '2026-09-01T08:05:00Z'))).toThrow(
      new RegExp(`${MIN_MINUTES} minutes`),
    )
  })

  it('refuse un creneau plus long que le maximum', () => {
    // Au-dela, ce n'est plus un rendez-vous : c'est une journee de chantier, et
    // l'agenda deviendrait illisible.
    expect(() => assertSchedulable(slot('2026-09-01T06:00:00Z', '2026-09-01T20:00:00Z'))).toThrow(
      new RegExp(`${MAX_HOURS} heures`),
    )
  })

  it('accepte un rendez-vous PASSE', () => {
    // Il saisit souvent apres coup, le soir. Refuser le passe lui ferait
    // renoncer a saisir — et le delai de remise du devis n'aurait plus de
    // premier bout.
    expect(() =>
      assertSchedulable(slot('2020-01-01T08:00:00Z', '2020-01-01T09:00:00Z')),
    ).not.toThrow()
  })
})

describe('chevauchement', () => {
  const morning = slot('2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z')

  it('detecte un croisement partiel', () => {
    expect(overlaps(morning, slot('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'))).toBe(true)
  })

  it('detecte un englobement', () => {
    expect(overlaps(morning, slot('2026-09-01T07:00:00Z', '2026-09-01T12:00:00Z'))).toBe(true)
  })

  it('ne compte PAS deux creneaux qui se touchent', () => {
    // Dix heures pile a l'un, dix heures pile a l'autre : c'est un enchainement,
    // pas un conflit. L'inverse ferait crier l'ecran sur une journee normale.
    expect(overlaps(morning, slot('2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'))).toBe(false)
  })

  it('ne compte pas deux jours differents', () => {
    expect(overlaps(morning, slot('2026-09-02T08:00:00Z', '2026-09-02T10:00:00Z'))).toBe(false)
  })

  it('rend les creneaux en conflit, pas un booleen', () => {
    // L'ecran doit pouvoir DIRE avec quoi ca se chevauche : « vous avez deja
    // un rendez-vous a 9 h » vaut mieux qu'un avertissement muet.
    const others = [
      slot('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'),
      slot('2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z'),
    ]

    expect(conflicts(morning, others)).toHaveLength(1)
  })
})
