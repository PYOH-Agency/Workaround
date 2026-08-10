import { describe, it, expect } from 'vitest'
import {
  quoteIsSilent,
  completionIsUnbilled,
  certificateIsExpiring,
  orderTasks,
  FOLLOW_UP_BUSINESS_DAYS,
  VALIDITY_ALERT_DAYS,
  type Task,
} from '@/domain/home-queue'

/** Jeudi 6 aout 2026. Les jours ouvres comptent, les week-ends non. */
const now = new Date('2026-08-06T09:00:00Z')

const task = (kind: Task['kind'], dueInDays: number): Task => ({
  kind,
  id: `${kind}-${dueInDays}`,
  title: kind,
  detail: '',
  amountInclTax: null,
  dueInDays,
  href: '/',
  action: 'Ouvrir',
})

describe('un devis qui attend', () => {
  it('entre dans la file au septieme jour ouvre', () => {
    expect(FOLLOW_UP_BUSINESS_DAYS).toBe(7)
    // Envoye le mardi 28 juillet : sept jours ouvres au jeudi 6 aout.
    // `businessDaysSince` compte ]depuis, maintenant] — le jour de l'envoi ne
    // compte pas, et c'est ce qui fait un mardi et non un mercredi.
    const sentAt = new Date('2026-07-28T09:00:00Z')
    expect(quoteIsSilent({ sentAt, validityDays: 90 }, now)).toBe(true)
  })

  it("n'y entre pas au sixieme", () => {
    const sentAt = new Date('2026-07-29T09:00:00Z')
    expect(quoteIsSilent({ sentAt, validityDays: 90 }, now)).toBe(false)
  })

  it('ne compte pas le week-end', () => {
    // Un devis parti vendredi soir ne traine pas le lundi matin : entre le
    // vendredi 31 juillet et le jeudi 6 aout il n'y a que quatre jours ouvres.
    const sentAt = new Date('2026-07-31T18:00:00Z')
    expect(quoteIsSilent({ sentAt, validityDays: 90 }, now)).toBe(false)
  })

  it('y entre aussi quand sa validite expire bientot', () => {
    expect(VALIDITY_ALERT_DAYS).toBe(15)
    // Envoye il y a deux jours ouvres — donc muet, non — mais valable 5 jours.
    const sentAt = new Date('2026-08-04T09:00:00Z')
    expect(quoteIsSilent({ sentAt, validityDays: 5 }, now)).toBe(true)
  })

  it('sort de la file une fois la validite passee', () => {
    // Un devis expire n'appelle plus de relance : il appelle un nouveau devis,
    // et ce n'est pas la meme conversation.
    const sentAt = new Date('2026-06-01T09:00:00Z')
    expect(quoteIsSilent({ sentAt, validityDays: 30 }, now)).toBe(false)
  })
})

describe('un chantier fini et non solde', () => {
  it('attend trois jours ouvres avant de reclamer', () => {
    // Un chantier fini le mardi entre le vendredi, pas le mercredi.
    expect(completionIsUnbilled({ completedAt: new Date('2026-08-03T09:00:00Z'), remaining: 320_000 }, now)).toBe(true)
    expect(completionIsUnbilled({ completedAt: new Date('2026-08-05T09:00:00Z'), remaining: 320_000 }, now)).toBe(false)
  })

  it('ignore un chantier entierement facture', () => {
    expect(completionIsUnbilled({ completedAt: new Date('2026-07-01T09:00:00Z'), remaining: 0 }, now)).toBe(false)
  })

  it('ignore un trop-percu', () => {
    // Un reste negatif est un avoir a emettre, pas une facture a etablir.
    expect(completionIsUnbilled({ completedAt: new Date('2026-07-01T09:00:00Z'), remaining: -1_000 }, now)).toBe(false)
  })
})

describe('une attestation qui expire', () => {
  it('entre au premier palier de preavis, soixante jours', () => {
    expect(certificateIsExpiring(new Date('2026-10-04T00:00:00Z'), now)).toBe(true)
    expect(certificateIsExpiring(new Date('2026-10-06T00:00:00Z'), now)).toBe(false)
  })

  it('reste dans la file une fois expiree', () => {
    // C'est le moment ou le passeport cesse d'etre visible : la retirer de la
    // file au moment ou elle coute le plus cher serait absurde.
    expect(certificateIsExpiring(new Date('2026-07-01T00:00:00Z'), now)).toBe(true)
  })
})

describe('l ordre de la file', () => {
  it('classe par nature avant de classer par anciennete', () => {
    // Une facture echue depuis quatre jours passerait sinon devant une
    // attestation qui expire dans trois semaines, et les deux ne coutent pas
    // la meme chose.
    const ordered = orderTasks([
      task('unbilled_completion', 4),
      task('silent_quote', 18),
      task('overdue_invoice', 12),
      task('certificate', 21),
    ])

    expect(ordered.map((t) => t.kind)).toEqual([
      'certificate',
      'overdue_invoice',
      'silent_quote',
      'unbilled_completion',
    ])
  })

  it('classe le plus ancien en premier a nature egale', () => {
    const ordered = orderTasks([task('silent_quote', 8), task('silent_quote', 30)])
    expect(ordered.map((t) => t.dueInDays)).toEqual([30, 8])
  })

  it('ne touche pas au tableau qu on lui donne', () => {
    // `sort` trie en place. Sans la copie, l'ordre d'un tableau relu ailleurs
    // dependrait de qui a appele cette fonction en premier.
    const given = [task('silent_quote', 8), task('certificate', 21)]
    orderTasks(given)

    expect(given.map((t) => t.kind)).toEqual(['silent_quote', 'certificate'])
  })
})
