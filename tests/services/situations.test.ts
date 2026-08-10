import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { invoice, quoteLine, situation, situationLine } from '@/db/schema'
import { issueSituation, previousProgress } from '@/services/situations'
import { switchPlan } from '@/services/plan'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

/** Une entreprise Pro, un devis signe a deux taux : 910,00 HT / 1 007,00 TTC. */
async function chantier() {
  const companyId = await createCompany()
  await switchPlan({ companyId, plan: 'pro', by: randomUUID() })
  const projectId = await createProject(companyId)
  const row = await signedQuote(companyId, projectId, 'signed')

  const lines = await db.select().from(quoteLine).where(eq(quoteLine.quoteId, row.id))
  return { companyId, quoteId: row.id, lines: [...lines].sort((a, b) => a.position - b.position) }
}

const at = (lines: { id: string }[], ...percents: number[]) =>
  lines.map((line, i) => ({ quoteLineId: line.id, percent: percents[i] }))

describe('etablir une situation', () => {
  it('REFUSE une entreprise gratuite, au niveau du service', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const row = await signedQuote(companyId, projectId, 'signed')
    const lines = await db.select().from(quoteLine).where(eq(quoteLine.quoteId, row.id))

    await expect(
      issueSituation({ companyId, quoteId: row.id, progress: at(lines, 50, 50) }),
    ).rejects.toThrow(/Pro/)
  })

  it('facture le cumul declare', async () => {
    // 50 % de 910,00 HT = 455,00 HT, soit 503,50 TTC.
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) })

    const [row] = await db.select().from(invoice).where(eq(invoice.quoteId, quoteId))
    expect(row.type).toBe('progress')
    expect(row.totalInclTax).toBe(50_350)
  })

  it('ne facture que la DIFFERENCE avec la precedente', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 80, 80) })

    const rows = await db.select().from(invoice).where(eq(invoice.quoteId, quoteId))
    const totals = rows.map((row) => row.totalInclTax).sort((a, b) => a - b)

    expect(totals).toEqual([30_210, 50_350])
  })

  it('solde le chantier AU CENTIME a cent pour cent', async () => {
    // La propriete qui fait tenir la metrique « ecart devis vers facture ».
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 33, 66) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 100, 100) })

    const rows = await db.select().from(invoice).where(eq(invoice.quoteId, quoteId))
    const invoiced = rows.reduce((sum, row) => sum + row.totalInclTax, 0)

    expect(invoiced).toBe(100_700)
  })

  it('REFUSE une situation qui ne facture rien de plus', async () => {
    const { companyId, quoteId, lines } = await chantier()
    await issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) })

    await expect(
      issueSituation({ companyId, quoteId, progress: at(lines, 50, 50) }),
    ).rejects.toThrow(/rien de plus/)
  })

  it('refuse un avancement au-dela de cent pour cent', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await expect(
      issueSituation({ companyId, quoteId, progress: at(lines, 120, 0) }),
    ).rejects.toThrow(/entre 0 et 100/)
  })

  it('numerote les situations dans l ordre', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 30, 30) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 60, 60) })

    const rows = await db.select().from(situation).where(eq(situation.quoteId, quoteId))
    expect(rows.map((row) => row.number).sort()).toEqual([1, 2])
  })

  it('garde la DECLARATION, pas le montant', async () => {
    // Aucun euro dans `situation` : ils se recalculent.
    const { companyId, quoteId, lines } = await chantier()
    await issueSituation({ companyId, quoteId, progress: at(lines, 40, 70) })

    const [row] = await db.select().from(situation).where(eq(situation.quoteId, quoteId))
    const declared = await db
      .select()
      .from(situationLine)
      .where(eq(situationLine.situationId, row.id))

    expect(declared.map((line) => line.progressPercent).sort((a, b) => a - b)).toEqual([40, 70])
  })

  it('ne voit PAS le chantier d une autre entreprise', async () => {
    const mine = await chantier()
    const rival = await chantier()

    await expect(
      issueSituation({
        companyId: mine.companyId,
        quoteId: rival.quoteId,
        progress: at(rival.lines, 50, 50),
      }),
    ).rejects.toThrow(/introuvable/)
  })
})

describe('le report des pourcentages', () => {
  it('rend zero sur un chantier neuf', async () => {
    const { quoteId, lines } = await chantier()

    expect(await previousProgress(quoteId)).toEqual({})
    expect(lines.length).toBeGreaterThan(0)
  })

  it('rend les pourcentages de la DERNIERE situation', async () => {
    const { companyId, quoteId, lines } = await chantier()

    await issueSituation({ companyId, quoteId, progress: at(lines, 30, 30) })
    await issueSituation({ companyId, quoteId, progress: at(lines, 60, 45) })

    expect(await previousProgress(quoteId)).toEqual({
      [lines[0].id]: 60,
      [lines[1].id]: 45,
    })
  })
})
