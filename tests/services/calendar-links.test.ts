import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { calendarConnection } from '@/db/schema'
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

    const before = await rowTotalsFor(companyId)

    // Sinon un recensement devenu vide passerait sans rien mesurer.
    expect(before).toContain('calendar_connection')
    expect(before).toContain('appointment')

    await busyFor(companyId, FROM, TO)

    expect(await rowTotalsFor(companyId)).toBe(before)

    vi.restoreAllMocks()
  })
})

/**
 * Le nombre exact de lignes rattachees a UNE entreprise, table par table.
 *
 * Le recensement reste automatique — toute table portant `company_id`, y
 * compris celles a venir, entre dans le compte sans qu'on la nomme ici. Mais
 * il s'arrete au perimetre de l'entreprise du test : vitest lance les fichiers
 * en parallele contre la meme base, et un recensement global se faisait
 * casser par les insertions des autres suites, pas par un ecrit de l'agenda.
 *
 * `pg_stat_user_tables` serait approximatif et differe : on compte pour de
 * vrai, sinon le test passerait sur une statistique en retard.
 */
async function rowTotalsFor(companyId: string): Promise<string> {
  const rows = await db.execute<{ name: string; total: number }>(sql`
    SELECT c.relname AS name,
           (xpath('/row/c/text()',
                  query_to_xml(format('SELECT count(*) AS c FROM %I.%I WHERE company_id = %L',
                                      -- Le cast est requis : format() prend
                                      -- « any » en variadique, et sans type le
                                      -- parametre ne s'analyse pas.
                                      n.nspname, c.relname, ${companyId}::text),
                               false, true, '')))[1]::text::int AS total
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
                       AND a.attname = 'company_id'
                       AND a.attnum > 0
                       AND NOT a.attisdropped
    WHERE c.relkind = 'r' AND n.nspname = 'public'
    ORDER BY c.relname
  `)

  return JSON.stringify(rows)
}
