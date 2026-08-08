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
}: {
  cents: Cents
  currency?: boolean
  emphasis?: 'normal' | 'strong'
}) {
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums text-ink',
        emphasis === 'strong' && 'font-display font-bold',
      )}
    >
      {format(cents)}
      {currency ? ' €' : null}
    </span>
  )
}
