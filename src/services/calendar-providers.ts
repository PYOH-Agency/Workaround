import type { BusyInterval } from '@/domain/busy'

/**
 * Google et Microsoft, sur la portee la PLUS ETROITE qui existe.
 *
 * `calendar.readonly` donnerait les titres des evenements. Nous n'en voulons
 * pas : `freebusy.query` et `getSchedule` ne rendent que des intervalles, et
 * c'est l'API elle-meme qui garantit la promesse — pas notre discretion.
 *
 * Apple est absent : son seul acces est CalDAV avec un mot de passe
 * d'application qui ouvre ses services iCloud, et qui ne se limite a rien.
 */
export type ProviderId = 'google' | 'microsoft'

export interface CalendarProvider {
  id: ProviderId
  label: string
  configured(): boolean
  authorizeUrl(input: { redirectUri: string; state: string }): string
  exchange(input: {
    code: string
    redirectUri: string
  }): Promise<{ refreshToken: string; accountEmail: string }>
  accessToken(refreshToken: string): Promise<string>
  busy(input: { accessToken: string; from: Date; to: Date }): Promise<BusyInterval[]>
}

/** Une reponse qui n'est pas un succes doit LEVER, jamais rendre vide. */
export async function expectOk(response: Response, what: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${what} : ${response.status}`)
  return response.json()
}

export function parseGoogleBusy(payload: unknown): BusyInterval[] {
  const calendars = (payload as { calendars?: Record<string, { busy?: unknown[] }> }).calendars

  return Object.values(calendars ?? {})
    .flatMap((calendar) => calendar.busy ?? [])
    .map((slot) => slot as { start: string; end: string })
    .map((slot) => ({ from: new Date(slot.start), to: new Date(slot.end) }))
}

export function parseMicrosoftBusy(payload: unknown): BusyInterval[] {
  const schedules = (payload as {
    value?: { scheduleItems?: { start: { dateTime: string }; end: { dateTime: string } }[] }[]
  }).value

  return (schedules ?? [])
    .flatMap((schedule) => schedule.scheduleItems ?? [])
    .map((item) => ({
      // Graph rend une heure locale et son fuseau separement : on demande UTC
      // dans la requete, et l'on suffixe donc `Z` a la lecture.
      from: new Date(`${item.start.dateTime}Z`),
      to: new Date(`${item.end.dateTime}Z`),
    }))
}
