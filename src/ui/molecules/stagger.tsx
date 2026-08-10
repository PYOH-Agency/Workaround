'use client'

import { Children } from 'react'
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
  /**
   * Cinq : la frise du chantier, de la signature a la facture.
   *
   * `Sequence` s'en passait, et disait pourquoi : « elargir le composant du
   * design system pour un seul ecran couterait plus que la cadence ne
   * rapporte ». C'etait vrai tant que la cadence n'etait qu'un agrement — elle
   * est devenue le geste que la page demandait, celui d'un chantier qui avance
   * pas a pas. Le cout, lui, est cette ligne.
   *
   * L'espacement vertical est plus large que celui des cartes : cette frise n'a
   * pas de fond, et les rangs se toucheraient sur deux colonnes.
   */
  5: 'grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5',
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
 * Chaque enfant est enveloppe dans un `div` natif qui porte `--dq-i` : les
 * consommateurs prevus (`StepCard`, `Card`) sont des composants de fonction
 * qui ne repercutent pas forcement `style` sur leur racine, et cloner leurs
 * props aurait perdu la cadence en silence. L'enveloppe rend `Stagger`
 * indifferent a ce que l'appelant fournit — composant, fragment, texte — et
 * reste l'enfant direct que cible le selecteur CSS.
 */
export function Stagger({
  cols = 3,
  as = 'div',
  children,
}: {
  /** Le nombre de colonnes en grand ecran. En dessous, une seule colonne. */
  cols?: 2 | 3 | 5
  /**
   * `ol` quand l'ordre porte l'information — une frise de chantier, ou l'on ne
   * receptionne pas avant d'avoir signe.
   *
   * L'enveloppe suit : `li` sous une liste, `div` sinon. Poser des `div` dans
   * une `<ol>` aurait rendu le balisage invalide, et c'est precisement ce qui
   * empechait `Sequence` d'utiliser ce composant.
   */
  as?: 'div' | 'ol'
  children: React.ReactNode
}) {
  // `HTMLElement` et non `HTMLDivElement` : la racine est un `div` ou une
  // `ol` selon `as`, et le hook n'observe qu'une boite — il n'a rien a savoir
  // de la balise.
  const { ref, inView } = useInView<HTMLElement>()
  const List = as
  const Item = as === 'ol' ? 'li' : 'div'

  return (
    <List ref={ref} data-stagger="" data-in={inView ? '' : undefined} className={COLS[cols]}>
      {Children.map(children, (child, index) => (
        <Item key={index} style={{ ['--dq-i' as string]: index }}>
          {child}
        </Item>
      ))}
    </List>
  )
}
