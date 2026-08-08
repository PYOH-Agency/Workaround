/**
 * Numero de TVA intracommunautaire francais.
 *
 * Il se deduit du SIREN, ce qui evite de le demander a l'artisan — la plupart
 * ne l'ont pas sous la main, et une saisie manuelle serait une source d'erreur
 * sur un document legal.
 */

export function sirenFromSiret(siret: string): string {
  const digits = siret.replace(/\D/g, '')
  if (digits.length !== 14) throw new Error('SIRET attendu (14 chiffres)')
  return digits.slice(0, 9)
}

export function frenchVatNumber(siren: string): string {
  const digits = siren.replace(/\D/g, '')
  if (digits.length !== 9) throw new Error('SIREN attendu (9 chiffres)')

  const key = (12 + 3 * (Number(digits) % 97)) % 97
  return `FR${String(key).padStart(2, '0')}${digits}`
}
