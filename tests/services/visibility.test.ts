import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { company, companyActivity } from '@/db/schema'
import { companyCoverage } from '@/services/visibility'

const COMPANY = randomUUID()

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'Entreprise de test',
  })
  await db.insert(companyActivity).values({ companyId: COMPANY, activityCode: '30' })
})

afterAll(async () => {
  await connection.end()
})

describe('couverture d une entreprise', () => {
  it('masque une activite declaree sans attestation validee', async () => {
    const coverage = await companyCoverage(COMPANY, new Date())

    expect(coverage.activities).toEqual([
      { code: '30', label: 'Plomberie — installations sanitaires', visible: false, reason: 'no_certificate' },
    ])
    expect(coverage.isPublic).toBe(false)
  })

  it('ne stocke aucun drapeau de visibilite en base', async () => {
    // La visibilite se calcule a la lecture. Un drapeau stocke deriverait de la
    // verite des le lendemain de l'expiration d'une attestation.
    const columns = await db.execute<{ column_name: string }>(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'company_activity'`,
    )
    expect(columns.map((c) => c.column_name)).not.toContain('visible')
  })
})
