import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, certificateActivity, insuranceCertificate } from '@/db/schema'
import { recordEvent } from '@/services/events'

export interface ReviewableCertificate {
  status: 'pending' | 'validated' | 'rejected'
  validFrom: Date | null
  validUntil: Date | null
  activityCodes: string[]
}

/** Conditions de validation. Fonction pure, testee isolement. */
export function assertReviewable(input: ReviewableCertificate): void {
  if (input.status !== 'pending') throw new Error('Cette attestation a déjà été traitée')

  if (!input.validFrom || !input.validUntil || input.validFrom >= input.validUntil) {
    throw new Error('La période de validité est incomplète ou incohérente')
  }

  if (input.activityCodes.length === 0) {
    throw new Error('Rattachez au moins une activité du référentiel')
  }

  if (new Set(input.activityCodes).size !== input.activityCodes.length) {
    throw new Error('Une même activité est rattachée deux fois')
  }
}

export interface ReviewInput {
  certificateId: string
  reviewerId: string
  insurerName: string
  policyNumber: string
  validFrom: Date
  validUntil: Date
  /** Correspondances etablies par le relecteur : activite du referentiel + libelle lu. */
  matches: { activityCode: string; sourceLabel: string }[]
}

/**
 * Valide une attestation et enregistre les correspondances.
 *
 * La correspondance entre un libelle d'attestation et une activite du
 * referentiel n'est jamais deduite : elle est etablie par un humain et tracee.
 * Lire « Plomberie — installations sanitaires » est facile ; decider si cela
 * couvre la pose d'un chauffe-eau thermodynamique engage le demandeur qui s'y
 * fiera.
 */
export async function validateCertificate(input: ReviewInput) {
  const current = await db.query.insuranceCertificate.findFirst({
    where: eq(insuranceCertificate.id, input.certificateId),
  })
  if (!current) throw new Error('Attestation introuvable')

  assertReviewable({
    status: current.status,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    activityCodes: input.matches.map((m) => m.activityCode),
  })

  // Les codes doivent exister au referentiel : une correspondance vers un code
  // inconnu produirait une couverture invisible et inexplicable.
  const known = await db.select({ code: activity.code }).from(activity)
  const codes = new Set(known.map((k) => k.code))
  for (const match of input.matches) {
    if (!codes.has(match.activityCode)) {
      throw new Error(`Activité inconnue au référentiel : ${match.activityCode}`)
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(insuranceCertificate)
      .set({
        status: 'validated',
        insurerName: input.insurerName,
        policyNumber: input.policyNumber,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        reviewedBy: input.reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(insuranceCertificate.id, input.certificateId))

    await tx.insert(certificateActivity).values(
      input.matches.map((match) => ({
        certificateId: input.certificateId,
        activityCode: match.activityCode,
        sourceLabel: match.sourceLabel,
        confirmedBy: input.reviewerId,
      })),
    )
  })

  await recordEvent({
    type: 'certificate.validated',
    subjectType: 'certificate',
    subjectId: input.certificateId,
    companyId: current.companyId,
    actorType: 'system',
    actorId: input.reviewerId,
    payload: {
      activities: input.matches.map((m) => m.activityCode),
      validUntil: input.validUntil.toISOString(),
    },
  })
}

/** Rejette une attestation. Le motif est communique — jamais de refus muet. */
export async function rejectCertificate(certificateId: string, reviewerId: string, reason: string) {
  if (!reason.trim()) throw new Error('Un motif de rejet est obligatoire')

  const current = await db.query.insuranceCertificate.findFirst({
    where: eq(insuranceCertificate.id, certificateId),
  })
  if (!current) throw new Error('Attestation introuvable')
  if (current.status !== 'pending') throw new Error('Cette attestation a déjà été traitée')

  await db
    .update(insuranceCertificate)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    })
    .where(eq(insuranceCertificate.id, certificateId))

  await recordEvent({
    type: 'certificate.rejected',
    subjectType: 'certificate',
    subjectId: certificateId,
    companyId: current.companyId,
    actorType: 'system',
    actorId: reviewerId,
    payload: { reason },
  })
}
