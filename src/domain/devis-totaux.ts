import { appliquerTaux, multiplier, type Centimes, type Taux } from './money'

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

export interface LigneCalcul {
  quantite: string
  prixUnitaireHT: Centimes
  tauxTVA: Taux
}

export interface VentilationTaux {
  taux: Taux
  baseHT: Centimes
  montantTVA: Centimes
}

export interface Totaux {
  totalHT: Centimes
  totalTVA: Centimes
  totalTTC: Centimes
  parTaux: VentilationTaux[]
}

export function calculerTotaux(lignes: LigneCalcul[]): Totaux {
  const bases = new Map<Taux, Centimes>()

  for (const l of lignes) {
    const montantHT = multiplier(l.prixUnitaireHT, l.quantite)
    bases.set(l.tauxTVA, (bases.get(l.tauxTVA) ?? 0) + montantHT)
  }

  const parTaux = [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([taux, baseHT]) => ({ taux, baseHT, montantTVA: appliquerTaux(baseHT, taux) }))

  const totalHT = parTaux.reduce((s, v) => s + v.baseHT, 0)
  const totalTVA = parTaux.reduce((s, v) => s + v.montantTVA, 0)

  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA, parTaux }
}
