import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  anomalyReview,
  company,
  event,
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
import { detectCompletionDrift } from '@/domain/detectors/completion'

const SOURCES = ['sirene', 'bodacc'] as const

/**
 * La file d'anomalies, calculee a la lecture.
 *
 * Ce service ne fait qu'assembler des instantanes et concatener les resultats :
 * toute la logique vit dans les detecteurs, qui sont purs et testes seuls.
 */
export async function currentAnomalies(now: Date): Promise<Anomaly[]> {
  const [pending, expiring, sources, signatures, completions, companyCount, reviews] =
    await Promise.all([
      pendingCertificates(),
      expiringCertificates(),
      sourceStates(),
      signatureRecords(),
      completionRecords(),
      db.$count(company),
      db.select().from(anomalyReview),
    ])

  const anomalies = [
    ...detectWaitingCertificates(pending, now),
    ...detectUnreachableCompanies(expiring, now),
    ...detectSilentSources(sources, now, companyCount),
    ...detectSharedSigners(signatures),
    ...detectCompletionDrift(completions),
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

/**
 * Les chantiers dont le solde a audite une declaration.
 *
 * La date declaree se lit dans le JOURNAL, pas dans le devis : l'emission du
 * solde a ecrase `completed_at`. C'est precisement ce que le journal immuable
 * sert a conserver — ce qui a ete affirme avant d'etre corrige.
 */
function completionRecords() {
  return db
    .select({
      quoteId: quote.id,
      companyName: company.legalName,
      declaredAt: sql<Date | null>`(
        SELECT (e.payload ->> 'at')::timestamptz
        FROM ${event} e
        WHERE e.subject_id = ${quote.id}
          AND e.type = 'chantier.completed'
          AND e.payload ->> 'source' = 'declared'
        ORDER BY e.occurred_at DESC
        LIMIT 1
      )`,
      invoicedAt: quote.completedAt,
    })
    .from(quote)
    .innerJoin(company, eq(quote.companyId, company.id))
    .where(and(eq(quote.completionSource, 'invoiced'), isNotNull(quote.completedAt)))
    .then((rows) =>
      rows
        .filter((row) => row.invoicedAt !== null)
        .map((row) => ({
          quoteId: row.quoteId,
          companyName: row.companyName,
          declaredAt: row.declaredAt ? new Date(row.declaredAt) : null,
          invoicedAt: row.invoicedAt!,
        })),
    )
}
