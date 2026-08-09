/**
 * Decide si une action doit etre refusee, sans rien connaitre de la base.
 *
 * Fonction pure prenant l'instant en parametre : une limitation qui lit
 * l'horloge implicitement est intestable, et le meme choix a ete fait pour
 * `paymentStatus`.
 *
 * La borne est **stricte** : une demande vieille d'exactement la fenetre est
 * dehors. Sinon le plafond glisse d'une milliseconde a chaque appel.
 */
export function isRateLimited(
  timestamps: Date[],
  now: Date,
  windowMs: number,
  max: number,
): boolean {
  const floor = now.getTime() - windowMs
  const recent = timestamps.filter((at) => at.getTime() > floor)
  return recent.length >= max
}
