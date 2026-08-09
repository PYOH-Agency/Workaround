/**
 * La semaine de l'artisan, groupee en heure LOCALE.
 *
 * Grouper en UTC placerait un rendez-vous du 1er juillet a 1 h 30 la veille :
 * Paris est a +1 en hiver et +2 en ete, et l'ecart traverse minuit.
 *
 * Le fuseau est fige : le produit est bordelais en P1. Un fuseau par entreprise
 * viendra quand une entreprise sera ailleurs — pas avant, et le nommer ici
 * evite qu'on l'oublie.
 */
const ZONE = 'Europe/Paris'

/** `fr-CA` rend `AAAA-MM-JJ`, seul format ISO parmi les locales usuelles. */
const DAY_FORMAT = new Intl.DateTimeFormat('fr-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Le jour calendaire local d'un instant, sous la forme `AAAA-MM-JJ`. */
export function dayKeyOf(instant: Date): string {
  return DAY_FORMAT.format(instant)
}

/**
 * Les sept jours de la semaine contenant cet instant, du lundi au dimanche.
 *
 * Une fois le jour local obtenu, tout le calcul se fait sur des dates
 * calendaires : un 31 aout a un jour de semaine bien defini, sans fuseau.
 */
export function weekOf(instant: Date): string[] {
  const [year, month, day] = dayKeyOf(instant).split('-').map(Number)

  const midnight = Date.UTC(year, month - 1, day)
  // `getUTCDay` rend 0 pour dimanche : on le ramene a 6 pour un lundi premier.
  const weekday = (new Date(midnight).getUTCDay() + 6) % 7
  const monday = midnight - weekday * 86_400_000

  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday + index * 86_400_000).toISOString().slice(0, 10),
  )
}

export interface Day<T> {
  day: string
  items: T[]
}

/**
 * Range des elements dates dans les jours d'une semaine.
 *
 * **Les sept jours sont rendus, meme vides** : sauter les jours sans
 * rendez-vous ferait sauter le lecteur d'une date a l'autre, et une semaine
 * creuse ne se lirait plus comme une semaine.
 *
 * Ce qui tombe hors de la semaine est ecarte — le service sur-lit d'un jour de
 * chaque cote pour n'avoir aucun decalage de fuseau a calculer.
 */
export function groupByDay<T extends { startsAt: Date }>(items: T[], week: string[]): Day<T>[] {
  return week.map((day) => ({
    day,
    items: items
      .filter((item) => dayKeyOf(item.startsAt) === day)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
  }))
}
