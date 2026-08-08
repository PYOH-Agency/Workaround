import type { Cents } from './money'
import { businessDaysSince } from './business-days'

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

export function computeMetrics(chantiers: CompletedChantier[], now: Date): Metrics {
  // La fenetre est appliquee ICI, dans le calcul. Les evenements vivent dix ans
  // au titre de l'obligation comptable ; les lire au-dela serait une faute que
  // la discipline seule n'empecherait pas.
  const recent = chantiers.filter((c) => withinWindow(c, now))

  const onBudget = recent.filter((c) => c.invoicedInclTax <= c.initialTotalInclTax)

  // Sans engagement declare, il n'y a rien a comparer : compter le chantier
  // comme tenu flatterait, le compter comme manque punirait.
  const withCommitment = recent.filter((c) => c.committedLeadTimeDays !== null)
  const onTime = withCommitment.filter(
    (c) => businessDaysSince(c.signedAt, c.completedAt) <= c.committedLeadTimeDays!,
  )

  return {
    quoteToInvoiceGap: rate(onBudget.length, recent.length),
    leadTimeRespect: rate(onTime.length, withCommitment.length),
    completed: { window: recent.length, total: chantiers.length },
  }
}
