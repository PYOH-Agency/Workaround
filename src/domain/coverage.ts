import type { InsuranceKind } from './activity'

/**
 * Quelle activite est publiquement visible.
 *
 * Le cœur de M3, et la raison d'etre du produit : l'assurance est souscrite
 * PAR ACTIVITE DECLAREE. Un artisan assure en plomberie qui refait un tableau
 * electrique n'est pas couvert, et son client n'a aucun recours en cas de
 * sinistre. C'est le piege numero un du secteur et personne ne le controle.
 *
 * Fonction pure prenant la date courante en parametre : une visibilite qui
 * depend de l'horloge est intestable si l'horloge est implicite.
 */
export interface DeclaredActivity {
  code: string
  requiresDecennale: boolean
}

export interface CertifiedActivity {
  code: string
  kind: InsuranceKind
  validFrom: Date
  validUntil: Date
}

export type CoverageReason =
  | 'covered'
  | 'no_certificate'
  | 'wrong_insurance'
  | 'expired'
  | 'legal_block'

export interface ActivityVisibility {
  code: string
  visible: boolean
  reason: CoverageReason
}

export interface CoverageInput {
  declared: DeclaredActivity[]
  certified: CertifiedActivity[]
  /** Issu des controles legaux : procedure collective, radiation, cessation. */
  legalStatus: 'active' | 'blocked'
  now: Date
}

/** La decennale couvre plus large que la RC Pro : elle vaut pour les deux. */
function satisfies(required: InsuranceKind, held: InsuranceKind): boolean {
  return held === 'decennale' || required === 'rc_pro'
}

function within(certificate: CertifiedActivity, now: Date): boolean {
  return now >= certificate.validFrom && now <= certificate.validUntil
}

export function activityVisibility(input: CoverageInput): ActivityVisibility[] {
  return input.declared.map((activity) => {
    if (input.legalStatus === 'blocked') {
      return { code: activity.code, visible: false, reason: 'legal_block' as const }
    }

    const forActivity = input.certified.filter((c) => c.code === activity.code)
    if (forActivity.length === 0) {
      return { code: activity.code, visible: false, reason: 'no_certificate' as const }
    }

    const required: InsuranceKind = activity.requiresDecennale ? 'decennale' : 'rc_pro'
    const rightKind = forActivity.filter((c) => satisfies(required, c.kind))
    if (rightKind.length === 0) {
      return { code: activity.code, visible: false, reason: 'wrong_insurance' as const }
    }

    const inForce = rightKind.some((c) => within(c, input.now))
    return inForce
      ? { code: activity.code, visible: true, reason: 'covered' as const }
      : { code: activity.code, visible: false, reason: 'expired' as const }
  })
}

/**
 * Une entreprise figure dans l'annuaire des qu'une activite au moins y est
 * couverte. Une fiche sans aucune activite couverte ne dit rien au demandeur et
 * affaiblit la promesse de l'annuaire.
 */
export function publiclyVisible(input: CoverageInput): boolean {
  return activityVisibility(input).some((a) => a.visible)
}
