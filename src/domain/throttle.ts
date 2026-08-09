/**
 * Plafond horaire du formulaire de contact.
 *
 * Un formulaire public qui envoie des courriels sans limite est un relais de
 * spam. Cinq demandes par heure et par empreinte d'adresse laissent largement
 * passer un demandeur qui compare plusieurs artisans, et arretent un robot.
 *
 * Le chiffre est un pari faute de trafic reel : a revoir sur observation.
 */
export const HOURLY_CONTACT_LIMIT = 5

const HOUR = 3_600_000

export function exceedsLimit(recentAttempts: Date[], now: Date): boolean {
  const withinHour = recentAttempts.filter((at) => now.getTime() - at.getTime() < HOUR)
  return withinHour.length >= HOURLY_CONTACT_LIMIT
}
