/**
 * La contestation d'une mesure du passeport.
 *
 * **Une seule mesure se conteste : le respect du delai.** L'ecart devis →
 * facture est une soustraction entre deux montants tous deux authentifies par
 * une signature du client ; il n'y a aucun fait a etablir, et le client
 * confirmerait toujours avoir demande le supplement — ce qui ramenerait le taux
 * a 100 % pour tout le monde, soit exactement la vacance que la definition du
 * jalon a ete ecrite pour supprimer. Ce que l'artisan peut y opposer est un
 * contexte, pas un fait : c'est la declaration complementaire de l'article 16.
 *
 * Le delai, lui, se conteste pour une vraie raison : le nombre est juste, mais
 * l'imputation peut etre fausse.
 */

/**
 * Le delai laisse au client pour repondre.
 *
 * Passe ce delai, **la mesure initiale s'applique**. C'est la regle qui decide
 * si le mecanisme est solide ou abusable : sans elle, contester suffirait a
 * neutraliser un chantier indefiniment.
 */
export const DISPUTE_WINDOW_DAYS = 14

/** Le motif est lu par un particulier, a cote d'une seule question. */
export const MAX_REASON_LENGTH = 500

export interface Dispute {
  expiresAt: Date
  /**
   * `null` tant que le client n'a pas repondu.
   *
   * **L'expiration n'est pas un verdict** : elle se deduit de `expiresAt` a
   * chaque lecture. L'ecrire supposerait une tache planifiee dont la panne
   * laisserait un chantier exclu du calcul sans plus aucune raison.
   */
  verdict: 'upheld' | 'rejected' | null
}

/**
 * - `under_review` : le delai court, le chantier sort du calcul (article 18)
 * - `upheld` : le client a donne raison a l'artisan, le retard n'est pas imputable
 * - `settled` : la mesure initiale s'applique — tort donne, ou silence
 */
export type DisputeStanding = 'under_review' | 'upheld' | 'settled'

export function expiryOf(openedAt: Date): Date {
  return new Date(openedAt.getTime() + DISPUTE_WINDOW_DAYS * 86_400_000)
}

export function disputeStanding(dispute: Dispute, now: Date): DisputeStanding {
  // Une reponse ne se perime pas : le delai borne l'attente, pas le verdict.
  if (dispute.verdict === 'upheld') return 'upheld'
  if (dispute.verdict === 'rejected') return 'settled'

  return now.getTime() < dispute.expiresAt.getTime() ? 'under_review' : 'settled'
}

export interface DisputableChantier {
  completedAt: Date | null
  committedLeadTimeDays: number | null
  /** Jours ouvres reellement consommes, calcules par l'appelant. */
  businessDaysUsed: number
  existing: Dispute | null
  reason: string
}

export function assertDisputable(chantier: DisputableChantier): void {
  if (chantier.completedAt === null) {
    throw new Error('Un chantier se conteste une fois terminé')
  }
  if (chantier.committedLeadTimeDays === null) {
    // Sans engagement, le chantier ne compte deja pas dans le taux : le
    // contester n'aurait aucun effet, et le proposer serait mentir.
    throw new Error("Ce devis n'engageait aucun délai : rien à contester")
  }
  if (chantier.businessDaysUsed <= chantier.committedLeadTimeDays) {
    throw new Error('Ce chantier a été terminé dans le délai engagé')
  }
  if (chantier.existing !== null) {
    // Rejouer la meme contestation jusqu'a obtenir une reponse favorable
    // viderait l'arbitrage de son sens.
    throw new Error('Ce chantier a déjà fait l’objet d’une contestation')
  }
  if (!chantier.reason.trim()) {
    throw new Error('Le motif est obligatoire')
  }
  if (chantier.reason.length > MAX_REASON_LENGTH) {
    throw new Error(`Ce motif est trop long (${MAX_REASON_LENGTH} caractères maximum)`)
  }
}
