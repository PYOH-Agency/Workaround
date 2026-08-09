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

// SIREN genere : le pre-push ne reinitialise pas la base, et un SIRET code en
// dur entre en collision des le deuxieme lancement. Meme piege que sur les
// controles legaux.
const SIREN = String(500000000 + Math.floor(Math.random() * 99999999))
const SIRET = `${SIREN}00011`
const COMPANY = randomUUID()
const NOW = new Date('2026-08-08')

const REVIEWED_ON = new Date('2026-02-14')

/** Rattache une attestation validee a une activite, comme le ferait un relecteur. */
async function certify(
  kind: 'decennale' | 'rc_pro',
  code: string,
  validUntil: Date,
  validFrom = new Date('2026-01-01'),
) {
  const [certificate] = await db
    .insert(insuranceCertificate)
    .values({
      companyId: COMPANY,
      kind,
      storagePath: `${COMPANY}/${randomUUID()}.pdf`,
      status: 'validated',
      insurerName: 'SMABTP',
      policyNumber: 'D-2026-000123',
      validFrom,
      validUntil,
      reviewedAt: REVIEWED_ON,
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
      {
        code: '30',
        label: 'Plomberie — installations sanitaires',
        coveredBy: 'decennale',
        // L'affirmation est datee : nous connaissons l'echeance du document et
        // la date ou nous l'avons controle, pas l'etat du contrat.
        coveredUntil: new Date('2026-12-31'),
        checkedOn: REVIEWED_ON,
      },
    ])
    expect(profile!.slug).toBe(`plomberie-du-test-${SIREN}`)
    expect(profile!.insurer.name).toBe('SMABTP')
  }, 30_000)

  it('cite l’attestation en cours, jamais une attestation perimee', async () => {
    // Paysagiste : la RC Pro suffit. Une decennale perimee la nomme aussi.
    await db.insert(companyActivity).values({ companyId: COMPANY, activityCode: '4.1' })
    await certify('decennale', '4.1', new Date('2026-06-30'), new Date('2025-01-01'))
    await certify('rc_pro', '4.1', new Date('2026-12-31'))

    const profile = await publicProfile(SIREN, NOW)
    const paysagiste = profile!.activities.find((a) => a.code === '4.1')

    // Sans le filtre « en cours », la decennale primait par son rang et la page
    // aurait affiche « Garantie decennale » a cote d'une echeance de RC Pro :
    // le libelle aurait contredit la date imprimee juste a cote.
    expect(paysagiste).toMatchObject({
      coveredBy: 'rc_pro',
      coveredUntil: new Date('2026-12-31'),
    })
  }, 30_000)

  it('disparait entierement quand la derniere attestation expire', async () => {
    // Aucun travail de fond n'est passe : la visibilite se calcule a la lecture.
    expect(await publicProfile(SIREN, new Date('2027-01-01'))).toBeNull()
  }, 30_000)
})
