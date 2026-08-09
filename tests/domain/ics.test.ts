import { describe, it, expect } from 'vitest'
import { buildIcs, type FeedEvent } from '@/domain/ics'

const STAMP = new Date('2026-08-09T22:00:00Z')

const event = (overrides: Partial<FeedEvent> = {}): FeedEvent => ({
  id: 'a1b2c3',
  startsAt: new Date('2026-09-01T07:00:00Z'),
  endsAt: new Date('2026-09-01T08:00:00Z'),
  summary: 'Visite — Madame Rey',
  location: '8 rue Sainte-Catherine, 33000 Bordeaux',
  description: 'Remplacement chaudière',
  ...overrides,
})

const feed = (events: FeedEvent[]) =>
  buildIcs({ calendarName: 'D’équerre — PLOMBERIE DU PARCOURS', events, stampedAt: STAMP })

describe('l enveloppe', () => {
  it('ouvre et ferme un calendrier', () => {
    const ics = feed([])

    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('reste valide sans aucun rendez-vous', () => {
    // Une semaine vide ne doit pas produire un flux casse : le telephone de
    // l'artisan le retelecharge en boucle, et une erreur d'analyse le ferait
    // se desabonner sans rien dire.
    expect(feed([])).not.toContain('BEGIN:VEVENT')
  })

  it('separe ses lignes par CRLF, jamais par LF seul', () => {
    // RFC 5545. Certains clients refusent le flux entier sur ce seul point.
    const ics = feed([event()])

    expect(ics.split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true)
  })
})

describe('un rendez-vous', () => {
  it('porte un identifiant stable', () => {
    // Sans UID stable, chaque rafraichissement creerait des doublons au lieu
    // de mettre a jour.
    expect(feed([event({ id: 'rdv-42' })])).toContain('UID:rdv-42@dequerre')
  })

  it('date en UTC, suffixe Z', () => {
    const ics = feed([event()])

    expect(ics).toContain('DTSTART:20260901T070000Z')
    expect(ics).toContain('DTEND:20260901T080000Z')
    expect(ics).toContain('DTSTAMP:20260809T220000Z')
  })

  it('ECHAPPE les virgules de l adresse', () => {
    // Nos adresses en contiennent toujours : « 8 rue X, 33000 Bordeaux ». Une
    // virgule nue coupe la valeur, et l'evenement arrive sans ville.
    expect(feed([event()])).toContain('LOCATION:8 rue Sainte-Catherine\\, 33000 Bordeaux')
  })

  it('echappe aussi les points-virgules et les barres obliques inverses', () => {
    expect(feed([event({ description: 'a;b\\c' })])).toContain('DESCRIPTION:a\\;b\\\\c')
  })

  it('remplace un retour a la ligne par sa sequence', () => {
    expect(feed([event({ description: 'Chaudière\n0612345678' })])).toContain(
      'DESCRIPTION:Chaudière\\n0612345678',
    )
  })

  it('plie les lignes trop longues', () => {
    // RFC 5545 : 75 octets. Un client strict rejette une ligne plus longue.
    const ics = feed([event({ summary: 'x'.repeat(200) })])
    const lines = ics.split(CRLF_SPLIT)

    expect(lines.every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true)
    // Une ligne pliee reprend par une espace, et rien d'autre.
    expect(lines.some((line) => line.startsWith(' x'))).toBe(true)
  })

  it('ne coupe pas un caractere accentue en deux', () => {
    // Le pliage compte des OCTETS, pas des caracteres : couper « é » au milieu
    // produirait deux octets invalides et un flux illisible.
    const summary = 'é'.repeat(80)
    const ics = feed([event({ summary })])

    expect(ics.split(CRLF_SPLIT).every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(
      true,
    )
    // Ce que fait un vrai client : deplier, et retrouver la valeur d'origine.
    expect(unfold(ics)).toContain(`SUMMARY:${summary}`)
  })
})

describe('le nom du calendrier', () => {
  it('apparait pour que l abonne sache d ou vient le flux', () => {
    expect(feed([])).toContain('X-WR-CALNAME:D’équerre — PLOMBERIE DU PARCOURS')
  })
})

const CRLF_SPLIT = '\r\n'

/** Ce que fait un client conforme : recoller les lignes pliees. */
const unfold = (ics: string) => ics.replaceAll(`${CRLF_SPLIT} `, '')
