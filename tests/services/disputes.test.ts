import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event, metricDispute, quote } from '@/db/schema'
import { arbitrate, disputesInReview, loadDisputeByToken, openDispute } from '@/services/disputes'
import { lateChantier } from './dispute-fixtures'

afterAll(async () => {
  await connection.end()
})

describe('ouvrir une contestation', () => {
  it('cree la contestation, sans verdict', async () => {
    const { companyId, quoteId } = await lateChantier()

    const created = await openDispute(companyId, quoteId, 'Client absent.', new Date())

    expect(created.publicToken).toMatch(/^[A-Za-z0-9_-]{20,}$/)
    expect(created.verdict).toBeNull()
  })

  it('refuse une seconde contestation sur le meme chantier', async () => {
    const { companyId, quoteId } = await lateChantier()
    await openDispute(companyId, quoteId, 'Client absent.', new Date())

    await expect(openDispute(companyId, quoteId, 'Encore.', new Date())).rejects.toThrow(/déjà/)
  })

  it('refuse un chantier livre dans les temps', async () => {
    const { companyId, quoteId } = await lateChantier()
    // Le meme chantier, mais fini le lendemain de la signature.
    const [row] = await db.select().from(quote).where(eq(quote.id, quoteId))
    await db
      .update(quote)
      .set({ completedAt: new Date(row.signedAt!.getTime() + 86_400_000) })
      .where(eq(quote.id, quoteId))

    await expect(openDispute(companyId, quoteId, 'Motif.', new Date())).rejects.toThrow(
      /dans le délai/,
    )
  })

  it('refuse le chantier d une autre entreprise', async () => {
    const { quoteId } = await lateChantier()
    const other = await lateChantier()

    await expect(openDispute(other.companyId, quoteId, 'Motif.', new Date())).rejects.toThrow(
      /introuvable/,
    )
  })

  it('n ecrit AUCUNE donnee personnelle au journal', async () => {
    // La lecon de M1 : un e-mail en clair dans le journal immuable rendait le
    // droit a l'effacement structurellement impossible.
    const { companyId, quoteId, customerEmail, customerName } = await lateChantier()
    await openDispute(companyId, quoteId, 'Client absent.', new Date())

    const rows = await db.select().from(event).where(eq(event.subjectId, quoteId))
    const dumped = JSON.stringify(rows)

    expect(rows.some((e) => e.type === 'metric.disputed')).toBe(true)
    expect(dumped).not.toContain(customerEmail)
    expect(dumped).not.toContain(customerName)
  })
})

describe('arbitrer', () => {
  it('inscrit le verdict et l evenement rectificatif', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(companyId, quoteId, 'Client absent.', new Date())

    await arbitrate(created.publicToken, 'upheld', new Date())

    const [row] = await db.select().from(metricDispute).where(eq(metricDispute.id, created.id))
    expect(row.verdict).toBe('upheld')
    expect(row.answeredAt).not.toBeNull()

    const rows = await db.select().from(event).where(eq(event.subjectId, quoteId))
    expect(rows.some((e) => e.type === 'metric.arbitrated')).toBe(true)
  })

  it('refuse un second arbitrage', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(companyId, quoteId, 'Client absent.', new Date())
    await arbitrate(created.publicToken, 'upheld', new Date())

    await expect(arbitrate(created.publicToken, 'rejected', new Date())).rejects.toThrow()
  })

  it('refuse un jeton inconnu', async () => {
    await expect(arbitrate('inexistant', 'upheld', new Date())).rejects.toThrow(/introuvable/)
  })
})

describe('la vue du client', () => {
  it('montre le chantier et le motif, jamais les metriques de l entreprise', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(
      companyId,
      quoteId,
      'Client absent trois semaines.',
      new Date(),
    )

    const view = await loadDisputeByToken(created.publicToken, new Date())

    expect(view?.reason).toBe('Client absent trois semaines.')
    expect(view?.committedLeadTimeDays).toBe(5)
    expect(view?.businessDaysUsed).toBeGreaterThan(5)
    expect(view?.standing).toBe('under_review')
    // Une seule question lui est posee : lui montrer les taux de l'entreprise
    // orienterait sa reponse.
    expect(Object.keys(view!)).not.toContain('leadTimeRespect')
  })

  it('rend null sur un jeton inconnu', async () => {
    expect(await loadDisputeByToken('inexistant', new Date())).toBeNull()
  })

  it('se referme d elle-meme passe le delai', async () => {
    const { companyId, quoteId } = await lateChantier()
    const created = await openDispute(companyId, quoteId, 'Motif.', new Date())

    const inFifteenDays = new Date(Date.now() + 15 * 86_400_000)
    const view = await loadDisputeByToken(created.publicToken, inFifteenDays)

    expect(view?.standing).toBe('settled')
  })
})

describe('les contestations en instruction', () => {
  it('ne liste que celles dont le delai court encore', async () => {
    const { companyId, quoteId } = await lateChantier()
    await openDispute(companyId, quoteId, 'Motif.', new Date())

    expect(await disputesInReview(companyId, new Date())).toHaveLength(1)

    // Quinze jours plus tard, sans qu'aucune tache n'ait tourne.
    const later = new Date(Date.now() + 15 * 86_400_000)
    expect(await disputesInReview(companyId, later)).toHaveLength(0)
  })
})
