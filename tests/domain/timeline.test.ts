import { describe, it, expect } from 'vitest'
import { buildTimeline, type ChantierFacts } from '@/domain/timeline'

const d = (iso: string) => new Date(iso)

const bare = (overrides: Partial<ChantierFacts> = {}): ChantierFacts => ({
  signedAt: d('2026-03-02T09:00:00Z'),
  completedAt: null,
  amendments: [],
  invoices: [],
  payments: [],
  posts: [],
  ...overrides,
})

describe('la colonne vertebrale', () => {
  it('rend une chronologie MEME quand l artisan n a rien publie', () => {
    // La decision qui porte le jalon : un fil vide afficherait « aucune
    // actualite depuis trois semaines » et degraderait la page qu'il devait
    // servir. La colonne vertebrale est derivee, elle ne depend de personne.
    const entries = buildTimeline(
      bare({
        completedAt: d('2026-04-20T17:00:00Z'),
        invoices: [
          { type: 'deposit', issuedAt: d('2026-03-03T10:00:00Z'), totalInclTax: 30000 },
          { type: 'balance', issuedAt: d('2026-04-20T17:00:00Z'), totalInclTax: 70000 },
        ],
        payments: [{ receivedAt: d('2026-03-10T00:00:00Z'), amount: 30000 }],
      }),
    )

    expect(entries.map((e) => e.kind)).toEqual([
      'quote_signed',
      'invoice_deposit',
      'payment',
      'invoice_balance',
      'completed',
    ])
  })

  it('se lit dans le sens du temps', () => {
    const entries = buildTimeline(bare({ completedAt: d('2026-04-20T17:00:00Z') }))

    expect(entries[0].kind).toBe('quote_signed')
    expect(entries.at(-1)!.kind).toBe('completed')
  })

  it('ne rend pas de fin de chantier tant qu il n est pas termine', () => {
    expect(buildTimeline(bare()).map((e) => e.kind)).toEqual(['quote_signed'])
  })

  it('porte le montant des factures et des paiements', () => {
    const entries = buildTimeline(
      bare({
        invoices: [{ type: 'progress', issuedAt: d('2026-03-15T10:00:00Z'), totalInclTax: 45000 }],
      }),
    )

    expect(entries[1]).toMatchObject({ kind: 'invoice_progress', amountInclTax: 45000 })
  })

  it('distingue l avoir des autres factures', () => {
    // Un avoir corrige : le confondre avec une facture ferait lire deux
    // demandes d'argent la ou il y en a une, puis son annulation.
    const entries = buildTimeline(
      bare({
        invoices: [
          { type: 'credit_note', issuedAt: d('2026-03-20T10:00:00Z'), totalInclTax: 45000 },
        ],
      }),
    )

    expect(entries[1].kind).toBe('invoice_credit_note')
  })

  it('numerote les avenants', () => {
    const entries = buildTimeline(
      bare({ amendments: [{ version: 2, signedAt: d('2026-03-25T10:00:00Z') }] }),
    )

    expect(entries[1]).toMatchObject({ kind: 'amendment_signed', version: 2 })
  })
})

describe('ce que l artisan publie', () => {
  it('s intercale a sa date, pas a la fin', () => {
    const entries = buildTimeline(
      bare({
        completedAt: d('2026-04-20T17:00:00Z'),
        posts: [
          { createdAt: d('2026-03-12T08:00:00Z'), body: 'Dépose terminée.', photoPaths: [] },
        ],
      }),
    )

    expect(entries.map((e) => e.kind)).toEqual(['quote_signed', 'post', 'completed'])
    expect(entries[1].body).toBe('Dépose terminée.')
  })

  it('porte ses photos', () => {
    const entries = buildTimeline(
      bare({
        posts: [{ createdAt: d('2026-03-12T08:00:00Z'), body: 'Voilà.', photoPaths: ['a/1.jpg'] }],
      }),
    )

    expect(entries[1].photoPaths).toEqual(['a/1.jpg'])
  })

  it('range deux evenements du meme instant de facon deterministe', () => {
    // Un solde emis le jour de la fin de chantier : l'ordre ne doit pas
    // dependre de l'ordre des lignes rendues par la base.
    const facts = bare({
      completedAt: d('2026-04-20T17:00:00Z'),
      invoices: [{ type: 'balance', issuedAt: d('2026-04-20T17:00:00Z'), totalInclTax: 70000 }],
    })

    expect(buildTimeline(facts).map((e) => e.kind)).toEqual(
      buildTimeline(facts).map((e) => e.kind),
    )
    expect(buildTimeline(facts).at(-1)!.kind).toBe('completed')
  })
})
