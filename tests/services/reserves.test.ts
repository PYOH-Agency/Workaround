import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event, quote } from '@/db/schema'
import { declareReception, liftReserves } from '@/services/reception'
import { completedChantier, someone, NOW } from './reception-fixtures'

afterAll(async () => {
  await connection.end()
})

describe('lever les reserves', () => {
  /** Un chantier reçu avec des réserves, prêt à être levé. */
  async function receivedWithReserves() {
    const { me, quoteId } = await completedChantier()
    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      reserves: 'Carrelage à reprendre',
      now: NOW,
    })
    return { me, quoteId }
  }

  it('enregistre la levee et la journalise', async () => {
    const { me, quoteId } = await receivedWithReserves()

    await liftReserves({
      requesterId: me.id,
      quoteId,
      liftedAt: new Date('2026-04-28T00:00:00Z'),
      now: NOW,
    })

    const [row] = await db.select().from(quote).where(eq(quote.id, quoteId))
    expect(row.reservesLiftedAt!.toISOString().slice(0, 10)).toBe('2026-04-28')

    const journal = await db.select().from(event).where(eq(event.subjectId, quoteId))
    expect(journal.filter((e) => e.type === 'chantier.reserves_lifted')).toHaveLength(1)
  })

  it('REFUSE une levee sans reserve emise', async () => {
    const { me, quoteId } = await completedChantier()
    await declareReception({
      requesterId: me.id,
      quoteId,
      declaredAt: new Date('2026-04-21T00:00:00Z'),
      reserves: null,
      now: NOW,
    })

    await expect(
      liftReserves({ requesterId: me.id, quoteId, liftedAt: NOW, now: NOW }),
    ).rejects.toThrow(/Aucune réserve/)
  })

  it('REFUSE une levee anterieure a la reception', async () => {
    const { me, quoteId } = await receivedWithReserves()

    await expect(
      liftReserves({
        requesterId: me.id,
        quoteId,
        liftedAt: new Date('2026-04-01T00:00:00Z'),
        now: NOW,
      }),
    ).rejects.toThrow(/antérieure à la réception/)
  })

  it('REFUSE une seconde levee', async () => {
    const { me, quoteId } = await receivedWithReserves()
    await liftReserves({
      requesterId: me.id,
      quoteId,
      liftedAt: new Date('2026-04-28T00:00:00Z'),
      now: NOW,
    })

    await expect(
      liftReserves({
        requesterId: me.id,
        quoteId,
        liftedAt: new Date('2026-04-29T00:00:00Z'),
        now: NOW,
      }),
    ).rejects.toThrow(/déjà levées/)
  })

  it('REFUSE la levee par un autre que le signataire', async () => {
    const { quoteId } = await receivedWithReserves()
    const intruder = await someone()

    await expect(
      liftReserves({
        requesterId: intruder.id,
        quoteId,
        liftedAt: new Date('2026-04-28T00:00:00Z'),
        now: NOW,
      }),
    ).rejects.toThrow(/introuvable/)
  })
})
