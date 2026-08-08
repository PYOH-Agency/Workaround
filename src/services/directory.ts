import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { certificateActivity, company, companyActivity, insuranceCertificate } from '@/db/schema'
import { rankByProximity, type Listing } from '@/domain/directory-ranking'
import { normalizeCity, parseZone } from '@/domain/zone'
import { companySlug } from '@/domain/slug'

export interface DirectoryQuery {
  activityCode: string
  zone: string
}

export interface DirectoryResult extends Listing {
  slug: string
  legalName: string
  cityLabel: string
  phone: string | null
}

/**
 * Les entreprises publiables pour une activite et une zone.
 *
 * **Le filtre est porte par la requete, jamais par l'affichage** — comme
 * l'exige l'AIPD pour la page publique. Une entreprise ne remonte que si elle a
 * DECLARE l'activite ET qu'une attestation validee, en cours de validite, la
 * COUVRE nommement.
 */
export async function searchDirectory(
  query: DirectoryQuery,
  now: Date,
): Promise<DirectoryResult[]> {
  const rows = await db
    .selectDistinct({
      companyId: company.id,
      legalName: company.legalName,
      postalCode: company.postalCode,
      city: company.city,
      phone: company.phone,
      siret: company.siret,
    })
    .from(company)
    .innerJoin(companyActivity, eq(companyActivity.companyId, company.id))
    .innerJoin(insuranceCertificate, eq(insuranceCertificate.companyId, company.id))
    .innerJoin(
      certificateActivity,
      and(
        eq(certificateActivity.certificateId, insuranceCertificate.id),
        // La correspondance doit porter sur l'activite CHERCHEE, pas sur une
        // autre activite de la meme attestation.
        eq(certificateActivity.activityCode, companyActivity.activityCode),
      ),
    )
    .where(
      and(
        eq(companyActivity.activityCode, query.activityCode),
        eq(insuranceCertificate.status, 'validated'),
        lte(insuranceCertificate.validFrom, now),
        gte(insuranceCertificate.validUntil, now),
      ),
    )

  const listings = rows
    .filter((row) => row.postalCode && row.city)
    .map((row) => ({
      companyId: row.companyId,
      postalCode: row.postalCode!,
      city: normalizeCity(row.city!),
      cityLabel: row.city!,
      legalName: row.legalName,
      phone: row.phone,
      slug: companySlug(row.legalName, row.siret),
    }))

  const zone = parseZone(
    query.zone,
    listings.map((l) => `${l.postalCode}|${l.city}`),
  )
  // Une zone vide ne doit pas deverser l'annuaire entier : le demandeur cherche
  // pres de chez lui, et une liste nationale ne l'aide en rien.
  if (!zone) return []

  return rankByProximity(listings, zone, now.toISOString().slice(0, 10))
}
