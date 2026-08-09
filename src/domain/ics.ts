/**
 * Le flux iCalendar de l'agenda — RFC 5545.
 *
 * C'est le seul mecanisme de synchronisation que Google, Apple et Outlook
 * acceptent tous les trois sans compte connecte. Il est donc **la condition de
 * survie du jalon** : un agenda qui ne rejoint pas le telephone de l'artisan
 * est un deuxieme agenda, et un deuxieme agenda perd toujours.
 *
 * Rien ici n'est cosmetique. Une virgule non echappee coupe la valeur et
 * l'evenement arrive sans ville — or nos adresses en contiennent toujours une.
 * Une ligne trop longue fait rejeter le flux entier par un client strict ; un
 * saut de ligne en LF seul aussi.
 */
export interface FeedEvent {
  id: string
  startsAt: Date
  endsAt: Date
  summary: string
  location: string
  description: string
}

const CRLF = '\r\n'

/** La limite de la RFC, en OCTETS et non en caracteres. */
const MAX_OCTETS = 75

/** RFC 5545 §3.3.11 : la barre oblique inverse d'abord, sinon on echappe deux fois. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
}

/**
 * Plie a 75 OCTETS, en respectant les frontieres de caracteres.
 *
 * Compter les caracteres laisserait passer une ligne de 75 lettres accentuees,
 * soit 150 octets ; couper aveuglement a l'octet 75 casserait un « è » en deux
 * et rendrait le flux illisible. On parcourt donc par point de code, en
 * comptant les octets.
 */
function fold(line: string): string {
  const parts: string[] = []
  let current = ''
  // La continuation commence par une espace, qui compte dans la limite.
  let octets = 0

  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8')

    if (octets + size > MAX_OCTETS) {
      parts.push(current)
      current = ''
      octets = 1
    }

    current += char
    octets += size
  }

  parts.push(current)

  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join(CRLF)
}

export function buildIcs(input: {
  calendarName: string
  events: FeedEvent[]
  stampedAt: Date
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//D’équerre//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(input.calendarName)}`,
  ]

  for (const event of input.events) {
    lines.push(
      'BEGIN:VEVENT',
      // Stable : sans lui, chaque rafraichissement creerait des doublons au
      // lieu de mettre a jour.
      `UID:${event.id}@dequerre`,
      `DTSTAMP:${stamp(input.stampedAt)}`,
      `DTSTART:${stamp(event.startsAt)}`,
      `DTEND:${stamp(event.endsAt)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return lines.map(fold).join(CRLF) + CRLF
}
