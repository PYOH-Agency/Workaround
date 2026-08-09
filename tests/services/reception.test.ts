import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event, quote, signature } from '@/db/schema'
import { declareReception } from '@/services/reception'
import { chantierFileFor } from '@/services/chantier-file'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const someone = () => requesterFromSignature({ email: `p-${randomUUID()}@t.local`, name: 'Paul' })

/** Un chantier signé puis terminé, prêt à être reçu. */
async function completedChantier() {
  const me = await someone()
  const companyId = await createCompany()
  const projectId = await createProject(companyId)
  const row = await signedQuote(companyId, projectId, 'signed')

  await db.insert(signature).values({
    quoteId: row.id,
    requesterId: me.id,
    signerName: 'Paul Martin',
    signerEmail: `s-${randomUUID().slice(0, 8)}@t.local`,
    signerPhone: '0600000000',
    codeValidatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    documentHash: 'a'.repeat(64),
    archivedPdfPath: `${companyId}/${row.id}.pdf`,
  })

  // Les dates du chantier forment une histoire coherente : signe en mars,
  // termine en avril. `signedQuote` signe « maintenant », ce qui rendrait
  // toute reception d'avril anterieure a sa propre signature.
  await db
    .update(quote)
    .set({
      signedAt: new Date('2026-03-02T00:00:00Z'),
      completedAt: new Date('2026-04-20T00:00:00Z'),
    })
    .where(eq(quote.id, row.id))

  return { me, quoteId: row.id }
}

const NOW = new Date('2026-05-01T00:00:00Z')

describe('declarer la reception', () => {
  it('enregistre la date et ouvre les garanties', async () => {
    const { me, quoteId } = await completedChantier()

    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      now: NOW,
    })

    const file = await chantierFileFor(me.id, quoteId)
    expect(file!.deadlines).toHaveLength(3)
    expect(file!.deadlines!.at(-1)!.endsAt.getUTCFullYear()).toBe(2036)
  })

  it('refuse tant que le chantier n est pas termine', async () => {
    const { me, quoteId } = await completedChantier()
    await db.update(quote).set({ completedAt: null }).where(eq(quote.id, quoteId))

    await expect(
      declareReception({ requesterId: me.id, quoteId, declaredAt: NOW, now: NOW }),
    ).rejects.toThrow(/terminé/)
  })

  it('refuse une date anterieure a la signature', async () => {
    const { me, quoteId } = await completedChantier()

    await expect(
      declareReception({
        requesterId: me.id,
        quoteId,
        declaredAt: new Date('2020-01-01T00:00:00Z'),
        now: NOW,
      }),
    ).rejects.toThrow(/antérieure à la signature/)
  })

  it('refuse une date a venir', async () => {
    const { me, quoteId } = await completedChantier()

    await expect(
      declareReception({
        requesterId: me.id,
        quoteId,
        declaredAt: new Date('2026-06-01T00:00:00Z'),
        now: NOW,
      }),
    ).rejects.toThrow(/à venir/)
  })

  it('REFUSE la declaration d un autre que le signataire', async () => {
    // La reception appartient au maitre d'ouvrage : personne d'autre ne peut
    // faire courir ses delais de garantie.
    const { quoteId } = await completedChantier()
    const intruder = await someone()

    await expect(
      declareReception({
        requesterId: intruder.id,
        quoteId,
        declaredAt: new Date('2026-04-21T00:00:00Z'),
        now: NOW,
      }),
    ).rejects.toThrow(/introuvable/)
  })

  it('se corrige, et chaque correction passe au journal', async () => {
    // Une date erronee lui couterait un delai de forclusion, et il est le seul
    // a savoir. La corriger est son droit ; la tracer est notre devoir.
    const { me, quoteId } = await completedChantier()

    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      now: NOW,
    })
    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-22T00:00:00Z'),
      now: NOW,
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, quoteId))
    expect(row.receivedAt!.toISOString().slice(0, 10)).toBe('2026-04-22')

    const journal = await db.select().from(event).where(eq(event.subjectId, quoteId))
    expect(journal.filter((e) => e.type === 'chantier.received')).toHaveLength(2)
  })

  it('n ecrit AUCUNE donnee personnelle au journal', async () => {
    const { me, quoteId } = await completedChantier()
    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      now: NOW,
    })

    const journal = await db.select().from(event).where(eq(event.subjectId, quoteId))
    expect(JSON.stringify(journal)).not.toContain(me.email)
  })
})
