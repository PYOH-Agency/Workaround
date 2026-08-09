/**
 * Le rendez-vous, vu comme un creneau.
 *
 * **Il se pose toujours sur un chantier** — c'est la seule chose qui distingue
 * cet agenda de celui de son telephone : le rendez-vous y porte l'adresse, le
 * client et son numero.
 */
export type AppointmentKind = 'visit' | 'work'

export interface Slot {
  startsAt: Date
  endsAt: Date
}

/** En deca, c'est une erreur de saisie, pas un rendez-vous. */
export const MIN_MINUTES = 15

/** Au-dela, c'est une journee de chantier, et l'agenda devient illisible. */
export const MAX_HOURS = 12

export function assertSchedulable(slot: Slot): void {
  const minutes = (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000

  if (minutes <= 0) throw new Error('La fin doit être après le début')
  if (minutes < MIN_MINUTES) throw new Error(`Un rendez-vous dure au moins ${MIN_MINUTES} minutes`)
  if (minutes > MAX_HOURS * 60) throw new Error(`Un rendez-vous dure au plus ${MAX_HOURS} heures`)

  // Aucune borne sur le passe : l'artisan saisit souvent le soir, apres coup.
  // Le lui refuser le ferait renoncer a saisir — et le delai de remise du devis
  // n'aurait plus de premier bout.
}

/**
 * Deux creneaux se chevauchent-ils ?
 *
 * Deux creneaux qui se **touchent** ne se chevauchent pas : dix heures pile a
 * l'un, dix heures pile a l'autre, c'est un enchainement. L'inverse ferait
 * crier l'ecran sur une journee normale, et un avertissement qui crie toujours
 * finit ignore.
 */
export function overlaps(a: Slot, b: Slot): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime()
}

/**
 * Les creneaux en conflit, et non un simple booleen.
 *
 * L'ecran doit pouvoir dire AVEC QUOI : « vous avez deja un rendez-vous a 9 h »
 * vaut mieux qu'un avertissement muet, qu'on apprend a cliquer sans lire.
 */
export function conflicts<T extends Slot>(slot: Slot, others: T[]): T[] {
  return others.filter((other) => overlaps(slot, other))
}
