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

/**
 * Indemnite forfaitaire pour frais de recouvrement, due entre professionnels.
 * Montant fixe par l'article D441-5 du Code de commerce : non parametrable.
 */
export const LEGAL_RECOVERY_INDEMNITY_CENTS = 4000

export interface InvoiceLegalDetails extends CompanyLegalDetails {
  /** Taux des penalites de retard. Minimum legal : trois fois le taux d'interet legal. */
  latePaymentRate?: string | null
}

/**
 * Mentions obligatoires d'une facture.
 *
 * Chaque mention manquante coute 15 EUR, plafonnees a 25 % du montant de la
 * facture : sur un chantier a 8 000 EUR, l'addition atteint 2 000 EUR.
 */
export function missingInvoiceMentions(details: InvoiceLegalDetails): string[] {
  // La duree de validite est propre au devis : une facture ne se perime pas.
  const missing = missingLegalMentions(details).filter((key) => key !== 'quoteValidityDays')

  if (!details.latePaymentRate?.trim()) missing.push('latePaymentRate')

  return missing
}

/**
 * Les trois lignes que l'artisan lit, la ou `missingLegalMentions` en rend onze.
 *
 * Afficher `registrationNumber`, `coverageArea` et `quoteValidityDays` tels
 * quels donnerait un rapport d'erreurs, pas une liste de choses a faire.
 *
 * **Partagees entre l'inscription et l'atelier** : ce sont les memes trois
 * lignes, annoncees a l'etape 2 de `/creer-mon-entreprise` puis actionnables
 * dans la liste de premiers pas. C'est ce qui fait qu'arriver dans l'atelier ne
 * surprend pas.
 */
export type MentionGroup = 'contact' | 'insurance' | 'terms'

/**
 * Ordre d'affichage, et il compte : c'est celui de la liste de premiers pas.
 * Deux ordres differents entre l'annonce et l'action desorienteraient.
 */
const GROUP_ORDER: MentionGroup[] = ['contact', 'insurance', 'terms']

export const MENTION_GROUP_LABELS: Record<MentionGroup, string> = {
  contact: 'Coordonnées',
  insurance: 'Assurance décennale',
  terms: 'Conditions de règlement',
}

/**
 * A quel groupe appartient chaque mention.
 *
 * **Exhaustive**, et un test l'exige : une mention ajoutee a
 * `missingLegalMentions` sans etre classee ici deviendrait invisible a l'ecran,
 * et l'artisan se verrait refuser l'emission sans savoir ce qui manque.
 */
export const MENTION_GROUP_OF = {
  legalFormLabel: 'contact',
  registrationNumber: 'contact',
  phone: 'contact',
  email: 'contact',
  insurerName: 'insurance',
  insurerAddress: 'insurance',
  policyNumber: 'insurance',
  coveredActivities: 'insurance',
  coverageArea: 'insurance',
  paymentTerms: 'terms',
  vatNumber: 'terms',
  quoteValidityDays: 'terms',
} as const satisfies Record<string, MentionGroup>

export function missingMentionGroups(details: CompanyLegalDetails): MentionGroup[] {
  const missing = new Set(
    missingLegalMentions(details).map(
      (key) => MENTION_GROUP_OF[key as keyof typeof MENTION_GROUP_OF],
    ),
  )

  return GROUP_ORDER.filter((group) => missing.has(group))
}
