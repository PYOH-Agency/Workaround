import { format, type Cents } from '@/domain/money'
import { cn } from '@/ui/cn'

/**
 * Un montant.
 *
 * `format` du domaine ne rend que le nombre : le symbole est ajoute ici, avec
 * une espace insecable, et le tout est `whitespace-nowrap` pour qu'un montant
 * ne se coupe jamais en fin de ligne.
 *
 * Cet atome existe surtout pour supprimer une incoherence de l'existant, ou
 * certains ecrans ecrivaient « {format(x)} € » et d'autres « {format(x)} ».
 *
 * `currency={false}` sert les colonnes de tableau dont l'en-tete porte deja
 * l'unite.
 */
export function Money({
  cents,
  currency = true,
  emphasis = 'normal',
  testId,
}: {
  cents: Cents
  currency?: boolean
  emphasis?: 'normal' | 'strong'
  /**
   * Pose `data-testid` sur **le nombre seul**, sans son unite.
   *
   * Les parcours affirment `toHaveText('1 007,00')` en correspondance exacte.
   * Envelopper le montant avec son symbole casserait l'assertion ; renoncer au
   * symbole sur un total serait pire. Cibler le nombre satisfait les deux : le
   * test lit les chiffres, l'utilisateur recoit l'unite.
   */
  testId?: string
}) {
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums text-ink',
        emphasis === 'strong' && 'font-display font-bold',
      )}
    >
      <span data-testid={testId}>{format(cents)}</span>
      {currency ? ' €' : null}
    </span>
  )
}
