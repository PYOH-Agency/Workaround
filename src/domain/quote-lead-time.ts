import { MINIMUM_OBSERVATIONS, WINDOW_MONTHS } from './passport-metrics'

/**
 * Le delai de remise du devis : de la visite a l'envoi.
 *
 * **Aucune signature n'est exigee**, contrairement aux deux mesures de M5.
 * Celles-la decrivent le chantier, et seul le client peut l'authentifier ;
 * celle-ci decrit NOS PROPRES horodatages — le rendez-vous cree chez nous, le
 * devis envoye par nous.
 *
 * Exiger la signature reviendrait a mesurer « le delai de remise des devis qui
 * ont fini par etre acceptes », population biaisee vers le rapide-et-retenu,
 * ce qui est l'inverse de ce que la mesure doit dire.
 */
export interface QuoteLeadTime {
  visitAt: Date
  /** Horodatage de SAISIE du rendez-vous : la garde anti-antidatage. */
  visitCreatedAt: Date
  quoteSentAt: Date
}

/**
 * Une mediane et le volume sur lequel elle porte, **indissociables**.
 *
 * Meme discipline que le couple taux-volume de M5 : aucun ecran ne peut
 * afficher l'un sans l'autre, et le compilateur applique la regle plutot que
 * la revue.
 */
export interface MedianDays {
  /** En jours calendaires, ou `null` sous le seuil. */
  value: number | null
  /** Le nombre d'observations. Toujours rendu, meme quand `value` est `null`. */
  volume: number
}

const DAY = 86_400_000

function withinWindow(item: QuoteLeadTime, now: Date): boolean {
  const start = new Date(now)
  start.setMonth(start.getMonth() - WINDOW_MONTHS)
  return item.quoteSentAt >= start
}

/**
 * Mesurable ? Deux gardes remplacent la signature :
 *
 *   - le devis est parti APRES la visite — sinon ce n'est pas un delai de remise ;
 *   - le rendez-vous existait AVANT cet envoi — sinon il a ete invente apres coup.
 */
function measurable(item: QuoteLeadTime): boolean {
  return (
    item.quoteSentAt.getTime() >= item.visitAt.getTime() &&
    item.visitCreatedAt.getTime() <= item.quoteSentAt.getTime()
  )
}

export function medianQuoteLeadTime(items: QuoteLeadTime[], now: Date): MedianDays {
  const days = items
    .filter((item) => withinWindow(item, now) && measurable(item))
    .map((item) => Math.round((item.quoteSentAt.getTime() - item.visitAt.getTime()) / DAY))
    .sort((a, b) => a - b)

  if (days.length < MINIMUM_OBSERVATIONS) return { value: null, volume: days.length }

  // La MEDIANE, pas la moyenne : un devis oublie six mois ne doit pas
  // deplacer le chiffre de tous les autres.
  const middle = Math.floor(days.length / 2)
  const value = days.length % 2 === 1 ? days[middle] : (days[middle - 1] + days[middle]) / 2

  return { value, volume: days.length }
}
