import { createHash } from 'node:crypto'

/**
 * Normalisation d'adresse et empreinte de deduplication.
 *
 * Deux entreprises intervenant a la meme adresse doivent aboutir au MEME
 * logement : c'est ce qui rendra possible la vue consolidee du demandeur.
 * L'empreinte est donc calculee sur une forme canonique de l'adresse.
 */

const ABREVIATIONS: Record<string, string> = {
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

// Marques combinantes laissees par la decomposition NFD. On passe par la propriete
// Unicode plutot que par un intervalle de caracteres combinants ecrits en clair :
// ceux-ci sont invisibles en source et n'importe quel outil peut les alterer.
const DIACRITIQUES = /\p{M}/gu

export function normaliserLigne(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(/[.,;:'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((mot) => ABREVIATIONS[mot] ?? mot)
    .join(' ')
}

export interface Adresse {
  ligne1: string
  codePostal: string
  ville: string
}

export function empreinteAdresse(adresse: Adresse): string {
  const parties = [
    normaliserLigne(adresse.ligne1),
    adresse.codePostal.replace(/\s/g, ''),
    normaliserLigne(adresse.ville),
  ]
  return createHash('sha256').update(parties.join('|')).digest('hex')
}
