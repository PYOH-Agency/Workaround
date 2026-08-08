import { cn } from '@/ui/cn'

/**
 * Le style commun a tous les controles de saisie.
 *
 * `text-base` (16 px) est obligatoire et non negociable : en dessous, iOS zoome
 * automatiquement a la prise de focus et casse la mise en page. `min-h-11`
 * donne les 44 px de cible tactile.
 */
export const controlStyle = cn(
  'w-full min-h-11 rounded-control px-3 py-2',
  'bg-raised text-ink text-base',
  'border border-field',
  'placeholder:text-ink-muted',
  'disabled:opacity-45',
  // `aria-invalid` n'est pas une variante Tailwind par defaut, d'ou la forme
  // arbitraire. Le champ en erreur epaissit sa bordure : la couleur seule ne
  // suffirait pas.
  'aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger',
)

/**
 * `Omit<…, 'className' | 'style'>` applique la regle d'architecture au niveau
 * des types : contourner le design system sur ce composant devient une erreur
 * de compilation, pas une remarque de revue.
 */
type InputProps = Omit<React.ComponentProps<'input'>, 'className' | 'style'>

export function Input(props: InputProps) {
  return <input {...props} className={controlStyle} />
}
