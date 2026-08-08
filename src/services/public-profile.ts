import { like } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { companySlug } from '@/domain/slug'
import { activeQualifications, type Qualification } from '@/domain/rge'
import { companyCoverage } from '@/services/visibility'
import { validatedCertificates } from '@/services/certificates'
import { fetchRgeRows } from '@/services/rge-lookup'
import type { InsuranceKind } from '@/domain/activity'

export interface PublicActivity {
  code: string
  label: string
  /** L'assurance qui la couvre : c'est elle que le demandeur vient verifier. */
  coveredBy: InsuranceKind
}

export interface PublicProfile {
  slug: string
  legalName: string
  siret: string
  city: string | null
  foundedOn: Date | null
  insurer: { name: string | null; policyNumber: string | null; validUntil: Date | null }
  activities: PublicActivity[]
  qualifications: Qualification[]
}

/**
 * Le profil public d'une entreprise, ou `null`.
 *
 * **Le filtrage est porte par cette fonction, jamais par l'affichage.** L'AIPD
 * l'exige nommement : « les exclusions sont portees par la requete de
 * publication elle-meme, jamais par un filtre d'affichage ». Une page qui
 * recevrait la liste complete et masquerait a l'ecran finirait par en laisser
 * passer une au premier remaniement.
 *
 * Consequence : `activities` ne contient QUE des activites couvertes. Il n'y a
 * rien a filtrer en aval, et rien a oublier de filtrer.
 */
export async function publicProfile(siren: string, now: Date): Promise<PublicProfile | null> {
  const [found] = await db
    .select()
    .from(company)
    .where(like(company.siret, `${siren}%`))
    .limit(1)

  if (!found) return null

  const coverage = await companyCoverage(found.id, now)
  if (!coverage.isPublic) return null

  // Quelle attestation couvre quoi : le demandeur vient verifier cela, pas un
  // badge « assure » indifferencie.
  const certificates = await validatedCertificates(found.id)
  const coveredBy = new Map<string, InsuranceKind>()
  for (const certificate of certificates) {
    for (const link of certificate.activities) {
      if (!coveredBy.has(link.activityCode)) coveredBy.set(link.activityCode, certificate.kind)
    }
  }

  const current = certificates.find((c) => c.validUntil && c.validUntil >= now)

  return {
    slug: companySlug(found.legalName, found.siret),
    legalName: found.legalName,
    siret: found.siret,
    city: found.city,
    foundedOn: found.foundedOn,
    insurer: {
      name: current?.insurerName ?? found.insurerName,
      policyNumber: current?.policyNumber ?? found.policyNumber,
      validUntil: current?.validUntil ?? null,
    },
    activities: coverage.activities
      .filter((a) => a.visible)
      .map((a) => ({ code: a.code, label: a.label, coveredBy: coveredBy.get(a.code) ?? 'rc_pro' })),
    qualifications: await safeQualifications(found.siret, now),
  }
}

/**
 * Les qualifications RGE, ou rien.
 *
 * Une panne de l'ADEME ne doit pas faire disparaitre une page publique entiere :
 * les qualifications sont un complement, la couverture est l'essentiel.
 */
async function safeQualifications(siret: string, now: Date): Promise<Qualification[]> {
  try {
    return activeQualifications(await fetchRgeRows(siret), now)
  } catch {
    return []
  }
}
