import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event } from '@/db/schema'
import { recordEvent } from '@/services/events'

/**
 * Ces tests n'effacent rien.
 *
 * Desactiver le declencheur d'immuabilite pour nettoyer reviendrait a percer,
 * pour la commodite d'un test, la garantie qu'on vient d'etablir. On isole par
 * identifiant unique a la place, et `pnpm test` remet la base a zero avant la
 * suite.
 */
afterAll(async () => {
  await connection.end()
})

describe('recordEvent', () => {
  it('ecrit un evenement horodate', async () => {
    const subjectId = randomUUID()

    await recordEvent({
      type: 'quote.sent',
      subjectType: 'quote',
      subjectId,
      actorType: 'company',
      payload: { totalInclTax: 120000 },
    })

    const rows = await db.select().from(event).where(eq(event.subjectId, subjectId))

    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('quote.sent')
    expect(rows[0].payload).toEqual({ totalInclTax: 120000 })
    expect(rows[0].occurredAt).toBeInstanceOf(Date)
  })

  it('accepte un evenement minimal, sans entreprise ni acteur', async () => {
    const subjectId = randomUUID()

    await recordEvent({
      type: 'system.started',
      subjectType: 'system',
      subjectId,
      actorType: 'system',
    })

    const [row] = await db.select().from(event).where(eq(event.subjectId, subjectId))

    expect(row.companyId).toBeNull()
    expect(row.actorId).toBeNull()
    expect(row.payload).toEqual({})
  })

  it("refuse toute suppression, meme via la connexion de l'application", async () => {
    const subjectId = randomUUID()

    await recordEvent({
      type: 'quote.created',
      subjectType: 'quote',
      subjectId,
      actorType: 'company',
    })

    // Drizzle enveloppe l'erreur SQL : on assere sur la cause, sinon le test
    // passerait au vert pour n'importe quel echec de requete.
    const error = await db
      .delete(event)
      .where(eq(event.subjectId, subjectId))
      .then(() => null)
      .catch((e: Error) => e)

    expect(error).toBeInstanceOf(Error)
    expect(String((error as Error).cause)).toContain('append-only')

    const remaining = await db.select().from(event).where(eq(event.subjectId, subjectId))
    expect(remaining).toHaveLength(1)
  })
})
