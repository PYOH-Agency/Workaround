import type { Anomaly } from '../anomaly'
import { businessDaysSince } from '../business-days'
import { NOTICE_DAYS } from '../expiry'

/** Au-dela, une attestation deposee attend trop longtemps une revue humaine. */
const WAITING_LIMIT_BUSINESS_DAYS = 2

export interface PendingCertificate {
  id: string
  companyName: string
  uploadedAt: Date
}

/**
 * Les attestations qui dorment.
 *
 * M3 a cree ce travail sans que personne ne le voie : un depot du vendredi soir
 * peut attendre une semaine. La promesse de verification est ce qu'on vend —
 * elle ne tourne que si la file est traitee.
 */
export function detectWaitingCertificates(pending: PendingCertificate[], now: Date): Anomaly[] {
  return pending
    .filter((c) => businessDaysSince(c.uploadedAt, now) > WAITING_LIMIT_BUSINESS_DAYS)
    .map((c) => ({
      type: 'certificate_waiting' as const,
      severity: 'attention' as const,
      subjectId: c.id,
      since: c.uploadedAt,
      detail: `Attestation de ${c.companyName} en attente depuis ${businessDaysSince(c.uploadedAt, now)} jours ouvrés`,
      href: `/attestations/${c.id}`,
      fingerprint: c.id,
    }))
}

export interface ExpiringCertificate {
  companyId: string
  companyName: string
  companyEmail: string | null
  validUntil: Date
}

/**
 * Les entreprises qu'on va suspendre sans pouvoir les prevenir.
 *
 * L'article 22.3 impose un preavis avant toute suspension automatique. Sans
 * adresse, il ne part pas — et la suspension serait irreguliere. C'est
 * bloquant : il faut obtenir un moyen de contact avant l'echeance.
 */
export function detectUnreachableCompanies(
  expiring: ExpiringCertificate[],
  now: Date,
): Anomaly[] {
  const horizon = Math.max(...NOTICE_DAYS) * 86_400_000

  return expiring
    .filter((c) => !c.companyEmail?.trim())
    .filter((c) => {
      const remaining = c.validUntil.getTime() - now.getTime()
      // Une echeance passee n'a plus de preavis a recevoir : la signaler
      // encombrerait la file indefiniment.
      return remaining >= 0 && remaining <= horizon
    })
    .map((c) => ({
      type: 'unreachable_company' as const,
      severity: 'blocking' as const,
      subjectId: c.companyId,
      since: now,
      detail: `${c.companyName} n’a aucune adresse : sa suspension du ${c.validUntil.toLocaleDateString('fr-FR')} ne peut pas être précédée d’un préavis`,
      href: '/supervision',
      fingerprint: `${c.companyId}|${c.validUntil.toISOString()}`,
    }))
}
