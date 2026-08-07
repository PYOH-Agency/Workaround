/**
 * Numerotation des devis.
 *
 * La sequence est **par entreprise et par annee** : deux artisans ont chacun
 * leur D2026-0001. C'est l'appelant qui doit restreindre la liste a une
 * entreprise — cette fonction ne fait que la sequence.
 */
export function nextQuoteNumber(existingNumbers: string[], year: number): string {
  const prefix = `D${year}-`

  const highest = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number.parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isInteger(n))
    .reduce((max, n) => Math.max(max, n), 0)

  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}
