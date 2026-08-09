import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { chantierPost, quote, signature } from '@/db/schema'
import { chantierFileFor, companyChantierFile } from '@/services/chantier-file'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, depositLines, signedQuote } from './invoice-fixtures'
import { issueInvoice } from '@/services/invoices'

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

/** Un chantier signé, prêt à être lu des deux côtés. */
async function chantier() {
  const me = await someone()
  const companyId = await createCompany()
  const projectId = await createProject(companyId)
  const row = await signFor(companyId, projectId, me.id)

  return { me, companyId, quoteId: row.id }
}

describe('le dossier de chantier', () => {
  it('rend une chronologie MEME sans aucune publication', async () => {
    const { me, companyId, quoteId } = await chantier()
    await issueInvoice({
      companyId,
      quoteId,
      type: 'deposit',
      dueInDays: 30,
      lines: depositLines(30),
    })

    const file = await chantierFileFor(me.id, quoteId)

    expect(file!.timeline.map((e) => e.kind)).toEqual(['quote_signed', 'invoice_deposit'])
  })

  it('intercale ce que l artisan publie', async () => {
    const { me, companyId, quoteId } = await chantier()
    await db.insert(chantierPost).values({ quoteId, companyId, body: 'Dépose faite.' })

    const file = await chantierFileFor(me.id, quoteId)

    expect(file!.timeline.map((e) => e.kind)).toEqual(['quote_signed', 'post'])
    expect(file!.timeline[1].body).toBe('Dépose faite.')
  })

  it('n affiche AUCUNE date de garantie sans reception', async () => {
    const { me, quoteId } = await chantier()

    expect((await chantierFileFor(me.id, quoteId))!.deadlines).toBeNull()
  })

  it('rend les trois echeances une fois la reception declaree', async () => {
    const { me, quoteId } = await chantier()
    await db
      .update(quote)
      .set({ completedAt: new Date(), receivedAt: new Date('2026-04-20T00:00:00Z') })
      .where(eq(quote.id, quoteId))

    const file = await chantierFileFor(me.id, quoteId)

    expect(file!.deadlines).toHaveLength(3)
    expect(file!.deadlines!.at(-1)!.endsAt.getUTCFullYear()).toBe(2036)
  })

  it('REFUSE le chantier d un autre signataire', async () => {
    // Le controle le plus important du jalon : la jointure sur `signature` est
    // la condition d'acces, pas un filtre d'affichage.
    const intruder = await someone()
    const { quoteId } = await chantier()

    expect(await chantierFileFor(intruder.id, quoteId)).toBeNull()
  })

  it('renvoie aux PDF deja produits, sans en fabriquer', async () => {
    const { me, quoteId } = await chantier()

    const file = await chantierFileFor(me.id, quoteId)

    expect(file!.documents[0].href).toMatch(/^\/d\/[A-Za-z0-9_-]+\/pdf$/)
  })
})

describe('le meme dossier, cote entreprise', () => {
  it('montre exactement la meme chronologie', async () => {
    const { me, companyId, quoteId } = await chantier()
    await db.insert(chantierPost).values({ quoteId, companyId, body: 'Dépose faite.' })

    const seenByClient = await chantierFileFor(me.id, quoteId)
    const seenByCompany = await companyChantierFile(companyId, quoteId)

    expect(seenByCompany).toEqual(seenByClient)
  })

  it('REFUSE le chantier d une autre entreprise', async () => {
    const { quoteId } = await chantier()
    const rival = await createCompany()

    expect(await companyChantierFile(rival, quoteId)).toBeNull()
  })
})
