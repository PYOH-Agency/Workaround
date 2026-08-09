import type { Cents } from './money'
import { businessDaysSince } from './business-days'
import { disputeStanding, type Dispute } from './dispute'

/**
 * Les metriques du passeport.
 *
 * Elles se calculent a la lecture, jamais ne se stockent : un chiffre stocke
 * survivrait a la correction du fait qui l'a produit.
 */
export const WINDOW_MONTHS = 12

/**
 * En deca, aucun taux n'est rendu.
 *
 * Une entreprise a trois chantiers parfaits paraitrait meilleure qu'une
 * entreprise a deux cents chantiers a 96 %.
 */
export const MINIMUM_OBSERVATIONS = 10

export interface CompletedChantier {
  signedAt: Date
  completedAt: Date
  /** En jours ouvres, comme le devis l'annonce. `null` : rien a comparer. */
  committedLeadTimeDays: number | null
  /** Le devis d'ORIGINE, avenants exclus. */
  initialTotalInclTax: Cents
  /** Le total facture, avoirs deduits, avenants compris. */
  invoicedInclTax: Cents
  /**
   * La contestation du delai, ou `null`.
   *
   * **Elle ne porte que sur le delai.** L'ecart devis → facture est une
   * soustraction entre deux montants tous deux signes par le client : aucun
   * arbitrage ne peut la deplacer, et le laisser contester ramenerait le taux
   * a 100 % pour quiconque a fait signer un avenant.
   */
  dispute: Dispute | null
}

/**
 * Un taux et le volume sur lequel il porte, **indissociables**.
 *
 * C'est la reponse au biais de selection. La signature client empeche
 * d'inventer un chantier, pas d'en omettre un : l'artisan qui sort ses
 * chantiers difficiles de l'outil obtiendrait un taux exact et trompeur. Le
 * seuil empeche d'afficher un chiffre non significatif ; **le volume empeche de
 * lire un chiffre significatif comme s'il etait exhaustif**.
 *
 * Les rendre dans le meme objet fait appliquer la regle par le compilateur
 * plutot que par la revue : aucun ecran ne peut afficher l'un sans l'autre.
 */
export interface Rate {
  /** Le taux en pourcent, ou `null` sous le seuil. */
  value: number | null
  /** Le nombre d'observations. Toujours rendu, meme quand `value` est `null`. */
  volume: number
}

export interface Metrics {
  quoteToInvoiceGap: Rate
  leadTimeRespect: Rate
  completed: { window: number; total: number }
}

function rate(kept: number, total: number): Rate {
  return {
    value: total >= MINIMUM_OBSERVATIONS ? Math.round((kept / total) * 100) : null,
    volume: total,
  }
}

function withinWindow(chantier: CompletedChantier, now: Date): boolean {
  const start = new Date(now)
  start.setMonth(start.getMonth() - WINDOW_MONTHS)
  return chantier.completedAt >= start
}

/**
 * Le delai de ce chantier est-il mesurable ?
 *
 * Trois cas le rendent immesurable, et tous trois pour la meme raison — rien
 * ne permet d'affirmer que l'artisan etait dans les temps :
 *
 *   - aucun delai engage : il n'y a rien a comparer ;
 *   - contestation en instruction : la mesure est suspendue (article 18) ;
 *   - contestation retenue : le client a dit que le retard n'etait pas
 *     imputable a l'artisan — pas qu'il avait tenu son delai.
 *
 * Le chantier sort donc du taux, numerateur ET denominateur. Il reste compte
 * dans le volume de chantiers termines : c'est ce qui rend la contestation
 * auto-limitante, puisque contester beaucoup fait decrocher le volume du taux
 * de celui des chantiers, a la vue de tous.
 */
function leadTimeMeasured(chantier: CompletedChantier, now: Date): boolean {
  if (chantier.committedLeadTimeDays === null) return false
  if (chantier.dispute === null) return true

  return disputeStanding(chantier.dispute, now) === 'settled'
}

export function computeMetrics(chantiers: CompletedChantier[], now: Date): Metrics {
  // La fenetre est appliquee ICI, dans le calcul. Les evenements vivent dix ans
  // au titre de l'obligation comptable ; les lire au-dela serait une faute que
  // la discipline seule n'empecherait pas.
  const recent = chantiers.filter((c) => withinWindow(c, now))

  const onBudget = recent.filter((c) => c.invoicedInclTax <= c.initialTotalInclTax)

  const withCommitment = recent.filter((c) => leadTimeMeasured(c, now))
  const onTime = withCommitment.filter(
    (c) => businessDaysSince(c.signedAt, c.completedAt) <= c.committedLeadTimeDays!,
  )

  return {
    quoteToInvoiceGap: rate(onBudget.length, recent.length),
    leadTimeRespect: rate(onTime.length, withCommitment.length),
    completed: { window: recent.length, total: chantiers.length },
  }
}
