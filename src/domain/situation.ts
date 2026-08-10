import { applyRate, type Cents, type Rate } from './money'
import type { TaxBreakdown } from './quote-totals'

/**
 * La situation de travaux.
 *
 * Elle enonce **l'avancement CUMULE de chaque ligne du devis**, jamais un
 * delta. Le montant a facturer se deduit ailleurs : c'est la difference entre
 * cette valeur cumulee et ce qui a deja ete facture, lu depuis les factures
 * elles-memes, qui sont immuables.
 *
 * Deux consequences, toutes deux voulues :
 *
 * - **On ne peut plus facturer 120 % d'une ligne.** La garde descend du total
 *   global — seul plafond que connaissait la facture `progress` a lignes
 *   libres — jusqu'a la ligne.
 * - **Le modele survit aux avenants** sans arithmetique de rattrapage : un
 *   avenant apporte de nouvelles lignes, le cumul se declare sur la version qui
 *   fait foi, et la soustraction se charge du reste.
 */

export const MAX_PERCENT = 100

export interface SituationLine {
  quoteLineId: string
  taxRate: Rate
  /** Le total HT de la ligne du devis, quantite comprise. */
  totalExclTax: Cents
  /** L'avancement CUMULE declare, en pourcentage entier. */
  percent: number
}

export function assertSituation(lines: SituationLine[]): void {
  if (lines.length === 0) throw new Error('Une situation porte sur au moins une ligne du devis')

  for (const line of lines) {
    if (!Number.isInteger(line.percent) || line.percent < 0 || line.percent > MAX_PERCENT) {
      throw new Error('Un avancement se déclare en pourcentage entier, entre 0 et 100')
    }
  }
}

/**
 * La valeur cumulee d'une ligne a un avancement donne.
 *
 * **L'arrondi se fait ici, et nulle part ailleurs.** L'ecran de saisie dessine
 * la part que cette situation ajoute a chaque ligne ; recalculer cette part a
 * cote ferait diverger le dessin de la facture d'un centime, exactement le
 * defaut que l'aperçu partage avec le serveur existe pour empecher.
 */
export function lineValue(totalExclTax: Cents, percent: number): Cents {
  return Math.round((totalExclTax * percent) / 100)
}

/**
 * La valeur cumulee des travaux declares, base de TVA par base de TVA.
 *
 * **L'arrondi se fait ligne par ligne**, jamais sur le total : deux situations
 * successives doivent se raccorder au centime, et arrondir apres sommation
 * ferait apparaitre un centime de plus ou de moins selon le decoupage.
 *
 * A 100 % sur toutes les lignes, la valeur egale EXACTEMENT le devis — aucun
 * residu ne peut subsister, puisque `round(total * 100 / 100) === total`.
 */
export function situationByRate(lines: SituationLine[]): TaxBreakdown[] {
  const bases = new Map<Rate, Cents>()

  for (const line of lines) {
    const cumulative = lineValue(line.totalExclTax, line.percent)
    bases.set(line.taxRate, (bases.get(line.taxRate) ?? 0) + cumulative)
  }

  return [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, baseExclTax]) => ({ rate, baseExclTax, taxAmount: applyRate(baseExclTax, rate) }))
}
