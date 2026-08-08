import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import {
  certificateActivity,
  company,
  companyActivity,
  insuranceCertificate,
} from '@/db/schema'
import { publicProfile } from '@/services/public-profile'

const SIREN = '507698299'
const SIRET = `${SIREN}00011`
const COMPANY = randomUUID()
const NOW = new Date('2026-08-08')

/** Rattache une attestation validee a une activite, comme le ferait un relecteur. */
async function certify(kind: 'decennale' | 'rc_pro', code: string, validUntil: Date) {
  const [certificate] = await db
    .insert(insuranceCertificate)
    .values({
      companyId: COMPANY,
      kind,
      storagePath: `${COMPANY}/${randomUUID()}.pdf`,
      status: 'validated',
      insurerName: 'SMABTP',
      policyNumber: 'D-2026-000123',
      validFrom: new Date('2026-01-01'),
      validUntil,
    })
    .returning()

  await db.insert(certificateActivity).values({
    certificateId: certificate.id,
    activityCode: code,
    sourceLabel: 'Plomberie - installations sanitaires',
    confirmedBy: randomUUID(),
  })
}

beforeAll(async () => {
  await db.insert(company).values({
    id: COMPANY,
    siret: SIRET,
    legalName: 'PLOMBERIE DU TEST',
    city: 'Bordeaux',
    insurerName: 'SMABTP',
    policyNumber: 'D-2026-000123',
  })

  // Deux activites declarees, une seule sera couverte.
  await db.insert(companyActivity).values([
    { companyId: COMPANY, activityCode: '30' },
    { companyId: COMPANY, activityCode: '34' },
  ])
})

afterAll(async () => {
  await connection.end()
})

describe('profil public', () => {
  it("n'existe pas tant qu'aucune activite n'est couverte", async () => {
    expect(await publicProfile(SIREN, NOW)).toBeNull()
  })

  it('ne publie que les activites couvertes', async () => {
    await certify('decennale', '30', new Date('2026-12-31'))

    const profile = await publicProfile(SIREN, NOW)

    // L'exclusion est portee par la requete, jamais par un filtre d'affichage :
    // l'electricite n'est pas marquee « masquee », elle est ABSENTE.
    expect(profile!.activities).toEqual([
      { code: '30', label: 'Plomberie — installations sanitaires', coveredBy: 'decennale' },
    ])
    expect(profile!.slug).toBe('plomberie-du-test-507698299')
    expect(profile!.insurer.name).toBe('SMABTP')
  }, 30_000)

  it('disparait entierement quand la derniere attestation expire', async () => {
    // Aucun travail de fond n'est passe : la visibilite se calcule a la lecture.
    expect(await publicProfile(SIREN, new Date('2027-01-01'))).toBeNull()
  }, 30_000)
})
