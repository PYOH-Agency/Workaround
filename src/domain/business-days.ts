/**
 * Nombre de jours ouvres ecoules depuis une date.
 *
 * Compte les jours du calendrier situes dans l'intervalle ]depuis, maintenant],
 * hors samedi et dimanche. Un depot du vendredi soir compte donc un jour le
 * lundi, et non trois.
 *
 * Les jours feries sont volontairement ignores : au volume du demarrage, un
 * calendrier des feries serait du travail pour un gain nul.
 */
const DAY = 86_400_000

/** Minuit UTC du jour d'une date, pour comparer des dates et non des instants. */
function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function businessDaysSince(from: Date, now: Date): number {
  let count = 0

  for (let day = startOfDay(from) + DAY; day <= startOfDay(now); day += DAY) {
    const weekday = new Date(day).getUTCDay()
    if (weekday !== 0 && weekday !== 6) count++
  }

  return count
}
