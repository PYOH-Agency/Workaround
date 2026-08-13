import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event, quote } from '@/db/schema'
import { declareReception, liftReserves } from '@/services/reception'
import { chantierFileFor } from '@/services/chantier-file'
import { completedChantier, someone, NOW } from './reception-fixtures'

afterAll(async () => {
  await connection.end()
})

describe('declarer la reception', () => {
  it('enregistre la date et ouvre les garanties', async () => {
    const { me, quoteId } = await completedChantier()

    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      reserves: null,
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
      declareReception({ requesterId: me.id, quoteId, declaredAt: NOW, reserves: null, now: NOW }),
    ).rejects.toThrow(/terminé/)
  })

  it('refuse une date anterieure a la signature', async () => {
    const { me, quoteId } = await completedChantier()

    await expect(
      declareReception({
        requesterId: me.id,
        quoteId,
        declaredAt: new Date('2020-01-01T00:00:00Z'),
        reserves: null,
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
        reserves: null,
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
        reserves: null,
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
      reserves: null,
      now: NOW,
    })
    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-22T00:00:00Z'),
      reserves: null,
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
      reserves: null,
      now: NOW,
    })

    const journal = await db.select().from(event).where(eq(event.subjectId, quoteId))
    expect(JSON.stringify(journal)).not.toContain(me.email)
  })

  it('enregistre les reserves emises a la reception', async () => {
    const { me, quoteId } = await completedChantier()

    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      reserves: 'Joint du bac à douche à reprendre',
      now: NOW,
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, quoteId))
    expect(row.receptionReserves).toBe('Joint du bac à douche à reprendre')
    expect(row.reservesLiftedAt).toBeNull()
  })

  it('efface une levee heritee quand la reception repasse sans reserve', async () => {
    // Une reception corrigee en « sans reserve » n'a plus rien a lever.
    const { me, quoteId } = await completedChantier()

    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      reserves: 'Peinture à retoucher',
      now: NOW,
    })
    await liftReserves({
      requesterId: me.id,
      quoteId,
      liftedAt: new Date('2026-04-25T00:00:00Z'),
      now: NOW,
    })
    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      reserves: null,
      now: NOW,
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, quoteId))
    expect(row.receptionReserves).toBeNull()
    expect(row.reservesLiftedAt).toBeNull()
  })
})
