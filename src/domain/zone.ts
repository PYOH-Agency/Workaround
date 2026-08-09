import type { Zone } from './directory-ranking'

// Marques diacritiques visees par propriete Unicode plutot qu'en clair :
// ecrites litteralement elles sont invisibles en source, et n'importe quelle
// reecriture du fichier les fait disparaitre. Le piege s'est presente en M1.
const DIACRITICS = /\p{M}/gu

export function normalizeCity(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Interprete la zone saisie par sa forme.
 *
 * Cinq chiffres valent un code postal ; tout le reste vaut une commune. Le
 * departement d'une commune se deduit du code postal des entreprises qui y
 * siegent — `known` porte des couples « codePostal|commune » deja normalises.
 * Quand la commune n'est connue de personne, le departement reste `null` : on
 * ne pretend pas a une proximite qu'on ne peut pas etablir.
 */
export function parseZone(input: string, known: string[]): Zone | null {
  const compact = input.replace(/\s/g, '')
  if (!compact) return null

  if (/^\d{5}$/.test(compact)) {
    return { kind: 'postalCode', value: compact, department: compact.slice(0, 2) }
  }

  const city = normalizeCity(input)
  if (!city) return null

  const match = known.find((entry) => entry.split('|')[1] === city)

  return { kind: 'city', value: city, department: match ? match.slice(0, 2) : null }
}
