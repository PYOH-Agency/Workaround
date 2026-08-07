import { createHash } from 'node:crypto'

/**
 * Normalisation d'adresse et empreinte de deduplication.
 *
 * Deux entreprises intervenant a la meme adresse doivent aboutir au MEME
 * logement : c'est ce qui rendra possible la vue consolidee du demandeur.
 * L'empreinte est donc calculee sur une forme canonique de l'adresse.
 */

const ABBREVIATIONS: Record<string, string> = {
  r: 'rue',
  av: 'avenue',
  ave: 'avenue',
  bd: 'boulevard',
  bld: 'boulevard',
  imp: 'impasse',
  pl: 'place',
  rte: 'route',
  che: 'chemin',
  chem: 'chemin',
  all: 'allee',
  sq: 'square',
  crs: 'cours',
  qu: 'quai',
  st: 'saint',
  ste: 'sainte',
}

// Marques combinantes laissees par la decomposition NFD. On passe par la
// propriete Unicode plutot que par un intervalle de caracteres combinants
// ecrits en clair : ceux-ci sont invisibles en source et alterables.
const DIACRITICS = /\p{M}/gu

export function normalizeLine(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[.,;:'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(' ')
}

export interface Address {
  line1: string
  postalCode: string
  city: string
}

export function addressFingerprint(address: Address): string {
  const parts = [
    normalizeLine(address.line1),
    address.postalCode.replace(/\s/g, ''),
    normalizeLine(address.city),
  ]
  return createHash('sha256').update(parts.join('|')).digest('hex')
}
