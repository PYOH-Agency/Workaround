import { cn } from '@/ui/cn'

/**
 * Une suite posee sur un filet.
 *
 * Remplace la pile de `Card elevation="e1"` partout ou la liste est une
 * **suite** — un fil de chantier, une chronologie, l'historique d'un devis.
 * Quand chaque element porte bordure, fond et ombre, plus aucun n'est eleve, et
 * six boites cote a cote ne disent pas ce qu'un fil dit : que l'un vient apres
 * l'autre.
 *
 * La carte n'est pas condamnee pour autant : elle designe un objet detache — un
 * recapitulatif, un encart d'exception. Une liste qui est une **comparaison**,
 * elle, va dans `DataTable`.
 *
 * Le carre vient de la marque : `Mark` est une equerre dont le carre interieur,
 * signe conventionnel de l'angle droit verifie, mesure 7 unites sur 48. Celui
 * du filet en mesure 7 px, et celui de l'element courant 9 px en terre cuite.
 *
 * `ol` par defaut : une suite est ordonnee, et l'ordre porte une information
 * que le lecteur d'ecran doit annoncer.
 */
export function Rail({
  as: Tag = 'ol',
  testId,
  children,
}: {
  as?: 'ol' | 'ul'
  testId?: string
  children: React.ReactNode
}) {
  return (
    <Tag data-testid={testId} className="flex flex-col">
      {children}
    </Tag>
  )
}

/**
 * Un element du filet.
 *
 * Le filet est porte par chaque element et non par le conteneur : c'est ce qui
 * lui fait epouser la hauteur reelle du contenu, y compris quand le dernier
 * element est plus court que les autres.
 *
 * Le carre est un `<span>` et non un `::before` : le design system n'ouvre pas
 * de `className` arbitraire, et une pseudo-classe se serait de toute facon
 * decrite en valeur arbitraire Tailwind, moins lisible qu'un nœud nomme.
 */
export function RailItem({
  current = false,
  children,
}: {
  /**
   * L'element en cours — aujourd'hui dans un agenda, la derniere publication
   * dans un fil. Marque par la taille **et** la couleur : la terre cuite seule
   * ne suffirait pas.
   */
  current?: boolean
  children: React.ReactNode
}) {
  return (
    <li className="relative border-l border-rule py-4 pl-7">
      {/*
        `top` est fige a la hauteur de la premiere ligne de texte — 16 px de
        marge interne plus la demi-hauteur d'une ligne. Le centrer sur
        l'element entier ferait descendre le carre au milieu d'une entree
        illustree, loin de la date qu'il marque.
      */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[1.625rem] block',
          current ? '-left-[5px] size-[9px] bg-brand' : '-left-[4px] size-[7px] bg-ink-muted',
        )}
      />
      {children}
    </li>
  )
}
