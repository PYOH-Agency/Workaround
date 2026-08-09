import { describe, it, expect } from 'vitest'
import { parseGoogleBusy, parseMicrosoftBusy } from '@/services/calendar-providers'
import { google } from '@/services/calendar-google'
import { microsoft } from '@/services/calendar-microsoft'
import { providerById } from '@/services/calendar-registry'

const AUTHORIZE = { redirectUri: 'https://dequerre.test/retour', state: 'nonce' }

describe('l autorisation Google', () => {
  it('demande la portee la PLUS ETROITE', () => {
    // `calendar.readonly` donnerait les titres des evenements. Nous n'en
    // voulons pas : la portee est ce qui rend la promesse verifiable, et non
    // notre discretion.
    const url = google.authorizeUrl(AUTHORIZE)

    expect(url).toContain('calendar.freebusy')
    expect(url).not.toContain('calendar.readonly')
    expect(url).not.toContain('auth%2Fcalendar+')
  })

  it('demande un jeton de rafraichissement', () => {
    // Sans `access_type=offline` ET `prompt=consent`, la seconde autorisation
    // ne rend aucun jeton de rafraichissement, et le raccordement se coupe
    // silencieusement au bout d'une heure — invisible le premier jour.
    const url = google.authorizeUrl(AUTHORIZE)

    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
  })
})

describe('l autorisation Microsoft', () => {
  it('demande la portee la plus etroite, et de quoi rafraichir', () => {
    const url = microsoft.authorizeUrl(AUTHORIZE)

    expect(url).toContain('Calendars.ReadBasic')
    expect(url).toContain('offline_access')
    expect(url).not.toContain('Calendars.ReadWrite')
  })
})

describe('la lecture des creneaux', () => {
  it('rend des intervalles, et rien d autre — Google', () => {
    // La reponse ne contient aucun titre : c'est l'API qui garantit la
    // promesse.
    const intervals = parseGoogleBusy({
      calendars: {
        primary: {
          busy: [{ start: '2026-09-01T09:00:00Z', end: '2026-09-01T10:00:00Z' }],
        },
      },
    })

    expect(intervals).toEqual([
      { from: new Date('2026-09-01T09:00:00Z'), to: new Date('2026-09-01T10:00:00Z') },
    ])
  })

  it('rend des intervalles, et rien d autre — Microsoft', () => {
    const intervals = parseMicrosoftBusy({
      value: [
        {
          scheduleItems: [
            {
              start: { dateTime: '2026-09-01T09:00:00.0000000' },
              end: { dateTime: '2026-09-01T10:00:00.0000000' },
            },
          ],
        },
      ],
    })

    expect(intervals).toEqual([
      { from: new Date('2026-09-01T09:00:00Z'), to: new Date('2026-09-01T10:00:00Z') },
    ])
  })

  it('rend un tableau vide quand rien n occupe la periode', () => {
    expect(parseGoogleBusy({ calendars: { primary: { busy: [] } } })).toEqual([])
    expect(parseMicrosoftBusy({ value: [{ scheduleItems: [] }] })).toEqual([])
  })

  it('ne se casse pas sur une reponse inattendue', () => {
    // Elle ne doit pas non plus etre confondue avec « libre » : c'est
    // l'appelant qui traduit une lecture manquee en `unreadable`.
    expect(parseGoogleBusy({})).toEqual([])
    expect(parseMicrosoftBusy({})).toEqual([])
  })
})

describe('le registre', () => {
  it('ne connait que Google et Microsoft', () => {
    expect(providerById('google')?.id).toBe('google')
    expect(providerById('microsoft')?.id).toBe('microsoft')
    // Apple n'a aucun OAuth calendrier : il n'est pas « pas encore fait », il
    // est refuse.
    expect(providerById('apple')).toBeNull()
  })
})
