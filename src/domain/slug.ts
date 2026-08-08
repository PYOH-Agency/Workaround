import { sirenFromSiret } from './vat-number'

/**
 * Adresse publique d'une entreprise : « bd-plomberie-507698207 ».
 *
 * Le nom est la pour l'humain et pour le referencement ; **c'est le SIREN qui
 * identifie**. Une entreprise qui change de denomination garde donc sa page,
 * son referencement et les liens qui pointent vers elle.
 */
// Les marques diacritiques sont visees par propriete Unicode plutot qu'en
// clair : ecrites litteralement elles sont invisibles en source, et n'importe
// quelle reecriture du fichier les fait disparaitre. Le piege s'est presente
// deux fois en M1.
const DIACRITICS = /\p{M}/gu
const NON_WORD = /[^a-z0-9]+/g

export function companySlug(legalName: string, siret: string): string {
  const name = legalName
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_WORD, '-')
    .replace(/^-+|-+$/g, '')

  // Une denomination sans aucun caractere exploitable produirait « -507698207 ».
  return `${name || 'entreprise'}-${sirenFromSiret(siret)}`
}

export function sirenFromSlug(slug: string): string | null {
  const match = /(?:^|-)(\d{9})$/.exec(slug)
  return match ? match[1] : null
}
