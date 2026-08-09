import { describe, it, expect } from 'vitest'
import { mergeAddressBook, type ManualEntry, type PastIntervention } from '@/domain/address-book'

const d = (iso: string) => new Date(iso)

const intervention = (overrides: Partial<PastIntervention> = {}): PastIntervention => ({
  companyId: 'c1',
  companyName: 'GARANCE PLOMBERIE',
  chantierLabel: 'Remplacement chauffe-eau',
  at: d('2026-03-02T00:00:00Z'),
  ...overrides,
})

const manual = (overrides: Partial<ManualEntry> = {}): ManualEntry => ({
  id: 'm1',
  freeName: 'Couvreur de 2019',
  phone: '0556000000',
  activityLabel: null,
  note: null,
  createdAt: d('2026-01-01T00:00:00Z'),
  ...overrides,
})

describe('la part deduite des chantiers', () => {
  it('rend une seule ligne par entreprise', () => {
    // Trois interventions du meme plombier ne font pas trois plombiers.
    const entries = mergeAddressBook(
      [
        intervention({ at: d('2026-03-02T00:00:00Z') }),
        intervention({ at: d('2026-06-10T00:00:00Z'), chantierLabel: 'Fuite salle de bain' }),
      ],
      [],
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'company', interventions: 2 })
  })

  it('retient la DERNIERE intervention', () => {
    // C'est celle que le demandeur cherche : « la derniere fois qu'il est venu ».
    const entries = mergeAddressBook(
      [
        intervention({ at: d('2026-03-02T00:00:00Z'), chantierLabel: 'Chauffe-eau' }),
        intervention({ at: d('2026-06-10T00:00:00Z'), chantierLabel: 'Fuite' }),
      ],
      [],
    )

    expect(entries[0]).toMatchObject({ lastChantier: { label: 'Fuite' } })
  })

  it('classe la plus recente en tete', () => {
    const entries = mergeAddressBook(
      [
        intervention({ companyId: 'c1', companyName: 'ANCIEN', at: d('2025-01-01T00:00:00Z') }),
        intervention({ companyId: 'c2', companyName: 'RECENT', at: d('2026-06-10T00:00:00Z') }),
      ],
      [],
    )

    expect(entries.map((e) => e.name)).toEqual(['RECENT', 'ANCIEN'])
  })
})

describe('la part saisie a la main', () => {
  it('vient APRES les entreprises connues', () => {
    // Les entreprises passees par l'outil portent une verification ; celles
    // qu'il a saisies ne portent que sa memoire. L'ordre le dit.
    const entries = mergeAddressBook([intervention()], [manual()])

    expect(entries.map((e) => e.kind)).toEqual(['company', 'manual'])
  })

  it('classe la plus recemment ajoutee en tete', () => {
    const entries = mergeAddressBook(
      [],
      [
        manual({ id: 'm1', freeName: 'VIEUX', createdAt: d('2025-01-01T00:00:00Z') }),
        manual({ id: 'm2', freeName: 'NEUF', createdAt: d('2026-01-01T00:00:00Z') }),
      ],
    )

    expect(entries.map((e) => e.name)).toEqual(['NEUF', 'VIEUX'])
  })

  it('n a ni intervention ni chantier', () => {
    // Rien n'est invente : nous ne savons rien de ce qu'elle a fait.
    const [entry] = mergeAddressBook([], [manual()])

    expect(entry.kind).toBe('manual')
    expect('lastChantier' in entry).toBe(false)
  })
})

describe('un carnet vide', () => {
  it('ne rend rien', () => {
    expect(mergeAddressBook([], [])).toEqual([])
  })
})
