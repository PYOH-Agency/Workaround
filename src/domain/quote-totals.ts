import { applyRate, multiply, type Cents, type Rate } from './money'

/**
 * Calcul des totaux d'un devis.
 *
 * Deux regles portees par ce module :
 *
 * 1. Le taux de TVA n'est jamais determine ici. Il est choisi par l'artisan,
 *    ligne par ligne, et il en reste responsable. Deduire le taux a sa place
 *    ferait de nous un moteur fiscal, donc responsables de ses erreurs de
 *    declaration.
 *
 * 2. La TVA se calcule par groupe de taux, jamais ligne par ligne. Arrondir
 *    chaque ligne produit des ecarts d'un centime que les comptables refusent.
 */

export interface LineInput {
  quantity: string
  unitPriceExclTax: Cents
  taxRate: Rate
}

export interface TaxBreakdown {
  rate: Rate
  baseExclTax: Cents
  taxAmount: Cents
}

export interface Totals {
  totalExclTax: Cents
  totalTax: Cents
  totalInclTax: Cents
  byRate: TaxBreakdown[]
}

export function computeTotals(lines: LineInput[]): Totals {
  const bases = new Map<Rate, Cents>()

  for (const line of lines) {
    const amount = multiply(line.unitPriceExclTax, line.quantity)
    bases.set(line.taxRate, (bases.get(line.taxRate) ?? 0) + amount)
  }

  const byRate = [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, baseExclTax]) => ({ rate, baseExclTax, taxAmount: applyRate(baseExclTax, rate) }))

  const totalExclTax = byRate.reduce((sum, b) => sum + b.baseExclTax, 0)
  const totalTax = byRate.reduce((sum, b) => sum + b.taxAmount, 0)

  return { totalExclTax, totalTax, totalInclTax: totalExclTax + totalTax, byRate }
}
