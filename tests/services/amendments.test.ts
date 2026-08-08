import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, customer, project, property, quote, quoteLine } from '@/db/schema'
import { createAmendment, quoteVersions, rootQuoteId } from '@/services/amendments'

const COMPANY = randomUUID()
let PROJECT: string

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'AVENANT TEST',
  })

  const [c] = await db
    .insert(customer)
    .values({ companyId: COMPANY, name: 'Client', email: 'c@test.local' })
    .returning()
  const [p] = await db
    .insert(property)
    .values({ fingerprint: randomUUID(), addressLine1: '1 rue', postalCode: '33000', city: 'Bordeaux' })
    .returning()
  const [pr] = await db
    .insert(project)
    .values({ companyId: COMPANY, customerId: c.id, propertyId: p.id, label: 'Chantier' })
    .returning()

  PROJECT = pr.id
})

afterAll(async () => {
  await connection.end()
})

/** Un devis signe, a deux lignes. */
async function signedQuote(number: string) {
  const [row] = await db
    .insert(quote)
    .values({
      projectId: PROJECT,
      companyId: COMPANY,
      number,
      status: 'signed',
      committedLeadTimeDays: 5,
      totalExclTax: 91000,
      totalTax: 9700,
      totalInclTax: 100700,
      publicToken: randomUUID(),
      sentAt: new Date(),
      signedAt: new Date(),
    })
    .returning()

  await db.insert(quoteLine).values([
    { quoteId: row.id, position: 0, label: 'Chauffe-eau posé', quantity: '1', unitPriceExclTax: 85000, taxRate: 1000 },
    { quoteId: row.id, position: 1, label: 'Déplacement', quantity: '1', unitPriceExclTax: 6000, taxRate: 2000 },
  ])

  return row
}

describe('creation d un avenant', () => {
  it('cree une version 2 qui reprend les lignes', async () => {
    const source = await signedQuote(`D2026-A${randomUUID().slice(0, 4)}`)
    const amendment = await createAmendment(COMPANY, source.id)

    expect(amendment.version).toBe(2)
    expect(amendment.number).toBe(source.number)
    expect(amendment.status).toBe('draft')
    expect(amendment.supersedesQuoteId).toBe(source.id)

    const lines = await db.select().from(quoteLine).where(eq(quoteLine.quoteId, amendment.id))
    expect(lines).toHaveLength(2)
  })

  it('conserve le devis d origine intact', async () => {
    const source = await signedQuote(`D2026-B${randomUUID().slice(0, 4)}`)
    await createAmendment(COMPANY, source.id)

    const [original] = await db.select().from(quote).where(eq(quote.id, source.id))
    expect(original.status).toBe('signed')
    expect(original.totalInclTax).toBe(100700)
  })

  it('refuse un second avenant tant que le premier n est pas signe', async () => {
    const source = await signedQuote(`D2026-C${randomUUID().slice(0, 4)}`)
    await createAmendment(COMPANY, source.id)

    await expect(createAmendment(COMPANY, source.id)).rejects.toThrow('en cours')
  })

  it('refuse sur un devis non signe', async () => {
    const [draft] = await db
      .insert(quote)
      .values({
        projectId: PROJECT,
        companyId: COMPANY,
        number: `D2026-D${randomUUID().slice(0, 4)}`,
        status: 'draft',
        totalInclTax: 1000,
        publicToken: randomUUID(),
      })
      .returning()

    await expect(createAmendment(COMPANY, draft.id)).rejects.toThrow('signé')
  })

  it('remonte a la racine depuis n importe quelle version', async () => {
    const source = await signedQuote(`D2026-E${randomUUID().slice(0, 4)}`)
    const amendment = await createAmendment(COMPANY, source.id)

    // Les factures s'attachent a la racine : M2 n'a pas a connaitre les versions.
    expect(await rootQuoteId(amendment.id)).toBe(source.id)
    expect(await rootQuoteId(source.id)).toBe(source.id)
  })

  it('liste les versions du plus ancien au plus recent', async () => {
    const source = await signedQuote(`D2026-F${randomUUID().slice(0, 4)}`)
    await createAmendment(COMPANY, source.id)

    const versions = await quoteVersions(source.id)
    expect(versions.map((v) => v.version)).toEqual([1, 2])
  })
})
