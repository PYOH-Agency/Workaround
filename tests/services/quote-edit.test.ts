import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq, asc } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { quote, quoteLine } from '@/db/schema'
import { updateDraftQuote } from '@/services/quote-edit'
import { createCompany, createProject } from './invoice-fixtures'

let COMPANY: string
let PROJECT: string

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

async function draft(status: 'draft' | 'sent' | 'signed' = 'draft') {
  const [row] = await db
    .insert(quote)
    .values({
      projectId: PROJECT,
      companyId: COMPANY,
      number: `D2026-E${randomUUID().slice(0, 6)}`,
      status,
      committedLeadTimeDays: 5, retentionRate: 0,
      totalExclTax: 85000,
      totalTax: 8500,
      totalInclTax: 93500,
      publicToken: randomUUID(),
    })
    .returning()

  await db.insert(quoteLine).values({
    quoteId: row.id,
    position: 0,
    label: 'Chauffe-eau posé',
    quantity: '1',
    unitPriceExclTax: 85000,
    taxRate: 1000,
  })

  return row
}

const lines = [
  { label: 'Chauffe-eau posé', unit: 'u', quantity: '1', unitPriceExclTax: 85000, taxRate: 1000 },
  { label: 'Vase d’expansion', unit: 'u', quantity: '2', unitPriceExclTax: 6000, taxRate: 2000 },
]

describe('modification d un brouillon', () => {
  it('remplace les lignes et recalcule les totaux', async () => {
    const source = await draft()
    const updated = await updateDraftQuote(COMPANY, source.id, {
      lines,
      committedLeadTimeDays: 8, retentionRate: 0,
    })

    // 850,00 a 10 % et 2 x 60,00 a 20 % : 970,00 HT, 109,00 de TVA, 1 079,00 TTC.
    expect(updated.totalExclTax).toBe(97000)
    expect(updated.totalInclTax).toBe(107900)
    expect(updated.committedLeadTimeDays).toBe(8)

    const rows = await db
      .select()
      .from(quoteLine)
      .where(eq(quoteLine.quoteId, source.id))
      .orderBy(asc(quoteLine.position))

    expect(rows).toHaveLength(2)
    expect(rows[1].label).toBe('Vase d’expansion')
  })

  it('refuse de modifier un devis envoye', async () => {
    // Le client l'a recu : le modifier dans son dos rendrait le document qu'il
    // detient different de celui qu'on lui opposerait.
    const sent = await draft('sent')
    await expect(updateDraftQuote(COMPANY, sent.id, { lines, committedLeadTimeDays: 5, retentionRate: 0 })).rejects.toThrow(
      'brouillon',
    )
  })

  it('refuse de modifier un devis signe', async () => {
    // C'est exactement ce que l'avenant existe pour eviter.
    const signed = await draft('signed')
    await expect(
      updateDraftQuote(COMPANY, signed.id, { lines, committedLeadTimeDays: 5, retentionRate: 0 }),
    ).rejects.toThrow('brouillon')
  })

  it('refuse un devis d une autre entreprise', async () => {
    const other = await createCompany()
    const source = await draft()

    await expect(
      updateDraftQuote(other, source.id, { lines, committedLeadTimeDays: 5, retentionRate: 0 }),
    ).rejects.toThrow('introuvable')
  })

  it('refuse un devis sans aucune ligne', async () => {
    const source = await draft()
    await expect(
      updateDraftQuote(COMPANY, source.id, { lines: [], committedLeadTimeDays: 5, retentionRate: 0 }),
    ).rejects.toThrow('une ligne')
  })
})
