/**
 * Validation du SIRET par cle de Luhn.
 *
 * Sert de garde-fou avant tout appel reseau : inutile d'interroger l'annuaire
 * des entreprises pour un numero dont la cle est fausse.
 */

export function normalizeSiret(value: string): string {
  return value.replace(/[\s.\-]/g, '')
}

export function isValidSiret(value: string): boolean {
  const siret = normalizeSiret(value)
  if (!/^\d{14}$/.test(siret)) return false

  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = Number(siret[i])
    // Les positions paires (index 0, 2, ...) sont doublees.
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}
