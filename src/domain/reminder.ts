import { dayKeyOf } from './agenda-week'

/**
 * Qui rappeler la veille.
 *
 * **Un seul rappel, aucune relance.** Relancer transformerait un service rendu
 * en pression exercee sur un particulier — et le produit existe pour l'inverse.
 */
export interface Remindable {
  id: string
  startsAt: Date
  status: 'scheduled' | 'cancelled'
  alreadyReminded: boolean
}

/**
 * Le jour suivant, en heure de Paris.
 *
 * `now + 24 h` plutot qu'un calcul de calendrier : le passage a l'heure d'ete
 * decale d'une heure, jamais d'un jour, et `dayKeyOf` retombe sur le bon jour
 * local dans les deux cas.
 */
function tomorrowKey(now: Date): string {
  return dayKeyOf(new Date(now.getTime() + 86_400_000))
}

export function remindersDue<T extends Remindable>(items: T[], now: Date): T[] {
  const target = tomorrowKey(now)

  return items.filter(
    (item) =>
      item.status === 'scheduled' && !item.alreadyReminded && dayKeyOf(item.startsAt) === target,
  )
}
