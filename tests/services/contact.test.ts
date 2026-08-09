import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql, eq, and } from 'drizzle-orm'

const sendRawMail = vi.hoisted(() => vi.fn())
vi.mock('@/services/email', () => ({ sendRawMail }))

const { db, connection } = await import('@/db/client')
const { company, event } = await import('@/db/schema')
const { relayContact } = await import('@/services/contact')

const COMPANY = randomUUID()

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'PLOMBERIE CONTACT',
    email: 'artisan@contact.test',
  })
})

afterEach(() => vi.clearAllMocks())
afterAll(async () => {
  await connection.end()
})

const demande = {
  companyId: COMPANY,
  name: 'Paul Martin',
  email: 'paul@client.test',
  phone: '0612345678',
  message: 'Ma chaudière fuit depuis hier.',
  ipHash: 'empreinte-de-test',
}

describe('relais d une demande', () => {
  it('transmet le message a l entreprise', async () => {
    await relayContact({ ...demande, ipHash: randomUUID() }, new Date())

    expect(sendRawMail).toHaveBeenCalledOnce()
    const { to, text } = sendRawMail.mock.calls[0][0]
    expect(to).toBe('artisan@contact.test')
    expect(text).toContain('Ma chaudière fuit')
    expect(text).toContain('paul@client.test')
  })

  it("n'ecrit NULLE PART le contenu de la demande", async () => {
    const unique = `secret${randomUUID().replace(/-/g, '')}`
    await relayContact({ ...demande, message: unique, ipHash: randomUUID() }, new Date())

    // On balaie TOUTES les colonnes textuelles de TOUTES les tables du schema
    // public. Un scan cible sur les tables qu'on croit ecrire ne prouverait
    // rien : c'est precisement une ecriture inattendue qu'on cherche. C'est ce
    // test qui garantit qu'aucune base de leads ne peut se constituer.
    const columns = await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
    `)

    const hits: string[] = []
    for (const { table_name, column_name } of columns) {
      const [{ n }] = await db.execute<{ n: number }>(
        sql.raw(
          `SELECT count(*)::int AS n FROM "${table_name}" WHERE "${column_name}"::text LIKE '%${unique}%'`,
        ),
      )
      if (n > 0) hits.push(`${table_name}.${column_name}`)
    }

    expect(hits).toEqual([])
  })

  it('journalise le fait, sans donnee personnelle', async () => {
    await relayContact({ ...demande, ipHash: randomUUID() }, new Date())

    const rows = await db
      .select()
      .from(event)
      .where(and(eq(event.subjectId, COMPANY), eq(event.type, 'directory.contact')))

    expect(rows.length).toBeGreaterThan(0)
    const payload = JSON.stringify(rows[0].payload)
    expect(payload).not.toContain('paul@client.test')
    expect(payload).not.toContain('Paul Martin')
    expect(payload).not.toContain('0612345678')
  })

  it('refuse une entreprise sans adresse plutot que d avaler la demande', async () => {
    const mute = randomUUID()
    await db.insert(company).values({
      id: mute,
      siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
      legalName: 'SANS ADRESSE',
      email: null,
    })

    await expect(
      relayContact({ ...demande, companyId: mute, ipHash: randomUUID() }, new Date()),
    ).rejects.toThrow('joindre')
  })

  it('bloque au-dela du plafond horaire', async () => {
    const flood = { ...demande, ipHash: `flood-${randomUUID()}` }

    for (let i = 0; i < 5; i++) await relayContact(flood, new Date())

    await expect(relayContact(flood, new Date())).rejects.toThrow('trop de demandes')
  })
})

describe('reprise de contact', () => {
  const sent = () => sendRawMail.mock.calls[0][0] as { text: string }

  it('dit a l entreprise qu il s agit de son propre client', async () => {
    await relayContact(
      { ...demande, ipHash: randomUUID(), previousQuoteNumber: 'D2026-0001' },
      new Date(),
    )

    expect(sent().text).toContain('Vous avez déjà travaillé pour cette personne')
    expect(sent().text).toContain('D2026-0001')
  })

  it('se distingue de la demande entrante dans le journal', async () => {
    // La seule mesure que nous aurons de l'utilite du repertoire : sans deux
    // types distincts, l'acquisition et la fidelisation se confondent.
    await relayContact(
      { ...demande, ipHash: randomUUID(), previousQuoteNumber: 'D2026-0001' },
      new Date(),
    )

    const journal = await db.select().from(event).where(eq(event.subjectId, COMPANY))
    expect(journal.some((e) => e.type === 'address_book.contact')).toBe(true)
  })

  it('n ecrit TOUJOURS rien de ce que le demandeur saisit', async () => {
    // La regle de M4 tient sans exception : il ne doit exister aucune base de
    // leads, et la reprise de contact n'en cree pas une.
    await relayContact(
      { ...demande, ipHash: randomUUID(), previousQuoteNumber: 'D2026-0001' },
      new Date(),
    )

    const dumped = JSON.stringify(
      await db.select().from(event).where(eq(event.subjectId, COMPANY)),
    )

    expect(dumped).not.toContain(demande.name)
    expect(dumped).not.toContain(demande.email)
    expect(dumped).not.toContain(demande.message)
  })
})
