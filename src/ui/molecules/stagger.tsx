'use client'

import { Children, isValidElement, cloneElement } from 'react'
import { cn } from '@/ui/cn'
import { useInView } from './use-in-view'

/**
 * `contents` effacerait ce div : sans boite, `IntersectionObserver` n'a rien a
 * mesurer et `inView` resterait faux a vie. `Stagger` porte donc lui-meme la
 * grille — il redevient un element reel, observable, et ses enfants restent
 * ses enfants directs, ce que `motion.css` attend (`[data-stagger] > *`).
 *
 * Les classes sont ecrites en toutes lettres : Tailwind ne detecte pas les
 * classes assemblees par concatenation a l'execution.
 */
const COLS = {
  2: 'grid gap-4 sm:grid-cols-2',
  3: 'grid gap-4 sm:grid-cols-3',
} as const

/**
 * Le calepinage : les elements se posent un a un, 70 ms d'ecart.
 *
 * Ce n'est pas un geste mais une **cadence** : elle ne concurrence rien et
 * peut cohabiter avec `Reveal` sur le meme ecran.
 *
 * Le rang est passe en variable CSS plutot qu'en classe : le nombre d'elements
 * n'est pas connu a l'avance, et generer une classe par rang obligerait a les
 * declarer toutes dans la feuille.
 *
 * Le clonage ne touche que des elements DOM natifs (`typeof child.type ===
 * 'string'`) : un `Fragment` n'accepte pas de `style` (React avertirait dans
 * la console et la variable ne serait jamais posee), et un composant qui ne
 * repercute pas `style` sur sa racine perdrait la cadence sans erreur visible.
 * Les enfants de `Stagger` doivent donc etre des balises natives.
 */
export function Stagger({
  cols = 3,
  children,
}: {
  /** Le nombre de colonnes en grand ecran. En dessous, une seule colonne. */
  cols?: 2 | 3
  children: React.ReactNode
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-stagger=""
      data-in={inView ? '' : undefined}
      className={cn(COLS[cols])}
    >
      {Children.map(children, (child, index) =>
        isValidElement<{ style?: React.CSSProperties }>(child) && typeof child.type === 'string'
          ? cloneElement(child, {
              style: { ...child.props.style, ['--dq-i' as string]: index },
            })
          : child,
      )}
    </div>
  )
}
