import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { chantierPost } from '@/db/schema'
import { lateChantier } from './dispute-fixtures'

/**
 * La verification porte sur des LIGNES REELLES : un `UPDATE` sur une table vide
 * ne declenche rien et passe toujours. C'est le piege qui avait rendu vacante
 * la premiere verification d'immuabilite de la facture, en M2.
 */
let postId: string

beforeAll(async () => {
  const { companyId, quoteId } = await lateChantier()
  const [row] = await db
    .insert(chantierPost)
    .values({ quoteId, companyId, body: 'Dépose terminée.' })
    .returning()
  postId = row.id
})

afterAll(async () => {
  await connection.end()
})

/** Le message de PostgreSQL, pas l'enveloppe « Failed query » de Drizzle. */
async function refusalReason(work: Promise<unknown>): Promise<string> {
  try {
    await work
  } catch (e) {
    return (e as { cause?: Error }).cause?.message ?? (e as Error).message
  }

  throw new Error('Cette opération aurait dû être refusée')
}

describe('une publication est definitive', () => {
  it('refuse la modification', async () => {
    const reason = await refusalReason(
      db.update(chantierPost).set({ body: 'Autre chose.' }).where(eq(chantierPost.id, postId)),
    )

    expect(reason).toMatch(/definitive/)
  })

  it('refuse la suppression', async () => {
    const reason = await refusalReason(
      db.delete(chantierPost).where(eq(chantierPost.id, postId)),
    )

    expect(reason).toMatch(/definitive/)
  })
})
