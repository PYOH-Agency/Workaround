import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, companyActivity, insuranceCertificate, legalCheck } from '@/db/schema'
import {
  activityVisibility,
  publiclyVisible,
  type ActivityVisibility,
  type CoverageInput,
} from '@/domain/coverage'

export interface CoveredActivity extends ActivityVisibility {
  label: string
}

export interface CompanyCoverage {
  activities: CoveredActivity[]
  isPublic: boolean
}

/**
 * Assemble l'etat de couverture d'une entreprise.
 *
 * **Rien n'est stocke.** Un drapeau `visible` en base deriverait de la verite
 * des le lendemain de l'expiration d'une attestation : l'entreprise resterait
 * affichee jusqu'a ce qu'un travail de fond passe. C'est la meme regle que le
 * reste a facturer de M2 — un solde stocke finit toujours par mentir.
 */
export async function companyCoverage(companyId: string, now: Date): Promise<CompanyCoverage> {
  const declared = await db
    .select({
      code: activity.code,
      label: activity.label,
      requiresDecennale: activity.requiresDecennale,
    })
    .from(companyActivity)
    .innerJoin(activity, eq(companyActivity.activityCode, activity.code))
    .where(eq(companyActivity.companyId, companyId))
    .orderBy(activity.code)

  const certificates = await db.query.insuranceCertificate.findMany({
    where: and(
      eq(insuranceCertificate.companyId, companyId),
      eq(insuranceCertificate.status, 'validated'),
    ),
    with: { activities: true },
  })

  const [lastCheck] = await db
    .select({ status: legalCheck.status })
    .from(legalCheck)
    .where(and(eq(legalCheck.companyId, companyId), eq(legalCheck.source, 'bodacc')))
    .orderBy(desc(legalCheck.checkedAt))
    .limit(1)

  const input: CoverageInput = {
    declared,
    certified: certificates.flatMap((certificate) =>
      certificate.activities.map((link) => ({
        code: link.activityCode,
        kind: certificate.kind,
        validFrom: certificate.validFrom!,
        validUntil: certificate.validUntil!,
      })),
    ),
    // Sans controle enregistre, on ne bloque pas : bloquer par defaut
    // suspendrait toute entreprise dont le controle n'a pas encore tourne.
    legalStatus: lastCheck?.status === 'blocked' ? 'blocked' : 'active',
    now,
  }

  const labels = new Map(declared.map((d) => [d.code, d.label]))

  return {
    activities: activityVisibility(input).map((a) => ({ ...a, label: labels.get(a.code)! })),
    isPublic: publiclyVisible(input),
  }
}
