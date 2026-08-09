import type { Cents } from './money'

/**
 * Le versionnage d'un devis.
 *
 * Un avenant est une nouvelle version du meme devis, signee par le client. Il
 * **remplace** la precedente : son total est le nouveau total engage, jamais un
 * delta. Additionner ferait payer deux fois les lignes reprises.
 */
export interface QuoteVersion {
  id: string
  version: number
  status: 'draft' | 'sent' | 'signed' | 'refused' | 'expired'
  totalInclTax: Cents
  /**
   * La date de signature de CETTE version.
   *
   * Sans elle, un avenant se daterait du devis d'origine — un mensonge dans la
   * chronologie que le client lit.
   */
  signedAt: Date | null
}

/**
 * La version qui fait foi : le dernier avenant SIGNE.
 *
 * Un avenant non signe n'engage personne — le client ne l'a pas accepte, et
 * l'artisan ne peut pas facturer dessus.
 */
export function referenceVersion(versions: QuoteVersion[]): QuoteVersion | null {
  const signed = versions.filter((v) => v.status === 'signed')
  if (signed.length === 0) return null

  return signed.reduce((latest, v) => (v.version > latest.version ? v : latest))
}

export function engagedTotal(versions: QuoteVersion[]): Cents {
  return referenceVersion(versions)?.totalInclTax ?? 0
}

/**
 * Le total du devis d'origine, quoi qu'il arrive ensuite.
 *
 * C'est lui que la metrique « ecart devis vers facture » comparera au total
 * facture : la question du demandeur est « quand il annonce 1 000, combien je
 * paie », pas « a-t-il respecte ses avenants ».
 */
export function initialTotal(versions: QuoteVersion[]): Cents {
  return versions.find((v) => v.version === 1)?.totalInclTax ?? 0
}

/**
 * Conditions de creation d'un avenant.
 *
 * `nextTotalInclTax` est facultatif : a la creation on ne le connait pas
 * encore, on ne verifie alors que l'etat des versions.
 */
export function assertAmendable(
  versions: QuoteVersion[],
  alreadyInvoicedInclTax: Cents,
  nextTotalInclTax?: Cents,
): void {
  if (!referenceVersion(versions)) {
    throw new Error('Un avenant ne se fait que sur un devis déjà signé')
  }

  const pending = versions.some((v) => v.status === 'draft' || v.status === 'sent')
  if (pending) {
    throw new Error('Une version de ce devis est déjà en cours : terminez-la d’abord')
  }

  if (nextTotalInclTax !== undefined && nextTotalInclTax < alreadyInvoicedInclTax) {
    throw new Error(
      'Ce montant est inférieur à ce qui a déjà été facturé. Corrigez d’abord par un avoir.',
    )
  }
}
