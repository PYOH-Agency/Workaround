import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import {
  certificateActivity,
  company,
  companyActivity,
  event,
  insuranceCertificate,
} from '@/db/schema'
import { passportUrl, recordPassportView } from '@/services/passport'

// SIREN genere : le pre-push ne reinitialise pas la base, et un SIRET code en
// dur entre en collision des le deuxieme lancement.
const SIREN = String(500000000 + Math.floor(Math.random() * 99999999))
const SIRET = `${SIREN}00011`
const COMPANY = randomUUID()
const NOW = new Date('2026-08-08')

const SUBJECT = { id: COMPANY, legalName: 'PLOMBERIE DU TEST', siret: SIRET }
const SLUG = `plomberie-du-test-${SIREN}`

beforeAll(async () => {
  process.env.APP_URL = 'https://dequerre.test'

  await db.insert(company).values({
    id: COMPANY,
    siret: SIRET,
    legalName: 'PLOMBERIE DU TEST',
    city: 'Bordeaux',
  })

  await db.insert(companyActivity).values({ companyId: COMPANY, activityCode: '30' })
})

afterAll(async () => {
  await connection.end()
})

/** Rattache une attestation validee a l'activite, comme le ferait un relecteur. */
async function certify() {
  const [certificate] = await db
    .insert(insuranceCertificate)
    .values({
      companyId: COMPANY,
      kind: 'decennale',
      storagePath: `${COMPANY}/${randomUUID()}.pdf`,
      status: 'validated',
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      reviewedAt: new Date('2026-02-14'),
    })
    .returning()

  await db.insert(certificateActivity).values({
    certificateId: certificate.id,
    activityCode: '30',
    sourceLabel: 'Plomberie - installations sanitaires',
    confirmedBy: randomUUID(),
  })
}

/** Les consultations enregistrees pour l'entreprise, la derniere d'abord. */
async function views() {
  return db
    .select({ payload: event.payload })
    .from(event)
    .where(and(eq(event.companyId, COMPANY), eq(event.type, 'passport.viewed')))
}

describe('adresse du passeport', () => {
  it("n'existe pas tant qu'aucune activite n'est couverte", async () => {
    // Poser sur un devis un lien qui repond 404 serait pire que pas de lien,
    // et precisement au moment ou le client juge le serieux de l'entreprise.
    expect(await passportUrl(SUBJECT, NOW)).toBeNull()
  }, 30_000)

  it('est nue par defaut, tracee quand le canal est connu', async () => {
    await certify()

    // Le PDF porte l'adresse nue : personne ne recopie une chaine de requete
    // depuis un document imprime.
    expect(await passportUrl(SUBJECT, NOW)).toBe(`https://dequerre.test/p/${SLUG}`)

    expect(await passportUrl(SUBJECT, NOW, 'courriel')).toBe(
      `https://dequerre.test/p/${SLUG}?via=courriel`,
    )
  }, 30_000)
})

describe('consultation du passeport', () => {
  it('mene a l’adresse canonique et compte le passage', async () => {
    expect(await recordPassportView(SLUG, 'courriel')).toBe(`/artisan/${SLUG}`)
    expect(await views()).toEqual([{ payload: { via: 'courriel' } }])
  }, 30_000)

  it('ne recopie jamais dans le journal ce qui vient de la requete', async () => {
    // Le canal arrive de l'exterieur et le journal n'accepte ni modification ni
    // suppression : tout ce qui n'est pas reconnu devient « direct ». C'est la
    // lecon de M1, ou une adresse en clair avait rendu l'effacement impossible.
    await recordPassportView(SLUG, 'paul.martin@exemple.fr')

    const stored = await views()
    expect(stored).toHaveLength(2)
    expect(stored.map((v) => v.payload)).toContainEqual({ via: 'direct' })
    expect(JSON.stringify(stored)).not.toContain('paul.martin')
  }, 30_000)

  it("ne compte rien pour une entreprise qui n'existe pas", async () => {
    expect(await recordPassportView('entreprise-inconnue-999999999', null)).toBeNull()
    expect(await views()).toHaveLength(2)
  }, 30_000)
})
