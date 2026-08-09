import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { appointment, calendarConnection, event } from '@/db/schema'
import { busyFor, linkCalendar, linkedCalendars, unlinkCalendar } from '@/services/calendar-links'
import { google } from '@/services/calendar-google'
import { createCompany } from './invoice-fixtures'

beforeAll(() => {
  process.env.SECRET_KEY = Buffer.alloc(32, 3).toString('base64')
})

afterAll(async () => {
  await connection.end()
})

const FROM = new Date('2026-09-01T00:00:00Z')
const TO = new Date('2026-09-08T00:00:00Z')

describe('raccorder', () => {
  it('chiffre le jeton avant qu il atteigne la base', async () => {
    const companyId = await createCompany()

    await linkCalendar({
      companyId,
      provider: 'google',
      accountEmail: 'artisan@gmail.test',
      refreshToken: 'jeton-tres-secret',
    })

    const [row] = await db
      .select()
      .from(calendarConnection)
      .where(eq(calendarConnection.companyId, companyId))

    expect(row.refreshTokenEnc).not.toContain('jeton-tres-secret')
    expect(row.accountEmail).toBe('artisan@gmail.test')
  })

  it('remplace un raccordement du meme fournisseur', async () => {
    // Deux jetons pour un meme agenda ne serviraient a rien.
    const companyId = await createCompany()
    const link = { companyId, provider: 'google' as const, refreshToken: 'a' }

    await linkCalendar({ ...link, accountEmail: 'premier@gmail.test' })
    await linkCalendar({ ...link, accountEmail: 'second@gmail.test' })

    const linked = await linkedCalendars(companyId)

    expect(linked).toHaveLength(1)
    expect(linked[0].accountEmail).toBe('second@gmail.test')
  })

  it('retire le jeton en revoquant, sans effacer la trace', async () => {
    const companyId = await createCompany()
    await linkCalendar({
      companyId,
      provider: 'google',
      accountEmail: 'artisan@gmail.test',
      refreshToken: 'jeton',
    })

    await unlinkCalendar(companyId, 'google')

    expect(await linkedCalendars(companyId)).toEqual([])

    const [row] = await db
      .select()
      .from(calendarConnection)
      .where(eq(calendarConnection.companyId, companyId))

    expect(row.revokedAt).not.toBeNull()
    expect(row.refreshTokenEnc).toBe('')
  })
})

describe('les creneaux occupes', () => {
  it('rend `unlinked` sans aucun raccordement', async () => {
    // Distinct de « libre » : nous n'avons rien a demander.
    expect(await busyFor(await createCompany(), FROM, TO)).toEqual({ kind: 'unlinked' })
  })

  it('rend `connected` et fusionne les intervalles', async () => {
    const companyId = await createCompany()
    await linkCalendar({
      companyId,
      provider: 'google',
      accountEmail: 'a@gmail.test',
      refreshToken: 'jeton',
    })

    vi.spyOn(google, 'accessToken').mockResolvedValue('acces')
    vi.spyOn(google, 'busy').mockResolvedValue([
      { from: new Date('2026-09-01T09:00:00Z'), to: new Date('2026-09-01T10:00:00Z') },
      { from: new Date('2026-09-01T10:00:00Z'), to: new Date('2026-09-01T11:00:00Z') },
    ])

    expect(await busyFor(companyId, FROM, TO)).toEqual({
      kind: 'connected',
      intervals: [
        { from: new Date('2026-09-01T09:00:00Z'), to: new Date('2026-09-01T11:00:00Z') },
      ],
    })

    vi.restoreAllMocks()
  })

  it('rend `unreadable`, JAMAIS `connected` vide, quand l appel echoue', async () => {
    // La regle du jalon. Afficher « libre » faute de reponse ferait poser un
    // rendez-vous par-dessus un autre — et l'artisan cesserait de faire
    // confiance a l'ecran, ce qui est pire que l'oubli lui-meme.
    const companyId = await createCompany()
    await linkCalendar({
      companyId,
      provider: 'google',
      accountEmail: 'a@gmail.test',
      refreshToken: 'jeton',
    })

    vi.spyOn(google, 'accessToken').mockRejectedValue(new Error('502'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await busyFor(companyId, FROM, TO)).toEqual({ kind: 'unreadable' })

    vi.restoreAllMocks()
  })

  it('n ecrit RIEN de l agenda de l artisan', async () => {
    // La promesse du jalon se verifie en regardant la base, pas en la relisant
    // dans une note de conception.
    const companyId = await createCompany()
    await linkCalendar({
      companyId,
      provider: 'google',
      accountEmail: 'a@gmail.test',
      refreshToken: 'jeton',
    })

    vi.spyOn(google, 'accessToken').mockResolvedValue('acces')
    vi.spyOn(google, 'busy').mockResolvedValue([
      { from: new Date('2026-09-01T09:00:00Z'), to: new Date('2026-09-01T10:00:00Z') },
    ])

    const before = await ownRows(companyId)
    await busyFor(companyId, FROM, TO)

    expect(await ownRows(companyId)).toBe(before)

    vi.restoreAllMocks()
  })
})

/**
 * Ce que la base contient POUR CETTE ENTREPRISE.
 *
 * **Scope par entreprise, jamais global.** Un total global bougerait a cause
 * des autres fichiers de tests, qui ecrivent en parallele — c'est exactement
 * l'erreur commise en M6·C avec un compteur de boite aux lettres, et elle se
 * reproduit des qu'on compte quelque chose de partage.
 *
 * Les trois tables retenues sont celles ou une ecriture serait plausible : le
 * raccordement lui-meme, les rendez-vous, et le journal.
 */
async function ownRows(companyId: string): Promise<string> {
  const [links, meetings, journal] = await Promise.all([
    db.$count(calendarConnection, eq(calendarConnection.companyId, companyId)),
    db.$count(appointment, eq(appointment.companyId, companyId)),
    db.$count(event, eq(event.companyId, companyId)),
  ])

  return JSON.stringify({ links, meetings, journal })
}
