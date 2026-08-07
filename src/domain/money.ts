/**
 * Arithmetique monetaire.
 *
 * Regle absolue du projet : tous les montants sont des entiers en centimes.
 * Jamais de flottant, jamais de nombre decimal pour de l'argent — une erreur
 * d'arrondi sur une facture est un probleme comptable, pas un bug d'affichage.
 */

/** Montant en centimes. */
export type Cents = number

/** Taux en centiemes de pourcent : 20 % => 2000, 5,5 % => 550. */
export type Rate = number

// `toLocaleString('fr-FR')` separe les milliers par une espace insecable etroite
// (U+202F) ou insecable (U+00A0). On normalise en espace ordinaire via `\s`
// plutot qu'en listant ces caracteres : ecrits en clair ils sont invisibles en
// source, et n'importe quelle reecriture du fichier les fait disparaitre.
const ANY_SPACE = /\s/g

export function toCents(value: string): Cents {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) throw new Error(`Montant invalide (au plus deux decimales) : ${value}`)

  const [, sign, whole, decimals = ''] = match
  const total = Number(whole) * 100 + Number(decimals.padEnd(2, '0'))

  if (!Number.isSafeInteger(total)) throw new Error(`Montant hors limites : ${value}`)

  // Le signe est lu dans la chaine, jamais deduit du nombre : '-0.50' a une
  // partie entiere nulle, dont le signe est perdu des la conversion.
  return sign === '-' ? -total : total
}

/** Arrondi commercial : 0,5 s'arrondit vers le haut en valeur absolue. */
function round(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

export function multiply(amount: Cents, quantity: string): Cents {
  const q = Number(quantity)
  if (!Number.isFinite(q)) throw new Error(`Quantite invalide : ${quantity}`)
  return round(amount * q)
}

export function applyRate(amount: Cents, rate: Rate): Cents {
  return round((amount * rate) / 10000)
}

export function format(amount: Cents): string {
  const sign = amount < 0 ? '-' : ''
  const absolute = Math.abs(amount)
  const whole = Math.trunc(absolute / 100)
    .toLocaleString('fr-FR')
    .replace(ANY_SPACE, ' ')
  const decimals = String(absolute % 100).padStart(2, '0')
  return `${sign}${whole},${decimals}`
}
