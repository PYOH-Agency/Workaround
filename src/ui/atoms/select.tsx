import { cn } from '@/ui/cn'
import { controlStyle } from './input'

type SelectProps = Omit<React.ComponentProps<'select'>, 'className' | 'style'>

/**
 * Un `<select>` natif, volontairement.
 *
 * Un menu deroulant personnalise imposerait 'use client', du piegeage de focus
 * et de la navigation clavier a reimplementer — pour perdre au passage le
 * selecteur natif d'iOS et d'Android, qui est meilleur que tout ce qu'on
 * ecrirait. On le reconsiderera le jour ou un ecran a besoin de recherche dans
 * les options, pas avant.
 */
export function Select(props: SelectProps) {
  return <select {...props} className={cn(controlStyle, 'pr-8')} />
}
