'use client'

import { Children, isValidElement, cloneElement } from 'react'
import { useInView } from './use-in-view'

/**
 * Le calepinage : les elements se posent un a un, 70 ms d'ecart.
 *
 * Ce n'est pas un geste mais une **cadence** : elle ne concurrence rien et
 * peut cohabiter avec `Reveal` sur le meme ecran.
 *
 * Le rang est passe en variable CSS plutot qu'en classe : le nombre d'elements
 * n'est pas connu a l'avance, et generer une classe par rang obligerait a les
 * declarer toutes dans la feuille.
 */
export function Stagger({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div ref={ref} data-stagger="" data-in={inView ? '' : undefined} className="contents">
      {Children.map(children, (child, index) =>
        isValidElement<{ style?: React.CSSProperties }>(child)
          ? cloneElement(child, {
              style: { ...child.props.style, ['--dq-i' as string]: index },
            })
          : child,
      )}
    </div>
  )
}
