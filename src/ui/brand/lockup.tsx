import { cn } from '@/ui/cn'
import { Mark } from './mark'

/**
 * Marque + logotype.
 *
 * Le logotype est du texte, pas une image : il herite de la couleur, il se
 * selectionne, et un lecteur d'ecran le prononce. L'apostrophe est une
 * apostrophe typographique (U+2019), jamais celle du clavier.
 */
export function Lockup({
  size = 'md',
  orientation = 'horizontal',
}: {
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
}) {
  const markSize = { sm: 24, md: 32, lg: 46 }[size]
  const textSize = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center text-ink',
        orientation === 'horizontal' ? 'flex-row gap-3' : 'flex-col gap-2',
      )}
    >
      <Mark size={markSize} />
      <span className={cn('font-logo font-extrabold tracking-[-0.035em]', textSize)}>
        d’équerre
      </span>
    </span>
  )
}
