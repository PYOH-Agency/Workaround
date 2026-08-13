import { guaranteeDeadlines } from './guarantees'
import type { Cents } from './money'

/**
 * La retenue de garantie — loi n° 71-584 du 16 juillet 1971.
 *
 * Quatre regles, verifiees dans le texte parce qu'une erreur ici priverait un
 * artisan de 5 % de son chantier, ou ferait chasser un client pour une somme
 * qu'il a le droit de garder :
 *
 * 1. Elle est **facultative et contractuelle** — « peuvent etre amputes ». Elle
 *    se stipule au devis, jamais par defaut.
 * 2. **5 % au plus** des acomptes.
 * 3. Le maitre d'ouvrage **doit consigner** les sommes aupres d'un tiers.
 *    **Nous ne consignons rien**, et les ecrans le disent.
 * 4. Elle est liberee **un an apres la reception**, sauf opposition motivee.
 *
 * **Une somme retenue n'est pas un impaye.** C'est la consequence qui compte
 * pour le produit : elle sort du montant exigible et n'entre dans aucune
 * relance.
 */

export const MAX_RETENTION_RATE = 5

/** Le taux stipule, en points de pourcentage entiers. `0` = aucune retenue. */
export function assertRetentionRate(rate: number): void {
  if (!Number.isInteger(rate) || rate < 0 || rate > MAX_RETENTION_RATE) {
    throw new Error(
      `La retenue de garantie est facultative et plafonnée à ${MAX_RETENTION_RATE} % (loi n° 71-584).`,
    )
  }
}

/**
 * « 5 p. 100 de leur montant », dit la loi des paiements d'acomptes : le
 * montant PAYE, donc le TTC. Prendre le HT retiendrait moins que ce que le
 * client est en droit de retenir, et l'ecart se decouvrirait a la fin.
 */
export function retainedAmount(totalInclTax: Cents, rate: number): Cents {
  return Math.round((totalInclTax * rate) / 100)
}

/**
 * La reception, du point de vue de la retenue.
 *
 * `reserves` porte le texte des reserves emises a la reception — `null` quand
 * elle a eu lieu SANS reserve (ou pas encore, ce que `receivedAt` distingue).
 * `reservesLiftedAt` est la levee, declaree elle aussi par le maitre d'ouvrage.
 */
export interface Reception {
  receivedAt: Date | null
  reserves: string | null
  reservesLiftedAt: Date | null
}

/**
 * Le jour ou la somme retenue devient exigible.
 *
 * Sans reserve, elle se libere au terme de la garantie de parfait achevement —
 * un an apres la reception. Ce n'est pas une coincidence : la retenue existe
 * pour la couvrir. On derive donc la date de `guaranteeDeadlines` plutot que de
 * refaire l'arithmetique calendaire ; une seule fonction du produit sait
 * ajouter un an a une date, et le 29 fevrier n'y a qu'un seul comportement.
 *
 * Des reserves changent la regle (loi n° 71-584 : la retenue se libere « sauf
 * opposition motivee » du maitre d'ouvrage, et des reserves sont cette
 * opposition) :
 * - reserves non levees → **aucune date** : la somme reste due au client tant
 *   qu'elles tiennent ;
 * - reserves levees → exigible au plus tard entre le terme d'un an et la levee.
 *   Des reserves ne peuvent que RETARDER la liberation, jamais l'avancer : la
 *   retenue couvre l'annee de parfait achevement, que les reserves soient
 *   levees en avance ou non.
 *
 * `null` aussi sans reception declaree : nous n'etablissons pas la reception,
 * nous enregistrons une declaration. Sans elle, aucune date — et surtout pas
 * une date inventee.
 */
export function releaseDate(reception: Reception): Date | null {
  const deadlines = guaranteeDeadlines(reception.receivedAt)
  const term = deadlines?.find((deadline) => deadline.key === 'perfect_completion')?.endsAt ?? null

  if (term === null) return null
  if (reception.reserves === null) return term
  if (reception.reservesLiftedAt === null) return null

  return reception.reservesLiftedAt.getTime() > term.getTime() ? reception.reservesLiftedAt : term
}

export interface RetentionState {
  /** Le montant stipule, qu'il soit encore retenu ou non. */
  amount: Cents
  /** Le jour ou il devient exigible. `null` tant qu'aucune reception n'est declaree. */
  releasesOn: Date | null
  /** Ce que le client a le droit de retenir AUJOURD'HUI. */
  withheld: Cents
  /**
   * Des reserves emises a la reception ne sont pas encore levees. `releasesOn`
   * est alors `null` comme lorsqu'aucune reception n'est declaree — mais l'ecran
   * ne dit pas la meme chose : « pas encore de reception » et « des reserves
   * bloquent la liberation » sont deux situations distinctes pour l'artisan.
   */
  reservesPending: boolean
}

export function retentionState(
  input: { totalInclTax: Cents; rate: number; reception: Reception },
  now: Date,
): RetentionState {
  const amount = retainedAmount(input.totalInclTax, input.rate)
  const releasesOn = releaseDate(input.reception)

  // Sans date connue, la somme reste retenue. Le blocage est reel — un client
  // qui ne declare jamais sa reception, ou qui a emis des reserves, bloque la
  // retenue de son artisan —, et c'est a l'ecran de le rendre visible, pas a
  // cette fonction de l'effacer.
  const released = releasesOn !== null && now.getTime() >= releasesOn.getTime()

  const reservesPending =
    input.reception.receivedAt !== null &&
    input.reception.reserves !== null &&
    input.reception.reservesLiftedAt === null

  return { amount, releasesOn, withheld: released ? 0 : amount, reservesPending }
}
