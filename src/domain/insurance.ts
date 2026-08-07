/**
 * Mentions d'assurance obligatoires sur les devis et factures du batiment.
 *
 * L'article L243-2 du Code des assurances, renforce par la loi Macron de 2015,
 * impose de faire figurer sur tout devis et toute facture : la mention
 * « Assurance professionnelle », le nom et l'adresse de l'assureur, la
 * reference du contrat, les activites garanties et la zone geographique
 * couverte.
 *
 * L'amende administrative atteint 3 000 EUR pour un artisan individuel et
 * 15 000 EUR pour une societe, par infraction constatee. Un devis emis sans
 * ces mentions expose donc l'artisan — c'est pourquoi elles sont exigees avant
 * toute emission, et non reportees a la verification de M3.
 *
 * Ici on ne verifie que la **presence** des mentions, telles que declarees.
 * Leur exactitude releve de M3, qui les confrontera a l'attestation.
 */

export interface InsuranceMentions {
  insurerName?: string | null
  insurerAddress?: string | null
  policyNumber?: string | null
  coveredActivities?: string | null
  coverageArea?: string | null
}

export const REQUIRED_MENTIONS = [
  'insurerName',
  'insurerAddress',
  'policyNumber',
  'coveredActivities',
  'coverageArea',
] as const

export type RequiredMention = (typeof REQUIRED_MENTIONS)[number]

export function missingInsuranceMentions(mentions: InsuranceMentions): RequiredMention[] {
  return REQUIRED_MENTIONS.filter((key) => !mentions[key]?.trim())
}

export function hasLegalInsuranceMentions(mentions: InsuranceMentions): boolean {
  return missingInsuranceMentions(mentions).length === 0
}
