import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event, signature } from '@/db/schema'
import { addManualEntry, addressBookFor, bookedCompany } from '@/services/address-book'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const someone = () => requesterFromSignature({ email: `p-${randomUUID()}@t.local`, name: 'Paul' })

async function signFor(companyId: string, projectId: string, requesterId: string) {
  const row = await signedQuote(companyId, projectId, 'signed')

  await db.insert(signature).values({
    quoteId: row.id,
    requesterId,
    signerName: 'Paul Martin',
    signerEmail: `s-${randomUUID().slice(0, 8)}@t.local`,
    signerPhone: '0600000000',
    codeValidatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    documentHash: 'a'.repeat(64),
    archivedPdfPath: `${companyId}/${row.id}.pdf`,
  })

  return row
}

/**
 * Un message du collecteur porte-t-il ce texte ?
 *
 * **Un temoin unique, jamais un compteur.** Compter la boite avant et apres ne
 * peut rien isoler : les autres fichiers de tests envoient du courrier en
 * parallele, et le total bouge pour des raisons etrangeres a ce qu'on verifie.
 * C'est la meme lecon qu'en M4, ou un temoin partage avait rendu un test
 * ambigu.
 */
async function mailboxMentions(needle: string): Promise<boolean> {
  const response = await fetch('http://127.0.0.1:54324/api/v1/messages?limit=100')
  const { messages = [] } = (await response.json()) as {
    messages?: { Subject: string; To: { Address: string }[] }[]
  }

  return messages.some(
    (mail) => mail.Subject.includes(needle) || mail.To.some((to) => to.Address.includes(needle)),
  )
}

describe('le carnet du demandeur', () => {
  it('reunit les entreprises deja intervenues', async () => {
    const me = await someone()
    const plumber = await createCompany()
    await signFor(plumber, await createProject(plumber), me.id)

    const book = await addressBookFor(me.id, new Date())

    expect(book).toHaveLength(1)
    expect(book[0]).toMatchObject({ kind: 'company', interventions: 1 })
  })

  it('ne montre JAMAIS le carnet d un autre demandeur', async () => {
    const me = await someone()
    const other = await someone()
    const builder = await createCompany()
    await signFor(builder, await createProject(builder), other.id)
    await addManualEntry({
      requesterId: other.id,
      freeName: 'Couvreur du voisin',
      phone: '0556000000',
      activityCode: null,
      note: '',
    })

    expect(await addressBookFor(me.id, new Date())).toEqual([])
  })

  it('ajoute une entreprise que nous ne connaissons pas', async () => {
    const me = await someone()
    await addManualEntry({
      requesterId: me.id,
      freeName: 'Couvreur de 2019',
      phone: '0556000000',
      activityCode: null,
      note: 'Rapide et propre.',
    })

    const book = await addressBookFor(me.id, new Date())

    expect(book[0]).toMatchObject({ kind: 'manual', name: 'Couvreur de 2019' })
  })

  it('n ecrit NI le nom NI le telephone saisis au journal', async () => {
    // Un tiers qui n'a rien demande, et qui ne peut pas s'opposer a une ligne
    // dans un journal immuable.
    const me = await someone()
    await addManualEntry({
      requesterId: me.id,
      freeName: 'Temoin Zorglub',
      phone: '0790112233',
      activityCode: null,
      note: '',
    })

    const journal = await db.select().from(event).where(eq(event.subjectId, me.id))
    const dumped = JSON.stringify(journal)

    expect(journal.some((e) => e.type === 'address_book.entry_added')).toBe(true)
    expect(dumped).not.toContain('Temoin Zorglub')
    expect(dumped).not.toContain('0790112233')
  })

  it('montre l etat de verification d AUJOURD HUI', async () => {
    // Ce qui fait vivre le label apres la vente. Une entreprise sans
    // attestation valide apparait comme non couverte dans le carnet de ceux
    // qui l'ont employee.
    const me = await someone()
    const builder = await createCompany()
    await signFor(builder, await createProject(builder), me.id)

    const [entry] = await addressBookFor(me.id, new Date())

    expect(entry.kind).toBe('company')
    // Aucune activite declaree ni certifiee : rien n'est couvert, et rien
    // n'est promis.
    expect(entry.coverage?.covered).toEqual([])
    expect(entry.coverage?.passportPath).toBeNull()
  })

  it('REFUSE la fiche d une entreprise chez qui il n a rien signe', async () => {
    const me = await someone()
    const stranger = await createCompany()

    expect(await bookedCompany(me.id, stranger, new Date())).toBeNull()
  })

  it('rend la fiche avec le devis deja signe', async () => {
    const me = await someone()
    const plumber = await createCompany()
    const row = await signFor(plumber, await createProject(plumber), me.id)

    const sheet = await bookedCompany(me.id, plumber, new Date())

    expect(sheet?.previousQuoteNumber).toBe(row.number)
  })
})

describe('aucune invitation', () => {
  it('n envoie AUCUN message a l entreprise saisie', async () => {
    // La decision la plus facile a eroder du jalon : elle ne coute rien a
    // trahir et se verrait six mois plus tard.
    const me = await someone()
    const witness = `Couvreur-${randomUUID().slice(0, 8)}`

    await addManualEntry({
      requesterId: me.id,
      freeName: witness,
      phone: '0556000000',
      activityCode: null,
      note: '',
    })

    expect(await mailboxMentions(witness)).toBe(false)
  })
})
