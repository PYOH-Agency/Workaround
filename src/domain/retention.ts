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
 * Le jour ou la somme retenue devient exigible.
 *
 * Derive de `guaranteeDeadlines` plutot que de refaire l'arithmetique
 * calendaire : la retenue se libere au terme de la garantie de parfait
 * achevement, et ce n'est pas une coincidence — elle existe pour la couvrir.
 * Une seule fonction du produit sait ajouter un an a une date, et le 29 fevrier
 * n'y a qu'un seul comportement.
 *
 * `null` sans reception declaree : nous n'etablissons pas la reception, nous
 * enregistrons une declaration. Sans elle, aucune date — et surtout pas une
 * date inventee.
 */
export function releaseDate(receivedAt: Date | null): Date | null {
  const deadlines = guaranteeDeadlines(receivedAt)
  return deadlines?.find((deadline) => deadline.key === 'perfect_completion')?.endsAt ?? null
}

export interface RetentionState {
  /** Le montant stipule, qu'il soit encore retenu ou non. */
  amount: Cents
  /** Le jour ou il devient exigible. `null` tant qu'aucune reception n'est declaree. */
  releasesOn: Date | null
  /** Ce que le client a le droit de retenir AUJOURD'HUI. */
  withheld: Cents
}

export function retentionState(
  input: { totalInclTax: Cents; rate: number; receivedAt: Date | null },
  now: Date,
): RetentionState {
  const amount = retainedAmount(input.totalInclTax, input.rate)
  const releasesOn = releaseDate(input.receivedAt)

  // Sans date connue, la somme reste retenue. Le blocage est reel — un client
  // qui ne declare jamais sa reception bloque la retenue de son artisan —, et
  // c'est a l'ecran de le rendre visible, pas a cette fonction de l'effacer.
  const released = releasesOn !== null && now.getTime() >= releasesOn.getTime()

  return { amount, releasesOn, withheld: released ? 0 : amount }
}
