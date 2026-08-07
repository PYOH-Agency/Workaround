/**
 * Validation du SIRET par cle de Luhn.
 *
 * Sert de garde-fou avant tout appel reseau : inutile d'interroger Sirene pour
 * un numero dont la cle est fausse.
 */

export function normaliserSiret(valeur: string): string {
  return valeur.replace(/[\s.\-]/g, '')
}

export function siretValide(valeur: string): boolean {
  const s = normaliserSiret(valeur)
  if (!/^\d{14}$/.test(s)) return false

  let somme = 0
  for (let i = 0; i < 14; i++) {
    let chiffre = Number(s[i])
    // Les positions paires (index 0, 2, ...) sont doublees.
    if (i % 2 === 0) {
      chiffre *= 2
      if (chiffre > 9) chiffre -= 9
    }
    somme += chiffre
  }
  return somme % 10 === 0
}
