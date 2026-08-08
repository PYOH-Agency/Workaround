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

/**
 * Lit une saisie libre de SIRET et en tire le SIREN.
 *
 * Deux messages distincts, et c'est delibere : « incomplet » se corrige en
 * continuant a taper, « n'existe pas » demande de relire. Les confondre laisse
 * l'utilisateur devant un champ rouge sans savoir quoi faire.
 */
export function parseSiretInput(value: string): { siren: string } | { error: string } {
  const digits = normalizeSiret(value)

  if (digits.length !== 14) {
    return { error: 'Ce SIRET est incomplet : il compte 14 chiffres.' }
  }
  if (!isValidSiret(digits)) {
    return { error: 'Ce SIRET n’existe pas : vérifiez les chiffres.' }
  }

  return { siren: digits.slice(0, 9) }
}
