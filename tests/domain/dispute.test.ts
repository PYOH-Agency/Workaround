import { describe, it, expect } from 'vitest'
import {
  DISPUTE_WINDOW_DAYS,
  MAX_REASON_LENGTH,
  assertDisputable,
  disputeStanding,
  expiryOf,
  type Dispute,
} from '@/domain/dispute'

const NOW = new Date('2026-08-09T12:00:00Z')
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

const open = (overrides: Partial<Dispute> = {}): Dispute => ({
  expiresAt: daysFromNow(14),
  verdict: null,
  ...overrides,
})

describe('la fenetre de reponse', () => {
  it('dure quatorze jours', () => {
    expect(DISPUTE_WINDOW_DAYS).toBe(14)
  })

  it('se calcule depuis l ouverture', () => {
    expect(expiryOf(NOW).toISOString()).toBe('2026-08-23T12:00:00.000Z')
  })
})

describe('etat d une contestation', () => {
  it('est en instruction tant que le delai court', () => {
    expect(disputeStanding(open(), NOW)).toBe('under_review')
  })

  it('est retenue quand le client donne raison a l artisan', () => {
    expect(disputeStanding(open({ verdict: 'upheld' }), NOW)).toBe('upheld')
  })

  it('est close quand le client donne tort', () => {
    expect(disputeStanding(open({ verdict: 'rejected' }), NOW)).toBe('settled')
  })

  it('est close quand le delai est passe sans reponse', () => {
    // LA regle du jalon : le silence ne profite jamais au contestant. Sans
    // elle, l'artisan contesterait chaque chantier defavorable et s'appuierait
    // sur l'absence de reponse pour les neutraliser indefiniment.
    expect(disputeStanding(open({ expiresAt: daysFromNow(-1) }), NOW)).toBe('settled')
  })

  it('traite l instant exact de l expiration comme une cloture', () => {
    // Une inegalite stricte laisserait un chantier en instruction une
    // milliseconde de trop : sans consequence, mais indefendable a expliquer.
    expect(disputeStanding(open({ expiresAt: NOW }), NOW)).toBe('settled')
  })

  it('garde une contestation retenue apres l expiration du delai', () => {
    // Une reponse ne se perime pas. Le delai borne l'attente, pas le verdict.
    expect(disputeStanding(open({ verdict: 'upheld', expiresAt: daysFromNow(-30) }), NOW)).toBe(
      'upheld',
    )
  })
})

describe('recevabilite', () => {
  const base = {
    completedAt: new Date('2026-08-01T10:00:00Z'),
    committedLeadTimeDays: 5,
    businessDaysUsed: 23,
    existing: null,
    reason: 'Le client était absent trois semaines.',
  }

  it('accepte un chantier termine en retard, jamais conteste', () => {
    expect(() => assertDisputable(base)).not.toThrow()
  })

  it('refuse un chantier qui n est pas termine', () => {
    expect(() => assertDisputable({ ...base, completedAt: null })).toThrow(/terminé/)
  })

  it('refuse un chantier sans delai engage', () => {
    // Il ne compte deja pas dans le taux : le contester n'aurait aucun effet.
    expect(() => assertDisputable({ ...base, committedLeadTimeDays: null })).toThrow(/délai/)
  })

  it('refuse un chantier livre dans les temps', () => {
    // Offrir le bouton sur tous les chantiers inviterait a contester par
    // reflexe. On ne conteste que ce qui coute quelque chose.
    expect(() => assertDisputable({ ...base, businessDaysUsed: 4 })).toThrow(/dans le délai/)
  })

  it('refuse une contestation sur un chantier pile dans le delai', () => {
    // Cinq jours engages, cinq jours consommes : tenu. Une inegalite large ici
    // ouvrirait la contestation a des chantiers qui comptent deja comme
    // respectes — l'artisan gagnerait a contester ce qu'il a reussi.
    expect(() => assertDisputable({ ...base, businessDaysUsed: 5 })).toThrow(/dans le délai/)
  })

  it('refuse une seconde contestation', () => {
    // Rejouer la meme contestation jusqu'a obtenir une reponse favorable
    // viderait l'arbitrage de son sens.
    expect(() => assertDisputable({ ...base, existing: open() })).toThrow(/déjà/)
  })

  it('refuse une seconde contestation MEME apres un verdict defavorable', () => {
    expect(() => assertDisputable({ ...base, existing: open({ verdict: 'rejected' }) })).toThrow(
      /déjà/,
    )
  })

  it('exige un motif', () => {
    expect(() => assertDisputable({ ...base, reason: '   ' })).toThrow(/motif/)
  })

  it('refuse un motif plus long que la limite', () => {
    const tooLong = 'a'.repeat(MAX_REASON_LENGTH + 1)
    expect(() => assertDisputable({ ...base, reason: tooLong })).toThrow(/trop long/)
  })
})
