/**
 * Le classement de l'annuaire.
 *
 * Aucune metrique n'existe encore, et ce qu'on choisit pour ordonner devient la
 * monnaie que les artisans chercheront a optimiser. Deux principes :
 *
 * - la **proximite** est ce que le demandeur veut reellement, et elle ne
 *   s'achete pas — une entreprise ne demenage pas pour un referencement ;
 * - a rang egal, une **rotation quotidienne** empeche l'ordre d'insertion en
 *   base de devenir une rente.
 */
export interface Zone {
  kind: 'postalCode' | 'city'
  /** Deja normalise : minuscules, sans accents. */
  value: string
  /** Deux premiers caracteres du code postal, ou `null` si indeductible. */
  department: string | null
}

export interface Listing {
  companyId: string
  postalCode: string
  city: string
}

function proximityRank(listing: Listing, zone: Zone): number {
  const exact = zone.kind === 'postalCode' ? listing.postalCode : listing.city
  if (exact === zone.value) return 0

  if (zone.department && listing.postalCode.startsWith(zone.department)) return 1

  return 2
}

/**
 * Empreinte deterministe de `(jour, entreprise)`.
 *
 * FNV-1a : court, sans dependance, et surtout **stable** — le meme couple donne
 * toujours le meme rang, ce dont la pagination depend.
 *
 * **Le jour vient en tete, et ce n'est pas cosmetique.** Place en fin de
 * chaine, il ne perturbe que les derniers tours de l'avalanche : les empreintes
 * changent d'un jour a l'autre mais gardent le meme ordre relatif, et la
 * rotation devient quasi statique. Le mettre en tete fait diverger tout le
 * calcul.
 */
function dailyHash(companyId: string, day: string): number {
  let hash = 0x811c9dc5

  for (const char of `${day}|${companyId}`) {
    hash ^= char.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash
}

export function rankByProximity<T extends Listing>(listings: T[], zone: Zone, day: string): T[] {
  return [...listings].sort(
    (a, b) =>
      proximityRank(a, zone) - proximityRank(b, zone) ||
      dailyHash(a.companyId, day) - dailyHash(b.companyId, day) ||
      // Dernier recours : deux empreintes egales resteraient dans l'ordre de
      // lecture, ce qui rendrait le classement dependant de la base.
      a.companyId.localeCompare(b.companyId),
  )
}
