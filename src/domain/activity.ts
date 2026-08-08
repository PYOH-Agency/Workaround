/**
 * Referentiel d'activites, aligne sur la nomenclature France Assureurs
 * (revision 2019) — le vocabulaire dans lequel sont redigees les activites
 * garanties des attestations d'assurance.
 *
 * Qualibat a ete ecarte : il nomme des *competences* reconnues, pas des
 * *activites* exercees. Partir de lui obligerait a traduire chaque libelle
 * d'attestation vers une nomenclature etrangere, au point le plus fragile de la
 * chaine.
 */
export type InsuranceKind = 'decennale' | 'rc_pro'

export type ActivityFamily = 'site' | 'structure' | 'envelope' | 'fitting' | 'technical'

export const ACTIVITY_FAMILIES: { code: ActivityFamily; label: string }[] = [
  { code: 'site', label: 'Préparation et aménagement du site' },
  { code: 'structure', label: 'Structure et gros œuvre' },
  { code: 'envelope', label: 'Clos et couvert' },
  { code: 'fitting', label: 'Divisions, aménagements et finitions' },
  { code: 'technical', label: 'Lots techniques et activités spécifiques' },
]

export interface Activity {
  /** Numero de la nomenclature : « 30 », « 4.1 ». */
  code: string
  label: string
  family: ActivityFamily
  /**
   * Renseigne activite par activite, jamais deduit de l'appartenance a la
   * liste : la nomenclature contient des entrees qui n'engagent pas la garantie
   * decennale (paysagiste, agencement).
   */
  requiresDecennale: boolean
}

export function requiredInsurance(activity: Activity): InsuranceKind {
  return activity.requiresDecennale ? 'decennale' : 'rc_pro'
}
