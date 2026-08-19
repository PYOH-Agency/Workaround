import { eq, inArray, or } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  attestationRequest,
  certificateActivity,
  company,
  companyActivity,
  insuranceCertificate,
} from '@/db/schema'

/**
 * Le decor de la passe quotidienne : quatre SIRET a la cle de Luhn juste,
 * propres a ce fichier. La base est partagee et vitest fait tourner les
 * fichiers en parallele — rien ici n'est efface au-dela de nos lignes.
 */
export const REGISTERED = '77712345600009'
export const DEPOSITED = '77712345700007'
export const COVERED = '77712345800005'
export const UNKNOWN = '77712345900003'
const OURS = [REGISTERED, DEPOSITED, COVERED, UNKNOWN]

export const COMPANIES = [1, 2, 3].map((n) => `4a1e0000-0000-4000-8000-00000000000${n}`)

export const DOMAIN = '@passe-test.fr'
export const CLAIRE = `claire${DOMAIN}`

// Un horodatage improbable : le nettoyage retrouve nos lignes par leur date
// meme anonymisees, quand ni le SIRET ni les adresses ne les designent plus.
export const NOW = new Date('2026-08-19T04:17:33.017Z')
export const OLD = new Date(NOW.getTime() - 31 * 86_400_000)
export const RECENT = new Date(NOW.getTime() - 86_400_000)

async function certify(companyId: string, status: 'pending' | 'validated') {
  const [certificate] = await db
    .insert(insuranceCertificate)
    .values({
      companyId,
      kind: 'decennale',
      storagePath: `${companyId}/attestation.pdf`,
      status,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
    })
    .returning({ id: insuranceCertificate.id })

  if (status !== 'validated') return
  await db.insert(certificateActivity).values({
    certificateId: certificate.id,
    activityCode: '30',
    sourceLabel: 'Plomberie - installations sanitaires',
    // `confirmedBy` porte notre marque : la liaison s'efface ensuite sans
    // avoir a relire les attestations.
    confirmedBy: COMPANIES[0],
  })
}

/** Efface nos lignes, puis repose le decor. Appele en `beforeEach`. */
export async function resetFixtures() {
  await db
    .delete(attestationRequest)
    .where(
      or(
        inArray(attestationRequest.siret, OURS),
        inArray(attestationRequest.companyId, COMPANIES),
        inArray(attestationRequest.requestedAt, [OLD, RECENT]),
      ),
    )
  await db.delete(certificateActivity).where(eq(certificateActivity.confirmedBy, COMPANIES[0]))
  await db.delete(insuranceCertificate).where(inArray(insuranceCertificate.companyId, COMPANIES))
  await db.delete(companyActivity).where(inArray(companyActivity.companyId, COMPANIES))
  await db.delete(company).where(inArray(company.id, COMPANIES))

  await db.insert(company).values([
    { id: COMPANIES[0], siret: REGISTERED, legalName: 'MAISON INSCRITE' },
    { id: COMPANIES[1], siret: DEPOSITED, legalName: 'MAISON DEPOSANTE' },
    { id: COMPANIES[2], siret: COVERED, legalName: 'MAISON COUVERTE' },
  ])
  await db
    .insert(companyActivity)
    .values(COMPANIES.map((id) => ({ companyId: id, activityCode: '30' })))
  // Une attestation en attente de relecture d'un cote, une attestation
  // publiee de l'autre : la deuxieme marche et la troisieme.
  await certify(COMPANIES[1], 'pending')
  await certify(COMPANIES[2], 'validated')
}

/**
 * Une demande ouverte, canal `sent`.
 *
 * `relaunchOf` reproduit ce que pose `relaunchRequest` : une seconde ligne sur
 * le meme SIRET, que la passe balaie comme n'importe quelle autre.
 */
export async function openRequest(
  siret: string,
  requestedAt: Date,
  notify = true,
  relaunchOf: string | null = null,
) {
  const [row] = await db
    .insert(attestationRequest)
    .values({
      siret,
      channel: 'sent',
      notify,
      requesterName: 'Claire',
      requesterEmail: CLAIRE,
      artisanEmail: `artisan${DOMAIN}`,
      requestedAt,
      relaunchOf,
    })
    .returning({ id: attestationRequest.id })
  return row.id
}

/** Relue par son identifiant : l'anonymisation efface tout le reste. */
export async function reread(id: string) {
  const [row] = await db.select().from(attestationRequest).where(eq(attestationRequest.id, id))
  return row
}

/**
 * `advanceRequests` balaie TOUTES les demandes non anonymisees, y compris
 * celles que les autres fichiers de test laissent derriere eux. Aucune
 * assertion ne porte donc sur un total : nos lignes sont relues par leur
 * identifiant, et les envois filtres sur notre domaine.
 */
export const mine = (list: string[]) => list.filter((to) => to.endsWith(DOMAIN))
