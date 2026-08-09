import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { metricDispute } from '@/db/schema'
import { lateChantier } from './dispute-fixtures'

/**
 * La verification porte sur des LIGNES REELLES.
 *
 * Un `UPDATE` sur une table vide ne declenche rien et passe toujours : c'est
 * exactement le piege qui avait rendu vacante la premiere verification
 * d'immuabilite de la facture, en M2.
 */
let disputeId: string

/**
 * Le message de PostgreSQL, pas celui de Drizzle.
 *
 * Drizzle enveloppe l'erreur dans un « Failed query: … » qui repeterait le SQL
 * envoye : s'y fier ferait passer le test quelle que soit la RAISON du refus —
 * une contrainte d'unicite, un droit manquant, n'importe quoi.
 */
async function refusalReason(work: Promise<unknown>): Promise<string> {
  try {
    await work
  } catch (e) {
    return (e as { cause?: Error }).cause?.message ?? (e as Error).message
  }

  throw new Error('Cette opération aurait dû être refusée')
}

beforeAll(async () => {
  const { companyId, quoteId } = await lateChantier()

  const [row] = await db
    .insert(metricDispute)
    .values({
      quoteId,
      companyId,
      reason: 'Le client était absent.',
      publicToken: `tok-${Math.random().toString(36).slice(2)}`,
      expiresAt: new Date(Date.now() + 14 * 86_400_000),
    })
    .returning()

  disputeId = row.id
})

afterAll(async () => {
  await connection.end()
})

describe('une contestation ne se repond qu une fois', () => {
  it('accepte le premier arbitrage', async () => {
    await db
      .update(metricDispute)
      .set({ verdict: 'upheld', answeredAt: new Date() })
      .where(eq(metricDispute.id, disputeId))

    const [row] = await db.select().from(metricDispute).where(eq(metricDispute.id, disputeId))
    expect(row.verdict).toBe('upheld')
  })

  it('refuse le second', async () => {
    const reason = await refusalReason(
      db.update(metricDispute).set({ verdict: 'rejected' }).where(eq(metricDispute.id, disputeId)),
    )

    expect(reason).toMatch(/deja ete arbitree/)
  })

  it('refuse la suppression', async () => {
    const reason = await refusalReason(db.delete(metricDispute).where(eq(metricDispute.id, disputeId)))

    expect(reason).toMatch(/ne se supprime pas/)
  })

  it('refuse de repousser l echeance', async () => {
    // Prolonger le delai reviendrait a etendre l'exclusion du chantier du
    // calcul : la contestation deviendrait le moyen de neutraliser un chiffre
    // indefiniment, ce que la regle des quatorze jours interdit.
    const { companyId, quoteId } = await lateChantier()
    const [fresh] = await db
      .insert(metricDispute)
      .values({
        quoteId,
        companyId,
        reason: 'Motif.',
        publicToken: `tok-${Math.random().toString(36).slice(2)}`,
        expiresAt: new Date(Date.now() + 14 * 86_400_000),
      })
      .returning()

    const reason = await refusalReason(
      db.execute(
        sql`UPDATE metric_dispute SET expires_at = now() + interval '90 days' WHERE id = ${fresh.id}`,
      ),
    )

    expect(reason).toMatch(/reponse du client/)
  })
})
