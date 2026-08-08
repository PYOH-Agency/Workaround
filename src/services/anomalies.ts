import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  anomalyReview,
  company,
  insuranceCertificate,
  legalCheck,
  project,
  quote,
  signature,
} from '@/db/schema'
import { sortAnomalies, suppressReviewed, type Anomaly } from '@/domain/anomaly'
import {
  detectUnreachableCompanies,
  detectWaitingCertificates,
} from '@/domain/detectors/certificates'
import { detectSilentSources } from '@/domain/detectors/sources'
import { detectSharedSigners } from '@/domain/detectors/signers'

const SOURCES = ['sirene', 'bodacc'] as const

/**
 * La file d'anomalies, calculee a la lecture.
 *
 * Ce service ne fait qu'assembler des instantanes et concatener les resultats :
 * toute la logique vit dans les detecteurs, qui sont purs et testes seuls.
 */
export async function currentAnomalies(now: Date): Promise<Anomaly[]> {
  const [pending, expiring, sources, signatures, companyCount, reviews] = await Promise.all([
    pendingCertificates(),
    expiringCertificates(),
    sourceStates(),
    signatureRecords(),
    db.$count(company),
    db.select().from(anomalyReview),
  ])

  const anomalies = [
    ...detectWaitingCertificates(pending, now),
    ...detectUnreachableCompanies(expiring, now),
    ...detectSilentSources(sources, now, companyCount),
    ...detectSharedSigners(signatures),
  ]

  return sortAnomalies(suppressReviewed(anomalies, reviews))
}

function pendingCertificates() {
  return db
    .select({
      id: insuranceCertificate.id,
      companyName: company.legalName,
      uploadedAt: insuranceCertificate.uploadedAt,
    })
    .from(insuranceCertificate)
    .innerJoin(company, eq(insuranceCertificate.companyId, company.id))
    .where(eq(insuranceCertificate.status, 'pending'))
}

function expiringCertificates() {
  return db
    .select({
      companyId: company.id,
      companyName: company.legalName,
      companyEmail: company.email,
      validUntil: insuranceCertificate.validUntil,
    })
    .from(insuranceCertificate)
    .innerJoin(company, eq(insuranceCertificate.companyId, company.id))
    .where(
      and(eq(insuranceCertificate.status, 'validated'), isNotNull(insuranceCertificate.validUntil)),
    )
    .then((rows) => rows.map((row) => ({ ...row, validUntil: row.validUntil! })))
}

function sourceStates() {
  return Promise.all(
    SOURCES.map(async (source) => {
      const [last] = await db
        .select({ checkedAt: legalCheck.checkedAt })
        .from(legalCheck)
        .where(eq(legalCheck.source, source))
        .orderBy(desc(legalCheck.checkedAt))
        .limit(1)

      return { source, lastCheckedAt: last?.checkedAt ?? null }
    }),
  )
}

function signatureRecords() {
  return db
    .select({
      companyId: quote.companyId,
      companyName: company.legalName,
      customerId: project.customerId,
      signerPhone: signature.signerPhone,
      signedAt: signature.signedAt,
    })
    .from(signature)
    .innerJoin(quote, eq(signature.quoteId, quote.id))
    .innerJoin(project, eq(quote.projectId, project.id))
    .innerJoin(company, eq(quote.companyId, company.id))
}
