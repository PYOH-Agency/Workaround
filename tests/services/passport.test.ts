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
import { passportLink, recordPassportView, trackedPassport } from '@/services/passport'

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
    expect(await passportLink(SUBJECT, NOW)).toBeNull()
  }, 30_000)

  it('porte l’adresse nue et les activites reellement couvertes', async () => {
    await certify()

    // L'entreprise a declare l'electricite ; elle n'est couverte par aucune
    // attestation, donc le sceau ne la nomme pas. C'est la meme regle que sur
    // le passeport : ce qui s'affiche est ce qui est couvert, jamais ce qui est
    // declare.
    expect(await passportLink(SUBJECT, NOW)).toEqual({
      url: `https://dequerre.test/p/${SLUG}`,
      activities: ['Plomberie'],
    })
  }, 30_000)

  it('ne porte le canal que la ou on le lui demande', () => {
    const url = `https://dequerre.test/p/${SLUG}`
    expect(trackedPassport(url, 'devis')).toBe(`${url}?via=devis`)
  })
})

describe('consultation du passeport', () => {
  it('mene a l’adresse canonique et distingue les canaux', async () => {
    expect(await recordPassportView(SLUG, 'courriel')).toBe(`/artisan/${SLUG}`)
    await recordPassportView(SLUG, 'devis')
    // Sans adresse nue, le PDF serait indistinguable d'une saisie directe.
    await recordPassportView(SLUG, null)

    expect((await views()).map((v) => v.payload)).toEqual(
      expect.arrayContaining([{ via: 'courriel' }, { via: 'devis' }, { via: 'direct' }]),
    )
  }, 30_000)

  it('ne recopie jamais dans le journal ce qui vient de la requete', async () => {
    // Le canal arrive de l'exterieur et le journal n'accepte ni modification ni
    // suppression : tout ce qui n'est pas reconnu devient « direct ». C'est la
    // lecon de M1, ou une adresse en clair avait rendu l'effacement impossible.
    await recordPassportView(SLUG, 'paul.martin@exemple.fr')

    const stored = await views()
    expect(stored).toHaveLength(4)
    expect(JSON.stringify(stored)).not.toContain('paul.martin')
  }, 30_000)

  it("ne compte rien pour une entreprise qui n'existe pas", async () => {
    expect(await recordPassportView('entreprise-inconnue-999999999', null)).toBeNull()
    expect(await views()).toHaveLength(4)
  }, 30_000)
})
