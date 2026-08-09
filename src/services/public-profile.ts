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
  /** Echeance de l'attestation qui la couvre. */
  coveredUntil: Date
  /** Date de la revue humaine de cette attestation. */
  checkedOn: Date | null
}

export interface PublicProfile {
  /** Necessaire au formulaire de contact : il s'adresse a UNE entreprise. */
  companyId: string
  slug: string
  legalName: string
  siret: string
  /** Deja mention obligatoire sur chaque devis : rien de confidentiel. */
  phone: string | null
  email: string | null
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

  const current = certificates.find((c) => c.validUntil && c.validUntil >= now)

  return {
    companyId: found.id,
    slug: companySlug(found.legalName, found.siret),
    legalName: found.legalName,
    siret: found.siret,
    phone: found.phone,
    email: found.email,
    city: found.city,
    foundedOn: found.foundedOn,
    insurer: {
      name: current?.insurerName ?? found.insurerName,
      policyNumber: current?.policyNumber ?? found.policyNumber,
      validUntil: current?.validUntil ?? null,
    },
    activities: coverage.activities
      .filter((a) => a.visible)
      .flatMap((a) => {
        const cited = citedCertificate(certificates, a.code, now)
        // `visible` garantit une attestation en cours. Si elle manque ici, les
        // deux calculs ont diverge : on se tait plutot que d'affirmer une
        // couverture qu'on ne sait pas dater.
        if (!cited) return []
        return [
          {
            code: a.code,
            label: a.label,
            coveredBy: cited.kind,
            coveredUntil: cited.validUntil!,
            checkedOn: cited.reviewedAt,
          },
        ]
      }),
    qualifications: await safeQualifications(found.siret, now),
  }
}

type ValidatedCertificate = Awaited<ReturnType<typeof validatedCertificates>>[number]

/**
 * L'attestation a citer pour une activite.
 *
 * Trois regles, dans cet ordre : elle doit etre **en cours** a la date
 * consideree, la decennale prime sur la RC Pro puisqu'elle couvre plus large,
 * et a egalite la plus lointaine echeance gagne.
 *
 * La premiere corrige un defaut qui n'apparaissait pas tant qu'aucune date
 * n'etait affichee : retenir la premiere attestation qui nomme l'activite
 * pouvait afficher « Garantie decennale » d'apres un document perime, alors
 * que la visibilite venait d'une RC Pro encore en cours. Le libelle aurait
 * alors contredit l'echeance imprimee juste a cote.
 */
function citedCertificate(
  certificates: ValidatedCertificate[],
  code: string,
  now: Date,
): ValidatedCertificate | null {
  const inForce = certificates.filter(
    (c) =>
      c.validFrom !== null &&
      c.validUntil !== null &&
      now >= c.validFrom &&
      now <= c.validUntil &&
      c.activities.some((link) => link.activityCode === code),
  )

  const ranked = [...inForce].sort((a, b) =>
    a.kind === b.kind
      ? b.validUntil!.getTime() - a.validUntil!.getTime()
      : a.kind === 'decennale'
        ? -1
        : 1,
  )

  return ranked[0] ?? null
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
