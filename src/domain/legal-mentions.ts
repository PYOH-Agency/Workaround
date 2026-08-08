import { REQUIRED_MENTIONS as INSURANCE_MENTIONS, type InsuranceMentions } from './insurance'

/**
 * Mentions obligatoires sur un devis de travaux adresse a un particulier.
 *
 * Sources : arrete du 24 janvier 2017 relatif a la publicite des prix des
 * prestations du batiment, article L243-2 du Code des assurances pour
 * l'assurance, et Code de la consommation pour le droit de retractation.
 *
 * Les sanctions administratives atteignent 3 000 EUR pour un artisan
 * individuel et 15 000 EUR pour une societe.
 *
 * Ne figurent ici que les mentions **portees par l'entreprise**, une fois pour
 * toutes. Celles qui varient d'un devis a l'autre — description des travaux,
 * prix, delai — sont verifiees a la redaction.
 */

export interface CompanyLegalDetails extends InsuranceMentions {
  legalFormLabel?: string | null
  registrationNumber?: string | null
  phone?: string | null
  email?: string | null
  vatNumber?: string | null
  vatExempt?: boolean | null
  quoteValidityDays?: number | null
  paymentTerms?: string | null
}

const TEXT_MENTIONS = [
  'legalFormLabel',
  'registrationNumber',
  'phone',
  'email',
  'paymentTerms',
] as const

export function missingLegalMentions(details: CompanyLegalDetails): string[] {
  const missing: string[] = [
    ...TEXT_MENTIONS.filter((key) => !details[key]?.toString().trim()),
    ...INSURANCE_MENTIONS.filter((key) => !details[key]?.trim()),
  ]

  // En franchise en base, il n'y a pas de numero de TVA : le devis porte
  // « TVA non applicable, art. 293 B du CGI » a la place.
  if (!details.vatExempt && !details.vatNumber?.trim()) missing.push('vatNumber')

  if (!details.quoteValidityDays || details.quoteValidityDays <= 0) {
    missing.push('quoteValidityDays')
  }

  return missing
}

export function hasLegalMentions(details: CompanyLegalDetails): boolean {
  return missingLegalMentions(details).length === 0
}
