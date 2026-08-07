/**
 * Arithmetique monetaire.
 *
 * Regle absolue du projet : tous les montants sont des entiers en centimes.
 * Jamais de flottant, jamais de `number` decimal pour de l'argent — une erreur
 * d'arrondi sur une facture est un probleme comptable, pas un bug d'affichage.
 */

/** Montant en centimes. */
export type Centimes = number

/** Taux en centiemes de pourcent : 20 % => 2000, 5,5 % => 550. */
export type Taux = number

const ESPACES_INSECABLES = /[  ]/g

export function euros(valeur: string): Centimes {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(valeur.trim())
  if (!match) throw new Error(`Montant invalide (au plus deux decimales) : ${valeur}`)

  const [, signe, entier, decimales = ''] = match
  const total = Number(entier) * 100 + Number(decimales.padEnd(2, '0'))

  if (!Number.isSafeInteger(total)) throw new Error(`Montant hors limites : ${valeur}`)

  // Le signe est lu dans la chaine, jamais deduit du nombre : '-0.50' a une
  // partie entiere nulle, dont le signe est perdu des la conversion.
  return signe === '-' ? -total : total
}

/** Arrondi commercial : 0,5 s'arrondit vers le haut en valeur absolue. */
function arrondir(valeur: number): number {
  return valeur < 0 ? -Math.round(-valeur) : Math.round(valeur)
}

export function multiplier(montant: Centimes, quantite: string): Centimes {
  const q = Number(quantite)
  if (!Number.isFinite(q)) throw new Error(`Quantite invalide : ${quantite}`)
  return arrondir(montant * q)
}

export function appliquerTaux(montant: Centimes, taux: Taux): Centimes {
  return arrondir((montant * taux) / 10000)
}

export function formater(montant: Centimes): string {
  const signe = montant < 0 ? '-' : ''
  const absolu = Math.abs(montant)
  const entier = Math.trunc(absolu / 100)
    .toLocaleString('fr-FR')
    .replace(ESPACES_INSECABLES, ' ')
  const decimales = String(absolu % 100).padStart(2, '0')
  return `${signe}${entier},${decimales}`
}
