import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { certificateActivity, company, companyActivity, insuranceCertificate } from '@/db/schema'
import { searchDirectory } from '@/services/directory'

const PLUMBER = randomUUID()
const NOW = new Date()

/** Une entreprise declarant deux activites, mais n'en couvrant qu'une. */
beforeAll(async () => {
  await db.insert(company).values({
    id: PLUMBER,
    siret: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
    legalName: 'PLOMBERIE ANNUAIRE',
    postalCode: '33000',
    city: 'Bordeaux',
    email: 'contact@annuaire.test',
  })

  await db.insert(companyActivity).values([
    { companyId: PLUMBER, activityCode: '30' },
    { companyId: PLUMBER, activityCode: '34' },
  ])

  const [certificate] = await db
    .insert(insuranceCertificate)
    .values({
      companyId: PLUMBER,
      kind: 'decennale',
      storagePath: `${PLUMBER}/a.pdf`,
      status: 'validated',
      insurerName: 'SMABTP',
      validFrom: new Date(Date.now() - 86_400_000),
      validUntil: new Date(Date.now() + 300 * 86_400_000),
    })
    .returning()

  // Seule la plomberie est couverte.
  await db.insert(certificateActivity).values({
    certificateId: certificate.id,
    activityCode: '30',
    sourceLabel: 'Plomberie - installations sanitaires',
    confirmedBy: randomUUID(),
  })
})

afterAll(async () => {
  await connection.end()
})

describe('recherche dans l annuaire', () => {
  it('trouve l entreprise sur l activite couverte', async () => {
    const found = await searchDirectory({ activityCode: '30', zone: '33000' }, NOW)
    expect(found.map((r) => r.companyId)).toContain(PLUMBER)
  })

  it("ne la trouve PAS sur une activite declaree mais non couverte", async () => {
    // LA regle du jalon. Sans elle, l'annuaire dirait « assure » la ou M3 dit
    // « assure pour ca », et la promesse s'effondrerait au premier sinistre.
    const found = await searchDirectory({ activityCode: '34', zone: '33000' }, NOW)
    expect(found.map((r) => r.companyId)).not.toContain(PLUMBER)
  })

  it('ne la trouve plus quand l attestation a expire', async () => {
    const later = new Date(Date.now() + 400 * 86_400_000)
    const found = await searchDirectory({ activityCode: '30', zone: '33000' }, later)
    expect(found.map((r) => r.companyId)).not.toContain(PLUMBER)
  })

  it('accepte une commune comme zone', async () => {
    const found = await searchDirectory({ activityCode: '30', zone: 'Bordeaux' }, NOW)
    expect(found.map((r) => r.companyId)).toContain(PLUMBER)
  })

  it('renvoie une liste vide sur une zone vide plutot que tout l annuaire', async () => {
    expect(await searchDirectory({ activityCode: '30', zone: '  ' }, NOW)).toEqual([])
  })
})
