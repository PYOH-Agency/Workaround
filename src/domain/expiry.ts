/**
 * Preavis avant expiration d'une attestation.
 *
 * Impose par l'article 22.3 du RGPD : le retrait automatique d'une activite de
 * la vitrine prive l'artisan de l'acces aux demandeurs. Une suspension muette
 * serait illicite — et brutale.
 */
export const NOTICE_DAYS = [60, 30, 7] as const

const DAY = 86_400_000

/**
 * Le palier a envoyer aujourd'hui, ou rien.
 *
 * Le **plus large** des paliers atteints et non encore envoyes part en premier :
 * il porte le message le plus utile, celui ou il reste du temps pour agir. Les
 * suivants partiront aux passages ulterieurs. Un palier manque — le travail de
 * fond n'a pas tourne — part en retard plutot que d'etre saute.
 */
export function noticesDue(validUntil: Date, now: Date, alreadySent: number[]): number[] {
  const remaining = Math.ceil((validUntil.getTime() - now.getTime()) / DAY)
  if (remaining < 0) return []

  const due = NOTICE_DAYS.filter((day) => remaining <= day && !alreadySent.includes(day))

  return due.length > 0 ? [Math.max(...due)] : []
}
